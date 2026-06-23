import { Camera, CameraOff, ChevronLeft, Mic, MicOff, Phone, Send, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn, createId } from '../../lib/utils';
import { useAppStore } from '../../store';
import { speakWithConfiguredTts } from '../../tts';
import { describeChatMessage, getCharacterPrompt, requestChatCompletion } from '../shared/aiText';
import { buildUserProfilePrompt, resolveUserProfileForCharacter } from '../user-info/userProfilePrompt';
import {
  buildVoiceCallHistoryMessages,
  buildVoiceCallSystemPrompt,
  cleanVoiceCallReply,
  isVoiceCallAudioAvailable,
  isVoiceCallSpeechRecognitionAvailable,
  type VoiceCallMode,
  type VoiceCallTranscriptLine,
} from '../voice/voiceCallLogic';
import {
  buildVideoCallOpeningLine,
  getVideoCallDefaultScene,
  getVideoCallDurationLabel,
  getVideoCallPhaseText,
  type VideoCallPhase,
} from './videoCallLogic';

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: Event & { error?: string; message?: string }) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionResultEvent) => void) | null;
  onstart: (() => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
}

interface BrowserSpeechRecognitionResultEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

type SpeechRecognitionWindow = Window & typeof globalThis & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return undefined;
  const speechWindow = window as SpeechRecognitionWindow;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
}

