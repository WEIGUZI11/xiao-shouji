import {
  Bot,
  Check,
  CircleUserRound,
  FileText,
  Image as ImageIcon,
  KeyRound,
  Link,
  Mic,
  Palette,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Users,
  Volume2,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { buildHttpErrorMessage, readHttpErrorDetail } from '../../lib/httpErrors';
import {
  defaultImageGenerationConfig,
  fetchImageGenerationModels,
  getDefaultImageBaseUrlForProvider,
  requestNaiImage,
  type ImageGenerationConfig,
} from '../../lib/naiImage';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { speakWithConfiguredTts, type TtsProvider } from '../../tts';
import { Field, Header, Panel, Pill } from '../shared/AppPrimitives';
import { buildSettingsSelfCheckReport, summarizeSettingsSelfCheck, type SettingsSelfCheckItem } from './settingsSelfCheck';
import {
  builtInVoicePresets,
  canCarryBaseUrl,
  getProviderDefaultTtsConfig,
  getVoicePlaceholder,
  normalizeCustomVoicePresets,
  providerDefaults,
  shouldShowTtsVoiceControls,
  voicePresetStorageKey,
  type ModelPreset,
  type VoicePreset,
} from './settingsTtsPresets';

type SettingsTab = 'model' | 'tts' | 'image' | 'community' | 'self-check';

const imageProviderLabels: Record<ImageGenerationConfig['provider'], string> = {
  novelai: 'NovelAI',
  comfyui: 'ComfyUI',
  custom: '自定义',
};

function getProviderPlaceholder(provider: TtsProvider) {
  if (provider === 'local') return '例如：http://127.0.0.1:9880/tts';
  if (provider === 'gemini') return '默认：Google Gemini v1beta，可留空';
  if (provider === 'minimax') return '默认：https://api.minimax.io/v1/t2a_v2，可留空';
  if (provider === 'doubao') return '默认：https://openspeech.bytedance.com/api/v3/tts/unidirectional，可留空';
  return '默认：https://api.openai.com/v1，可留空';
}

function getModelPlaceholder(provider: TtsProvider) {
  if (provider === 'gemini') return 'gemini-2.5-flash-preview-tts';
  if (provider === 'minimax') return 'speech-2.8-hd';
  if (provider === 'doubao') return 'seed-tts-2.0';
  return 'gpt-4o-mini-tts';
}

function getImageProviderPlaceholder(config: ImageGenerationConfig) {
  if (config.provider === 'comfyui') return 'http://127.0.0.1:8188';
  if (config.provider === 'custom' && config.customFormat === 'mj-task') return 'https://your-mj-relay.example/mj/submit/imagine';
  if (config.provider === 'custom' && config.customFormat === 'nai') return 'https://your-nai-relay.example/generate-image';
  if (config.provider === 'custom' && config.customFormat === 'openai-images') return 'https://your-image-api.example/v1/images/generations';
  if (config.provider === 'custom') return 'https://your-image-relay.example/mj/submit/imagine';
  return '/api/nai/generate-image';
}

function readVoicePresets() {
  try {
    return normalizeCustomVoicePresets(JSON.parse(window.localStorage.getItem(voicePresetStorageKey) || '[]'));
  } catch {
    return [];
  }
}

async function fetchModelList(baseUrl: string, apiKey: string) {
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/models`;
  const response = await fetch(endpoint, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  });
  if (!response.ok) {
    throw new Error(buildHttpErrorMessage('拉取模型失败', {
      status: response.status,
      statusText: response.statusText,
      detail: await readHttpErrorDetail(response),
    }));
  }
  const data = await response.json();
  return Array.isArray(data?.data)
    ? data.data.map((item: { id?: string }) => item.id).filter(Boolean) as string[]
    : [];
}

function getTtsModelListBaseUrl(provider: TtsProvider, baseUrl: string) {
  const value = baseUrl.trim();
  if (value) return value;
  if (provider === 'openai') return 'https://api.openai.com/v1';
  return '';
}

export function SettingsScreen() {
  const {
    apiBaseUrl,
    apiKey,
    availableModels,
    selectedModel,
    setModelConfig,
    setAvailableModels,
    userName,
    setUserName,
    ttsConfig,
    setTtsConfig,
    ttsEnabled,
    setTtsEnabled,
    imageGenerationConfig,
    setImageGenerationConfig,
    communityVerificationConfig,
    setCommunityVerificationConfig,
    addAppLog,
    characters,
    updateCharacter,
  } = useAppStore();

  const [tab, setTab] = useState<SettingsTab>('model');
  const [saveStatus, setSaveStatus] = useState('');
  const [modelStatus, setModelStatus] = useState('');
  const [modelPulled, setModelPulled] = useState(false);
  const [selfCheckRunning, setSelfCheckRunning] = useState(false);
  const [selfCheckStatus, setSelfCheckStatus] = useState('');
  const [ttsStatus, setTtsStatus] = useState('');
  const [isTestingTts, setIsTestingTts] = useState(false);
  const [ttsAvailableModels, setTtsAvailableModels] = useState<string[]>([]);
  const [isPullingTtsModels, setIsPullingTtsModels] = useState(false);
  const [customVoicePresets, setCustomVoicePresets] = useState<VoicePreset[]>([]);
  const [imageModelStatus, setImageModelStatus] = useState('');
  const [isPullingImageModels, setIsPullingImageModels] = useState(false);
  const [imageTestStatus, setImageTestStatus] = useState('');
  const [imageTestUrl, setImageTestUrl] = useState('');
  const [isTestingImage, setIsTestingImage] = useState(false);

  useEffect(() => {
    setCustomVoicePresets(readVoicePresets());
  }, []);

  const allVoicePresets = [...builtInVoicePresets, ...customVoicePresets];
  const modelPresets: ModelPreset[] = [];
  const showTtsVoiceControls = shouldShowTtsVoiceControls();
  const selfCheckItems = buildSettingsSelfCheckReport({
    apiBaseUrl,
    availableModels,
    selectedModel,
    ttsEnabled,
    ttsConfig,
    imageGenerationConfig,
    communityBackdoorApiUrl: communityVerificationConfig.backdoorApiUrl,
  });
  const selfCheckSummary = summarizeSettingsSelfCheck(selfCheckItems);

  const statusClass = (status: SettingsSelfCheckItem['status']) => {
    if (status === 'ok') return 'bg-[#dceecd] text-[#244b25]';
    if (status === 'warn') return 'bg-[#fff0b8] text-[#6c4b00]';
    return 'bg-[#ffd6d6] text-[#8f1d1d]';
  };

  const selectProvider = (provider: TtsProvider) => {
    const defaults = getProviderDefaultTtsConfig(provider);
    setTtsConfig({
      provider,
      baseUrl: canCarryBaseUrl(provider, ttsConfig.baseUrl) ? ttsConfig.baseUrl : defaults.baseUrl || '',
      model: defaults.model,
      voiceId: defaults.voiceId,
    });
    setTtsStatus('');
    setTtsAvailableModels([]);
  };

  const applyVoicePreset = (preset: VoicePreset) => {
    const defaults = providerDefaults[preset.provider];
    setTtsConfig({
      provider: preset.provider,
      baseUrl: canCarryBaseUrl(preset.provider, ttsConfig.baseUrl) ? ttsConfig.baseUrl : defaults.baseUrl || '',
      model: ttsConfig.provider === preset.provider ? ttsConfig.model : '',
      voiceId: preset.voiceId,
    });
    setTtsStatus(`已切到 ${preset.label}`);
  };

  const applyModelPreset = (preset: ModelPreset) => {
    setTtsConfig({
      provider: preset.provider,
      baseUrl: preset.baseUrl || providerDefaults[preset.provider].baseUrl || ttsConfig.baseUrl,
      model: preset.model,
      voiceId: ttsConfig.provider === preset.provider ? ttsConfig.voiceId : providerDefaults[preset.provider].voiceId ?? ttsConfig.voiceId,
    });
    setTtsStatus(`已切到 ${preset.label}`);
  };

  const selectImageProvider = (provider: ImageGenerationConfig['provider']) => {
    setImageGenerationConfig({
      provider,
      baseUrl: getDefaultImageBaseUrlForProvider(provider),
      model: '',
      availableModels: [],
      customFormat: provider === 'custom' ? 'auto' : imageGenerationConfig.customFormat,
      apiKey: provider === 'comfyui' ? '' : imageGenerationConfig.apiKey,
    });
    setImageModelStatus('');
    setImageTestStatus('');
    setImageTestUrl('');
  };

  const pullModels = async () => {
    if (!apiBaseUrl.trim()) {
      setModelStatus('先填写接口地址');
      return;
    }
    setModelStatus('正在拉取模型...');
    setModelPulled(false);
    try {
      const models = await fetchModelList(apiBaseUrl, apiKey);
      setAvailableModels(models);
      setModelStatus(models.length > 0 ? `已拉取 ${models.length} 个模型` : '接口可访问，但没有返回模型列表');
      setModelPulled(true);
      addAppLog({ type: models.length > 0 ? 'success' : 'info', title: '大模型列表拉取', detail: models.join('\n') || '接口可访问，但没有返回模型列表' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '拉取失败';
      setModelStatus(message);
      addAppLog({ type: 'error', title: '大模型列表拉取失败', detail: message });
    }
  };

  const pullTtsModels = async () => {
    if (ttsConfig.provider === 'browser') {
      setTtsStatus('浏览器语音不需要拉取模型。');
      return;
    }
    const modelBaseUrl = getTtsModelListBaseUrl(ttsConfig.provider, ttsConfig.baseUrl);
    if (!modelBaseUrl) {
      setTtsStatus('先填写支持 /models 的 TTS 接口地址。');
      return;
    }
    setTtsStatus('正在拉取 TTS 模型...');
    setIsPullingTtsModels(true);
    try {
      const models = await fetchModelList(modelBaseUrl, ttsConfig.apiKey);
      setTtsAvailableModels(models);
      if (models[0]) setTtsConfig({ model: models[0] });
      const detail = models.join('\n') || '接口可访问，但没有返回模型列表';
      setTtsStatus(models.length > 0 ? `已拉取 ${models.length} 个 TTS 模型` : '接口可访问，但没有返回模型列表');
      addAppLog({ type: models.length > 0 ? 'success' : 'info', title: 'TTS 模型拉取', detail });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'TTS 模型拉取失败';
      setTtsStatus(message);
      addAppLog({ type: 'error', title: 'TTS 模型拉取失败', detail: message });
    } finally {
      setIsPullingTtsModels(false);
    }
  };

  const runSettingsSelfCheck = async () => {
    setSelfCheckRunning(true);
    setSelfCheckStatus('正在检查配置...');
    try {
      if (apiBaseUrl.trim()) {
        const models = await fetchModelList(apiBaseUrl, apiKey);
        setAvailableModels(models);
        setModelPulled(models.length > 0);
        const detail = models.length > 0 ? `模型接口可用，返回 ${models.length} 个模型。` : '模型接口可访问，但没有返回模型列表。';
        setSelfCheckStatus(detail);
        setModelStatus(detail);
        addAppLog({ type: models.length > 0 ? 'success' : 'info', title: '设置自检：模型接口', detail: models.join('\n') || detail });
      } else {
        setSelfCheckStatus('已完成本地配置检查；文本大模型接口地址还没填写。');
        addAppLog({ type: 'info', title: '设置自检：跳过模型接口', detail: '未填写大模型接口地址。' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '模型接口检查失败';
      setSelfCheckStatus(message);
      setModelStatus(message);
      addAppLog({ type: 'error', title: '设置自检：模型接口失败', detail: message });
    } finally {
      setSelfCheckRunning(false);
    }
  };

  const pullImageModels = async () => {
    setImageModelStatus('正在拉取模型...');
    setIsPullingImageModels(true);
    try {
      const models = await fetchImageGenerationModels({ config: imageGenerationConfig });
      setImageGenerationConfig({ availableModels: models, model: models[0] || '' });
      setImageModelStatus(models.length > 0 ? `已拉取 ${models.length} 个模型` : '接口可访问，但没有返回模型列表');
      addAppLog({
        type: models.length > 0 ? 'success' : 'info',
        title: `${imageProviderLabels[imageGenerationConfig.provider]} 生图模型拉取`,
        detail: models.join('\n') || '接口可访问，但没有返回模型列表',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '生图模型拉取失败';
      setImageModelStatus(message);
      addAppLog({ type: 'error', title: '生图模型拉取失败', detail: message });
    } finally {
      setIsPullingImageModels(false);
    }
  };

  const saveCurrentVoicePreset = () => {
    const voiceId = ttsConfig.voiceId.trim();
    if (!voiceId) {
      setTtsStatus('先填写一个音色 ID。');
      return;
    }
    const label = `${ttsConfig.provider} / ${voiceId}`;
    const nextPreset: VoicePreset = {
      id: `${ttsConfig.provider}-${voiceId}-${Date.now()}`,
      label,
      provider: ttsConfig.provider,
      voiceId,
      model: ttsConfig.model.trim() || providerDefaults[ttsConfig.provider].model,
    };
    const next = [
      ...customVoicePresets.filter((item) => !(item.provider === nextPreset.provider && item.voiceId === nextPreset.voiceId)),
      nextPreset,
    ];
    setCustomVoicePresets(next);
    window.localStorage.setItem(voicePresetStorageKey, JSON.stringify(next));
    setTtsStatus(`已保存 ${label}`);
  };

  const previewTts = async () => {
    setTtsStatus('正在试听...');
    setIsTestingTts(true);
    try {
      await speakWithConfiguredTts('这是一条 TTS 试听语音。', ttsConfig);
      setTtsStatus('试听已发送');
      addAppLog({ type: 'tts', title: 'TTS 试听', detail: `${ttsConfig.provider} / ${ttsConfig.model || 'default'} / ${ttsConfig.voiceId || 'default'}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'TTS 试听失败';
      setTtsStatus(message);
      addAppLog({ type: 'error', title: 'TTS 试听失败', detail: message });
    } finally {
      setIsTestingTts(false);
    }
  };

  const testNaiImage = async () => {
    const providerLabel = imageProviderLabels[imageGenerationConfig.provider];
    setImageTestStatus(`${providerLabel} 小图测试中...`);
    setImageTestUrl('');
    setIsTestingImage(true);
    try {
      const imageUrl = await requestNaiImage({
        config: {
          ...imageGenerationConfig,
          width: 512,
          height: 512,
          steps: Math.min(Math.max(4, Math.round(imageGenerationConfig.steps || 6)), 8),
          scale: imageGenerationConfig.scale || 5,
        },
        prompt: 'a small red apple on a clean white background',
      });
      setImageTestUrl(imageUrl);
      setImageTestStatus(`${providerLabel} 小图测试成功`);
      addAppLog({ type: 'image', title: `${providerLabel} 小图测试成功`, detail: `${imageGenerationConfig.baseUrl}; model=${imageGenerationConfig.model}; size=512x512` });
    } catch (error) {
      const message = error instanceof Error ? error.message : `${providerLabel} 小图测试失败`;
      setImageTestStatus(message);
      addAppLog({ type: 'error', title: `${providerLabel} 小图测试失败`, detail: message });
    } finally {
      setIsTestingImage(false);
    }
  };

  const saveSettings = () => {
    setSaveStatus('保存成功');
    window.setTimeout(() => setSaveStatus(''), 1800);
  };

  return (
    <section className="no-scrollbar flex h-full flex-col overflow-y-auto pb-4">
      <Header
        title="扩展设置"
        onSave={saveSettings}
        tabs={
          <>
            <Pill active={tab === 'model'} icon={<Settings />} label="文本模型" onClick={() => setTab('model')} />
            <Pill active={tab === 'tts'} icon={<Mic />} label="TTS 语音" onClick={() => setTab('tts')} />
            <Pill active={tab === 'image'} icon={<Palette />} label="生图配置" onClick={() => setTab('image')} />
            <Pill active={tab === 'community'} icon={<Shield />} label="社区验证" onClick={() => setTab('community')} />
            <Pill active={tab === 'self-check'} icon={<Shield />} label="一键自检" onClick={() => setTab('self-check')} />
          </>
        }
      />

      {saveStatus ? (
        <div className="grid flex-1 place-items-center px-4">
          <div className="w-full rounded-[30px] border-[3px] border-[#111] bg-[#edf7ed] p-8 text-center shadow-[3px_4px_0_rgba(0,0,0,0.16)]">
            <Check className="mx-auto h-10 w-10" />
            <p className="mt-3 text-2xl font-black">{saveStatus}</p>
          </div>
        </div>
      ) : (
        <>
          {tab === 'self-check' && (
            <>
              <Panel>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full border-[2px] border-[#111] px-3 py-1.5 text-xs font-black', statusClass(selfCheckSummary.status))}>
                    {selfCheckSummary.status === 'ok' ? '可用' : selfCheckSummary.status === 'warn' ? '需确认' : '需修复'}
                  </span>
                  <span className="rounded-full bg-[#dceecd] px-3 py-1.5 text-xs font-black">通过 {selfCheckSummary.ok}</span>
                  <span className="rounded-full bg-[#fff0b8] px-3 py-1.5 text-xs font-black">提醒 {selfCheckSummary.warn}</span>
                  <span className="rounded-full bg-[#ffd6d6] px-3 py-1.5 text-xs font-black">错误 {selfCheckSummary.error}</span>
                </div>
                <button onClick={runSettingsSelfCheck} disabled={selfCheckRunning} className="fetch-button mt-4 bg-[#d9e8f6] disabled:opacity-60">
                  <RefreshCw className={cn('h-5 w-5', selfCheckRunning && 'animate-spin')} />
                  {selfCheckRunning ? '正在自检' : '运行自检'}
                </button>
                {selfCheckStatus && <p className="mt-3 text-sm font-black leading-6 opacity-70">{selfCheckStatus}</p>}
              </Panel>

              <Panel>
                {selfCheckItems.map((item) => (
                  <article key={item.id} className="border-b-[2px] border-[#111]/15 py-3 first:pt-0 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-black', statusClass(item.status))}>
                        {item.status === 'ok' ? 'OK' : item.status === 'warn' ? '提醒' : '错误'}
                      </span>
                      <h3 className="text-base font-black">{item.label}</h3>
                    </div>
                    <p className="mt-2 text-sm font-bold leading-6 opacity-70">{item.detail}</p>
                    <p className="mt-1 text-xs font-black leading-5 opacity-55">{item.action}</p>
                  </article>
                ))}
              </Panel>

              <div className="hand-note mx-4 mt-5 p-4">
                <div className="flex gap-3">
                  <Zap className="mt-1 h-6 w-6 shrink-0" />
                  <p className="text-sm font-black leading-relaxed">自检只会尝试拉取文本模型列表；TTS 和生图这里只检查配置，不会自动播放语音或生成图片。</p>
                </div>
              </div>
            </>
          )}

          {tab === 'model' && (
            <>
              <Panel>
                <Field icon={<Link />} label="大模型接口地址">
                  <input value={apiBaseUrl} onChange={(event) => setModelConfig({ apiBaseUrl: event.target.value })} className="hand-input w-full" placeholder="例如：http://127.0.0.1:8000/v1" />
                </Field>
                <Field icon={<KeyRound />} label="API 密钥 / Token">
                  <input value={apiKey} onChange={(event) => setModelConfig({ apiKey: event.target.value })} className="hand-input w-full" type="password" placeholder="没有密钥可留空" />
                </Field>
                {availableModels.length > 0 && (
                  <Field icon={<Bot />} label="选择模型">
                    <select value={selectedModel} onChange={(event) => setModelConfig({ selectedModel: event.target.value })} className="hand-input w-full">
                      {availableModels.map((model) => <option key={model} value={model}>{model}</option>)}
                    </select>
                  </Field>
                )}
                <Field icon={<Bot />} label="模型名称">
                  <input value={selectedModel} onChange={(event) => setModelConfig({ selectedModel: event.target.value })} className="hand-input w-full" placeholder="例如：deepseek-chat" />
                </Field>
                <button onClick={pullModels} className={cn('fetch-button mt-2', modelPulled && 'bg-[#dceecd]')}>
                  {modelPulled ? <Check className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
                  {modelPulled ? '成功获取模型' : '点击拉取模型'}
                </button>
                {modelStatus && <p className="mt-3 text-sm font-black opacity-70">{modelStatus}</p>}
              </Panel>
              <div className="hand-note mx-4 mt-5 p-4">
                <div className="flex gap-3">
                  <Zap className="mt-1 h-6 w-6 shrink-0" />
                  <p className="text-sm font-black leading-relaxed">若使用本地网关、OneAPI 或 vLLM，在这里填写对应地址；400 等上游报错会写入后台日志。</p>
                </div>
              </div>
            </>
          )}

          {tab === 'tts' && (
            <Panel>
              <Field icon={<Mic />} label="TTS 提供商">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => selectProvider('browser')} className={cn('pill w-full', ttsConfig.provider === 'browser' && 'active')}>浏览器免费</button>
                  <button onClick={() => selectProvider('local')} className={cn('pill w-full', ttsConfig.provider === 'local' && 'active')}>本地 HTTP</button>
                  <button onClick={() => selectProvider('openai')} className={cn('pill w-full', ttsConfig.provider === 'openai' && 'active')}>OpenAI</button>
                  <button onClick={() => selectProvider('gemini')} className={cn('pill w-full', ttsConfig.provider === 'gemini' && 'active')}>Gemini</button>
                  <button onClick={() => selectProvider('minimax')} className={cn('pill w-full', ttsConfig.provider === 'minimax' && 'active')}>MiniMax</button>
                  <button onClick={() => selectProvider('doubao')} className={cn('pill w-full', ttsConfig.provider === 'doubao' && 'active')}>豆包</button>
                </div>
              </Field>
              {ttsConfig.provider !== 'browser' && (
                <Field icon={<Link />} label="TTS 接口地址">
                  <input value={ttsConfig.baseUrl} onChange={(event) => { setTtsConfig({ baseUrl: event.target.value }); setTtsAvailableModels([]); }} className="hand-input w-full" placeholder={getProviderPlaceholder(ttsConfig.provider)} />
                </Field>
              )}
              {ttsConfig.provider === 'doubao' && (
                <Field icon={<KeyRound />} label="豆包旧版 AppID">
                  <input value={ttsConfig.appId || ''} onChange={(event) => setTtsConfig({ appId: event.target.value })} className="hand-input w-full" placeholder="旧版 volcano_tts 才需要，新版 seed-tts-2.0 留空" />
                </Field>
              )}
              {ttsConfig.provider !== 'browser' && ttsConfig.provider !== 'local' && (
                <Field icon={<KeyRound />} label="TTS API Key">
                  <input value={ttsConfig.apiKey} onChange={(event) => setTtsConfig({ apiKey: event.target.value })} className="hand-input w-full" type="password" placeholder={ttsConfig.provider === 'doubao' ? '火山引擎语音 API Key / 旧版 Token' : '官方 API key'} />
                </Field>
              )}
              <Field icon={<Bot />} label="TTS 模型">
                <button onClick={pullTtsModels} disabled={isPullingTtsModels || ttsConfig.provider === 'browser'} className="fetch-button mb-3 bg-[#e7f4ff] disabled:opacity-60">
                  <RefreshCw className={cn('h-5 w-5', isPullingTtsModels && 'animate-spin')} />
                  {isPullingTtsModels ? '正在拉取 TTS 模型...' : '拉取 TTS 模型'}
                </button>
                {ttsAvailableModels.length > 0 ? (
                  <select value={ttsConfig.model} onChange={(event) => setTtsConfig({ model: event.target.value })} className="hand-input w-full">
                    {ttsAvailableModels.map((model) => <option key={model} value={model}>{model}</option>)}
                  </select>
                ) : (
                  <input value={ttsConfig.model} onChange={(event) => setTtsConfig({ model: event.target.value })} className="hand-input w-full" placeholder={getModelPlaceholder(ttsConfig.provider)} />
                )}
              </Field>
              {modelPresets.length > 0 && (
                <Field icon={<Bot />} label="模型预设">
                  <div className="grid grid-cols-2 gap-2">
                    {modelPresets.map((preset) => (
                      <button key={preset.id} onClick={() => applyModelPreset(preset)} className={cn('pill w-full', ttsConfig.model === preset.model && 'active')}>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
              {showTtsVoiceControls && (
                <>
                  <Field icon={<Volume2 />} label="音色 / Voice ID">
                    <input value={ttsConfig.voiceId} onChange={(event) => setTtsConfig({ voiceId: event.target.value })} className="hand-input w-full" placeholder={getVoicePlaceholder(ttsConfig.provider)} />
                  </Field>
                  <Field icon={<Volume2 />} label="音色预设">
                    <div className="grid grid-cols-2 gap-2">
                      {allVoicePresets.map((preset) => (
                        <button key={preset.id} onClick={() => applyVoicePreset(preset)} className={cn('pill w-full', ttsConfig.provider === preset.provider && ttsConfig.voiceId === preset.voiceId && 'active')}>
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={saveCurrentVoicePreset} className="fetch-button mt-3 bg-[#e7f4ff]">保存当前音色为预设</button>
                  </Field>
                </>
              )}
              <button onClick={() => setTtsEnabled(!ttsEnabled)} className="fetch-button mt-2">
                {ttsEnabled ? '关闭微信/电话 TTS' : '开启微信/电话 TTS'}
              </button>
              <button onClick={previewTts} disabled={isTestingTts} className="fetch-button mt-3 bg-[#fff0bd] disabled:opacity-60">
                {isTestingTts ? '正在试听...' : '试听 TTS'}
              </button>
              {ttsStatus && <p className="mt-3 text-sm font-black opacity-70">{ttsStatus}</p>}
              <p className="mt-3 text-xs font-black leading-5 opacity-60">TTS 会供微信语音条和电话通话使用；先拉取模型并选择要用的 TTS 模型。</p>
            </Panel>
          )}

          {tab === 'image' && (
            <Panel>
              <p className="mb-4 text-sm font-black leading-6 opacity-65">这里保存全局生图配置，微信、小红书和主动事件需要图片时会读取这里。</p>
              <Field icon={<Palette />} label="生图提供商">
                <div className="grid grid-cols-3 gap-2">
                  {(['novelai', 'comfyui', 'custom'] as const).map((provider) => (
                    <button key={provider} type="button" onClick={() => selectImageProvider(provider)} className={cn('pill w-full', imageGenerationConfig.provider === provider && 'active')}>
                      {imageProviderLabels[provider]}
                    </button>
                  ))}
                </div>
              </Field>
              <Field icon={<Link />} label="生图接口地址">
                <input value={imageGenerationConfig.baseUrl} onChange={(event) => setImageGenerationConfig({ baseUrl: event.target.value, availableModels: [], model: '' })} className="hand-input w-full" placeholder={getImageProviderPlaceholder(imageGenerationConfig)} />
              </Field>
              {imageGenerationConfig.provider === 'custom' && (
                <Field icon={<Bot />} label="Custom API preset">
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['auto', 'Auto'],
                      ['mj-task', 'MJ'],
                      ['nai', 'NAI'],
                      ['openai-images', 'OpenAI'],
                      ['generic-json', 'JSON'],
                    ] as const).map(([format, label]) => (
                      <button
                        key={format}
                        type="button"
                        onClick={() => setImageGenerationConfig({
                          customFormat: format,
                          availableModels: [],
                          model: format === 'nai' ? defaultImageGenerationConfig.model : imageGenerationConfig.model,
                        })}
                        className={cn('pill w-full', (imageGenerationConfig.customFormat || 'auto') === format && 'active')}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
              <Field icon={<KeyRound />} label="API Key / Token">
                <input value={imageGenerationConfig.apiKey} onChange={(event) => setImageGenerationConfig({ apiKey: event.target.value })} className="hand-input w-full" type="password" placeholder="只保存在本机浏览器里" />
              </Field>
              <Field icon={<Bot />} label="模型">
                <button onClick={pullImageModels} disabled={isPullingImageModels} className="fetch-button mb-3 bg-[#e7f4ff] disabled:opacity-60">
                  <RefreshCw className="h-5 w-5" />
                  {isPullingImageModels ? '正在拉取模型...' : `拉取 ${imageProviderLabels[imageGenerationConfig.provider]} 模型`}
                </button>
                {imageModelStatus && <p className="mb-3 text-sm font-black opacity-70">{imageModelStatus}</p>}
                {(imageGenerationConfig.availableModels || []).length > 0 ? (
                  <select value={imageGenerationConfig.model} onChange={(event) => setImageGenerationConfig({ model: event.target.value })} className="hand-input w-full">
                    {(imageGenerationConfig.availableModels || []).map((model) => <option key={model} value={model}>{model}</option>)}
                  </select>
                ) : (
                  <input value={imageGenerationConfig.model} onChange={(event) => setImageGenerationConfig({ model: event.target.value })} className="hand-input w-full" placeholder="先拉取模型；自定义接口也可手动填写" />
                )}
              </Field>
              <Field icon={<ImageIcon />} label="默认尺寸">
                <div className="grid grid-cols-2 gap-2">
                  <input value={imageGenerationConfig.width} onChange={(event) => setImageGenerationConfig({ width: Number(event.target.value) || 512 })} className="hand-input min-w-0" inputMode="numeric" placeholder="宽" />
                  <input value={imageGenerationConfig.height} onChange={(event) => setImageGenerationConfig({ height: Number(event.target.value) || 512 })} className="hand-input min-w-0" inputMode="numeric" placeholder="高" />
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field icon={<RefreshCw />} label="步数">
                  <input value={imageGenerationConfig.steps} onChange={(event) => setImageGenerationConfig({ steps: Number(event.target.value) || 18 })} className="hand-input min-w-0" inputMode="numeric" />
                </Field>
                <Field icon={<Sparkles />} label="CFG">
                  <input value={imageGenerationConfig.scale} onChange={(event) => setImageGenerationConfig({ scale: Number(event.target.value) || 5 })} className="hand-input min-w-0" inputMode="decimal" />
                </Field>
              </div>
              <Field icon={<Sparkles />} label="通用正向提示串">
                <textarea value={imageGenerationConfig.promptPreset} onChange={(event) => setImageGenerationConfig({ promptPreset: event.target.value })} className="hand-input min-h-20 w-full resize-none" />
              </Field>
              <Field icon={<Sparkles />} label="Extra prompt">
                <textarea value={imageGenerationConfig.promptExtra || ''} onChange={(event) => setImageGenerationConfig({ promptExtra: event.target.value })} className="hand-input min-h-16 w-full resize-none" placeholder="场景、镜头、画师补充；会夹在正向和本次描述中间" />
              </Field>
              <Field icon={<FileText />} label="反向提示">
                <div className="space-y-3">
                  <p className="text-sm font-black opacity-75">角色生图 tags</p>
                  {characters.length === 0 ? (
                    <p className="text-sm font-black opacity-60">先导入角色后再填写角色专属 tag。</p>
                  ) : characters.map((character) => (
                    <label key={character.id} className="block">
                      <span className="mb-1 block text-sm font-black opacity-70">{character.name || '未命名角色'}</span>
                      <textarea
                        value={character.imagePromptTags || ''}
                        onChange={(event) => updateCharacter(character.id, { imagePromptTags: event.target.value })}
                        className="hand-input min-h-16 w-full resize-none"
                        placeholder="外貌、服装、专属画师串；风景/物品图会自动跳过"
                      />
                    </label>
                  ))}
                </div>
              </Field>
              <Field icon={<FileText />} label="反向提示">
                <textarea value={imageGenerationConfig.negativePrompt} onChange={(event) => setImageGenerationConfig({ negativePrompt: event.target.value })} className="hand-input min-h-20 w-full resize-none" />
              </Field>
              <button onClick={testNaiImage} disabled={isTestingImage} className="fetch-button mt-2 bg-[#fff0bd] disabled:opacity-60">
                {isTestingImage ? '小图测试中...' : '小图测试'}
              </button>
              {imageTestStatus && <p className="mt-3 text-sm font-black opacity-70">{imageTestStatus}</p>}
              {imageTestUrl && <img src={imageTestUrl} alt="生图测试结果" className="mt-3 aspect-square w-full max-w-[220px] rounded-xl border-[3px] border-[#111] object-cover" />}
            </Panel>
          )}

          {tab === 'community' && (
            <Panel>
              <p className="mb-4 text-sm font-black leading-6 opacity-65">后门码不写入前端或 APK。这里仅填写独立后端服务地址，真正的 48 小时代码和固定维护码都在后端环境变量里。</p>
              <Field icon={<KeyRound />} label="后门服务地址">
                <input value={communityVerificationConfig.backdoorApiUrl} onChange={(event) => setCommunityVerificationConfig({ backdoorApiUrl: event.target.value.trim() })} className="hand-input w-full" placeholder="例如：https://your-domain.example" />
              </Field>
              <Field icon={<KeyRound />} label="Discord Client ID">
                <input value={communityVerificationConfig.discordClientId} onChange={(event) => setCommunityVerificationConfig({ discordClientId: event.target.value.trim() })} className="hand-input w-full" />
              </Field>
              <Field icon={<Users />} label="Discord Guild ID">
                <textarea value={communityVerificationConfig.discordGuildIds.join('\n')} onChange={(event) => setCommunityVerificationConfig({ discordGuildIds: event.target.value.split(/[\n,，、]+/).map((item) => item.trim()).filter(Boolean) })} className="hand-input min-h-20 w-full resize-none" />
              </Field>
              <Field icon={<Users />} label="需要的社区/身份组名称">
                <textarea value={communityVerificationConfig.requiredGroups.join('\n')} onChange={(event) => setCommunityVerificationConfig({ requiredGroups: event.target.value.split(/[\n,，、]+/).map((item) => item.trim()).filter(Boolean) })} className="hand-input min-h-20 w-full resize-none" />
              </Field>
            </Panel>
          )}

          <Panel>
            <Field icon={<CircleUserRound />} label="你的名字">
              <input value={userName} onChange={(event) => setUserName(event.target.value)} className="hand-input w-full" />
            </Field>
          </Panel>
        </>
      )}
    </section>
  );
}
