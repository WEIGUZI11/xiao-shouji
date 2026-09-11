import type { Character } from '../../store';
import type { TtsProvider } from '../../tts';

export type VoiceCallPhase = 'ready' | 'calling' | 'connected' | 'ended';
export type VoiceCallMode = 'text' | 'audio';
export type VoiceCallTranscriptSpeaker = 'user' | 'char';

export interface VoiceCallTranscriptLine {
  speaker: VoiceCallTranscriptSpeaker;
  text: string;
  timestamp: number;
}

export interface VoiceCallAudioAvailability {
  ttsEnabled: boolean;
  provider?: TtsProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  voiceId?: string;
  hasBrowserSpeechSynthesis?: boolean;
}

export interface VoiceCallSpeechRecognitionAvailability {
  hasBrowserSpeechRecognition?: boolean;
  muted?: boolean;
}

export interface VoiceCallSystemPromptInput {
  characterName: string;
  characterPrompt: string;
  phonePresetPrompt?: string;
  userProfilePrompt?: string;
  callKind?: 'voice' | 'video';
}

export function getVoiceCallPhaseText(phase: VoiceCallPhase, characterName = '对方') {
  if (phase === 'ready') return `等待呼唤 ${characterName}`;
  if (phase === 'calling') return `正在呼唤 ${characterName}`;
  if (phase === 'connected') return `已接通 ${characterName}`;
  return `已结束和 ${characterName} 的语音通话`;
}

export function getVoiceCallDefaultScene(character?: Pick<Character, 'name' | 'description' | 'personality'> | null) {
  const name = character?.name || '对方';
  const detail = [character?.description, character?.personality]
    .map((item) => item?.trim())
    .find(Boolean);

  if (detail) {
    return `${name}接起语音，背景先安静了一瞬，随后传来很近的呼吸声。${detail.slice(0, 42)}。`;
  }

  return `${name}接起语音，听筒里先是细小的电流声，随后他的声音贴近了一点，像真的在手机那头。`;
}

export function getVoiceCallDurationLabel(startedAt: number | null, now: number) {
  if (!startedAt) return '00:00';
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function getVoiceCallAudioIssue(input: VoiceCallAudioAvailability) {
  if (!input.ttsEnabled) return 'TTS 总开关已关闭';
  if (input.provider === 'browser') return input.hasBrowserSpeechSynthesis ? '' : '当前设备没有浏览器语音能力';
  if (input.provider === 'local') return input.baseUrl?.trim() ? '' : '本地 TTS 接口地址为空';
  if (input.provider === 'doubao') {
    if (!input.apiKey?.trim()) return '豆包 API Key 为空';
    if (!input.voiceId?.trim()) return '豆包音色 Speaker ID 为空';
    const model = input.model?.trim() || 'seed-tts-2.0';
    const voiceId = input.voiceId.trim();
    if (model === 'seed-tts-2.0' && /(?:_moon_bigtts|_mars_bigtts|^ICL_|^S_)/i.test(voiceId)) {
      return '豆包 2.0 服务与当前 1.0/复刻音色不匹配';
    }
    if (model === 'seed-tts-1.0' && /(?:_uranus_bigtts|^saturn_|^S_)/i.test(voiceId)) {
      return '豆包 1.0 服务与当前 2.0/复刻音色不匹配';
    }
    if (model === 'seed-icl-2.0' && /(?:_bigtts|^ICL_)/i.test(voiceId)) {
      return '豆包复刻服务需要控制台生成的 Speaker ID';
    }
    return '';
  }
  if (input.provider === 'openai' || input.provider === 'gemini' || input.provider === 'minimax') {
    return input.apiKey?.trim() ? '' : `${input.provider} API Key 为空`;
  }
  return '没有选择可用的 TTS 提供商';
}

export function isVoiceCallAudioAvailable(input: VoiceCallAudioAvailability) {
  return !getVoiceCallAudioIssue(input);
}

export function isVoiceCallSpeechRecognitionAvailable(input: VoiceCallSpeechRecognitionAvailability) {
  return Boolean(input.hasBrowserSpeechRecognition) && !input.muted;
}

export function buildVoiceCallOpeningLine(character?: Pick<Character, 'name' | 'firstMessage'> | null) {
  const name = character?.name || '对方';
  return `喂？我是${name}，听得到吗？`;
}

export function cleanVoiceCallReply(reply: string, characterName = '对方') {
  const escapedName = characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cleaned = reply
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^\[[^\]]+\]/.test(line))
    .map((line) => line.replace(new RegExp(`^${escapedName}[：:]\\s*`), ''))
    .join('\n')
    .trim();
  return cleaned || '我在听。';
}

export function buildVoiceCallSystemPrompt({
  characterName,
  characterPrompt,
  phonePresetPrompt,
  userProfilePrompt,
  callKind = 'voice',
}: VoiceCallSystemPromptInput) {
  const callName = callKind === 'video' ? 'QQ视频通话' : 'QQ语音通话';
  return [
    characterPrompt || `你是${characterName}。`,
    userProfilePrompt,
    phonePresetPrompt,
    `现在你正在和用户进行 ${callName}。`,
    '像真的在电话里一样回应：短句、口语、可以有停顿感，但不要写旁白、动作描写、括号说明或功能标签。',
    '每次只说一小段，尽量不超过 45 个字。',
  ].filter(Boolean).join('\n');
}

export function buildVoiceCallHistoryMessages(lines: VoiceCallTranscriptLine[]) {
  return lines.map((line) => ({
    role: line.speaker === 'char' ? 'assistant' as const : 'user' as const,
    content: line.text,
  }));
}