export function VideoCallScreen() {
  const {
    activeChatId,
    activeChannel,
    characters,
    chatSessions,
    addMessage,
    setScreen,
    goBack,
    ttsEnabled,
    ttsConfig,
    addAppLog,
    apiBaseUrl,
    apiKey,
    selectedModel,
    chatTemperature,
    chatMaxTokens,
    appPresets,
    userName,
    userProfile,
    userProfiles,
    userProfileCharacterBindings,
  } = useAppStore();
  const character = characters.find((item) => item.id === activeChatId);
  const callUserProfile = resolveUserProfileForCharacter({
    characterId: character?.id,
    activeUserName: userName,
    activeUserProfile: userProfile,
    userProfiles,
    bindings: userProfileCharacterBindings,
  });
  const [phase, setPhase] = useState<VideoCallPhase>('ready');
  const [scene, setScene] = useState(() => getVideoCallDefaultScene(character));
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [callMode, setCallMode] = useState<VoiceCallMode>('text');
  const [audioStatus, setAudioStatus] = useState('');
  const [voiceInput, setVoiceInput] = useState('');
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [transcriptLines, setTranscriptLines] = useState<VoiceCallTranscriptLine[]>([]);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const finishedRef = useRef(false);
  const openingSpokenRef = useRef(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const characterName = character?.name || '对方';
  const phaseText = getVideoCallPhaseText(phase, characterName);
  const duration = getVideoCallDurationLabel(connectedAt, now);
  const hasChatTarget = Boolean(activeChatId && (activeChannel === 'qq' || activeChannel === 'wechat'));
  const session = activeChatId ? chatSessions[`${activeChannel}:${activeChatId}`] : undefined;
  const audioAvailable = isVoiceCallAudioAvailable({
    ttsEnabled,
    provider: ttsConfig.provider,
    apiKey: ttsConfig.apiKey,
    baseUrl: ttsConfig.baseUrl,
    hasBrowserSpeechSynthesis: typeof window !== 'undefined' && 'speechSynthesis' in window,
  });
  const speechRecognitionAvailable = isVoiceCallSpeechRecognitionAvailable({
    hasBrowserSpeechRecognition: Boolean(getSpeechRecognitionConstructor()),
    muted,
  });
  const lastLine = transcriptLines[transcriptLines.length - 1];
  const lastCharLine = [...transcriptLines].reverse().find((line) => line.speaker === 'char')?.text || '';

  const ambientLines = useMemo(() => {
    if (phase === 'ready') return ['屏幕还暗着', '对方还没有被呼唤'];
    if (phase === 'calling') return ['正在连接', '铃声一下一下响着', '头像在屏幕中央轻轻浮动'];
    if (phase === 'connected') return [
      lastLine ? `${lastLine.speaker === 'user' ? '你' : characterName}正在说话` : '通话已接通',
      listening ? '正在听你说话' : thinking ? '等待对方回应' : '可以继续说话',
      muted ? '麦克风已静音' : '麦克风开着',
      cameraOn ? '镜头还亮着' : '你的镜头已关闭',
    ];
    return ['通话结束', '画面慢慢暗下去'];
  }, [cameraOn, characterName, lastLine, listening, muted, phase, thinking]);

  const playCallLine = async (text: string, status = '正在播放语音...') => {
    if (!audioAvailable) {
      setCallMode('text');
      setAudioStatus('未接入语音，当前用文字通话。');
      return;
    }
    setCallMode('audio');
    setAudioStatus(status);
    try {
      await speakWithConfiguredTts(text, ttsConfig);
      setAudioStatus('语音播放完成。你可以点麦克风说话。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '语音播放失败';
      setCallMode('text');
      setAudioStatus(`语音失败，已切回文字：${message}`);
      addAppLog({ type: 'tts', title: '视频通话 TTS 失败', detail: message });
    }
  };

  const submitUserSpeech = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || thinking) return;
    const userLine: VoiceCallTranscriptLine = { speaker: 'user', text, timestamp: Date.now() };
    const nextTranscript = [...transcriptLines, userLine];
    setTranscriptLines(nextTranscript);
    setVoiceInput('');
    setThinking(true);
    setAudioStatus('听到了，正在等他回应...');

    try {
      if (!apiBaseUrl.trim() || !selectedModel.trim()) {
        throw new Error('聊天 API 未连接：缺少接口地址或模型。');
      }
      const reply = await requestChatCompletion({
        baseUrl: apiBaseUrl,
        apiKey,
        model: selectedModel,
        temperature: chatTemperature,
        maxTokens: Math.min(chatMaxTokens || 220, 260),
        messages: [
          {
            role: 'system',
            content: buildVoiceCallSystemPrompt({
              callKind: 'video',
              characterName,
              characterPrompt: character ? getCharacterPrompt(character) : `你是${characterName}。`,
              phonePresetPrompt: appPresets.phone.prompt,
              userProfilePrompt: buildUserProfilePrompt(callUserProfile.name, callUserProfile.profile),
            }),
          },
          ...(session?.messages || []).slice(-8).filter((message) => !message.recalled).map((message) => ({
            role: message.role === 'model' ? 'assistant' as const : 'user' as const,
            content: describeChatMessage(message, true, characters),
          })),
          ...buildVoiceCallHistoryMessages(nextTranscript.slice(-10)),
        ],
      });
      const cleanReply = cleanVoiceCallReply(reply, characterName);
      const charLine: VoiceCallTranscriptLine = { speaker: 'char', text: cleanReply, timestamp: Date.now() };
      setTranscriptLines((lines) => [...lines, charLine]);
      await playCallLine(cleanReply, '他开始回话了...');
    } catch (error) {
      const message = error instanceof Error ? error.message : '视频通话回复失败';
      const fallback = '我这边好像卡了一下，你再说一遍？';
      setTranscriptLines((lines) => [...lines, { speaker: 'char', text: fallback, timestamp: Date.now() }]);
      setAudioStatus(`回复失败，已保留文字通话：${message}`);
      addAppLog({ type: 'error', title: '视频通话 AI 回复失败', detail: message });
      await playCallLine(fallback, '播放兜底回复...');
    } finally {
      setThinking(false);
    }
  };

  useEffect(() => {
    if (phase !== 'connected') return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'connected' || openingSpokenRef.current) return;
    openingSpokenRef.current = true;
    setScene(getVideoCallDefaultScene(character));
    const opening = buildVideoCallOpeningLine(character);
    setTranscriptLines([{ speaker: 'char', text: opening, timestamp: Date.now() }]);
    void playCallLine(opening, '他接起视频，正在说话...');
  }, [phase, character]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
  }, []);

  const startCalling = () => {
    if (phase !== 'ready') return;
    setPhase('calling');
    window.setTimeout(() => {
      setConnectedAt(Date.now());
      setNow(Date.now());
      setPhase('connected');
      setAudioStatus(audioAvailable ? '语音已接入，接通后会自动开口。' : '未接入语音，会使用文字通话。');
    }, 1600);
  };

  const startListening = () => {
    if (thinking || listening) return;
    if (!speechRecognitionAvailable) {
      setAudioStatus(muted ? '麦克风已静音，取消静音后再说。' : '这个浏览器听不了麦克风，直接在文字框里发送。');
      return;
    }
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) return;
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setListening(true);
      setAudioStatus('正在听你说话...');
    };
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript || '';
        if (result.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      const text = (finalText || interimText).trim();
      if (text) setVoiceInput(text);
      if (finalText.trim()) {
        recognition.stop();
        void submitUserSpeech(finalText);
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      setAudioStatus(`麦克风没有听成功，改用文字输入：${event.error || event.message || '识别失败'}`);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    try {
      recognition.start();
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法启动麦克风';
      setListening(false);
      setAudioStatus(`麦克风启动失败，改用文字输入：${message}`);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const replayLastVoiceLine = () => {
    if (!lastCharLine) {
      setAudioStatus('还没有对方台词可以播放。');
      return;
    }
    void playCallLine(lastCharLine, '正在重播上一句...');
  };

  const finishCall = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    recognitionRef.current?.abort();
    setPhase('ended');
    if (hasChatTarget && activeChatId) {
      addMessage(activeChatId, activeChannel, {
        id: createId('msg'),
        role: 'user',
        content: `视频通话已结束，时长 ${duration}`,
        timestamp: Date.now(),
        kind: 'call-note',
      });
      if (transcriptLines.length > 0) {
        addMessage(activeChatId, activeChannel, {
          id: createId('msg'),
          role: 'model',
          content: transcriptLines.map((line) => `${line.speaker === 'user' ? '我' : characterName}：${line.text}`).join('\n'),
          timestamp: Date.now() + 1,
          kind: 'text',
        });
      }
      window.setTimeout(() => setScreen('chat'), 420);
      return;
    }
    window.setTimeout(() => goBack(), 420);
  };

  const leave = () => {
    if (phase === 'connected' || phase === 'calling') {
      finishCall();
      return;
    }
    if (hasChatTarget) {
      setScreen('chat');
      return;
    }
    goBack();
  };

  return (
    <section className={cn('video-call-screen', phase === 'connected' && 'is-connected', phase === 'calling' && 'is-calling')}>
      <div className="video-call-bg" aria-hidden />
      <header className="video-call-topbar">
        <button type="button" onClick={leave} className="video-call-back" aria-label="返回">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 text-center">
          <h1>{characterName}</h1>
          <p>{phase === 'connected' ? duration : phaseText}</p>
        </div>
        <span className="video-call-network">QQ</span>
      </header>

      <main className="video-call-stage">
        <div className="video-call-avatar-wrap">
          <div className="video-call-avatar">
            {character?.avatar ? <img src={character.avatar} alt="" /> : <span>{characterName.slice(0, 1)}</span>}
          </div>
          {phase === 'calling' && <span className="video-call-ring" />}
        </div>

        {phase === 'connected' ? (
          <div className="video-call-live-card">
            {cameraOn ? (
              <p className="video-call-scene-line">{scene}</p>
            ) : (
              <p className="video-call-scene-line">你的镜头关掉了，只剩对方那边轻轻的呼吸声和一点房间里的响动。</p>
            )}
            <div className="video-call-transcript" aria-label="通话内容">
              {transcriptLines.length === 0 && <p>接通后他会先开口。</p>}
              {transcriptLines.slice(-5).map((line) => (
                <p key={`${line.timestamp}-${line.speaker}`} className={cn('video-call-transcript-row', line.speaker === 'user' ? 'user' : 'char')}>
                  <b>{line.speaker === 'user' ? '我' : characterName}</b>
                  <span>{line.text}</span>
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="video-call-copy">
            <strong>{phaseText}</strong>
            <span>{phase === 'ready' ? '点一下呼唤，画面会开始连线。' : '铃声响着，像真的在等他接起。'}</span>
          </div>
        )}

        <div className="video-call-ambient">
          {ambientLines.map((line) => <span key={line}>{line}</span>)}
        </div>
      </main>

      {phase === 'connected' && (
        <div className="video-call-input-panel">
          <div className="video-call-text-row">
            <textarea
              value={voiceInput}
              onChange={(event) => setVoiceInput(event.target.value)}
              placeholder={listening ? '正在听...' : '麦克风不行时，在这里打字'}
            />
            <button type="button" onClick={() => void submitUserSpeech(voiceInput)} disabled={!voiceInput.trim() || thinking}>
              <Send className="h-4 w-4" />
            </button>
          </div>
          <small>{audioStatus || (speechRecognitionAvailable ? '点麦克风开始说话。' : '浏览器不支持语音识别时，可用文字继续通话。')}</small>
        </div>
      )}

      <footer className="video-call-controls">
        {phase === 'ready' && (
          <button type="button" onClick={startCalling} className="video-call-primary">
            <Phone className="h-6 w-6" />
            <span>呼唤</span>
          </button>
        )}
        {phase === 'calling' && (
          <button type="button" onClick={finishCall} className="video-call-danger">
            <Phone className="h-6 w-6" />
            <span>取消</span>
          </button>
        )}
        {phase === 'connected' && (
          <>
            <button type="button" onClick={listening ? stopListening : startListening} className={cn(listening && 'active')}>
              {speechRecognitionAvailable ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              <span>{listening ? '停止听' : '麦克风'}</span>
            </button>
            <button type="button" onClick={() => setCameraOn((value) => !value)} className={cn(!cameraOn && 'active')}>
              {cameraOn ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
              <span>{cameraOn ? '镜头' : '已关镜头'}</span>
            </button>
            <button type="button" onClick={replayLastVoiceLine} className={cn(callMode === 'audio' && audioAvailable && 'active')}>
              <Volume2 className="h-5 w-5" />
              <span>{audioAvailable ? '重播' : '文字'}</span>
            </button>
            <button type="button" onClick={() => setMuted((value) => !value)} className={cn(muted && 'active')}>
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              <span>{muted ? '静音中' : '静音'}</span>
            </button>
            <button type="button" onClick={finishCall} className="video-call-danger">
              <Phone className="h-6 w-6" />
              <span>挂断</span>
            </button>
          </>
        )}
      </footer>
    </section>
  );
}
