import {
  Bot,
  Check,
  ChevronDown,
  CircleUserRound,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  KeyRound,
  Link,
  MessageCircle,
  Mic,
  Palette,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Volume2,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { useShallow } from 'zustand/react/shallow';

/**
 * Settings screen for text models, TTS, image generation, feedback, and self-check.
 * Provider labels/placeholders and model-list fetching live in settingsConfigUi.ts;
 * provider defaults and voice presets live in settingsTtsPresets.ts.
 */
import {
  defaultImageGenerationConfig,
  fetchImageGenerationModels,
  getCustomImageRequestFormat,
  getDefaultImageBaseUrlForProvider,
  getImageRequestTimeoutMs,
  normalizeOpenAiImageEndpoint,
  resolveOpenAiImageSize,
  resolveEffectiveImageRequestSize,
  type ImageGenerationConfig,
} from '../../lib/naiImage';
import { requestAppImage } from '../../lib/appImageGeneration';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { PersistentImage } from '../../components/PersistentImage';
import { speakWithConfiguredTts, type TtsProvider } from '../../tts';
import { Field, Header, Panel, Pill } from '../shared/AppPrimitives';
import {
  fetchModelList,
  getImageProviderLabel,
  getImageProviderPlaceholder,
  getModelPlaceholder,
  getProviderPlaceholder,
  imageProviderLabels,
  readVoicePresets,
  type SettingsTab,
} from './settingsConfigUi';
import { buildSettingsSelfCheckReport, summarizeSettingsSelfCheck, type SettingsSelfCheckItem } from './settingsSelfCheck';
import { communityFeedbackUrl, openCommunityFeedback } from './communityFeedback';
import {
  canPullTtsModelsFromProvider,
  getTtsModelListBaseUrl,
  getProviderModelPresets,
  getProviderDefaultTtsConfig,
  getVoiceIdForModelPreset,
  getVoicePresetsForProvider,
  getVoicePlaceholder,
  providerDefaults,
  shouldShowTtsVoiceControls,
  shouldUseTtsModelPresets,
  voicePresetStorageKey,
  type ModelPreset,
  type VoicePreset,
} from './settingsTtsPresets';

type DebouncedInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string | number;
  onCommit: (value: string) => void;
};

function DebouncedInput({ value, onCommit, onBlur, ...props }: DebouncedInputProps) {
  const [draft, setDraft] = useState(String(value));
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const scheduleCommit = (next: string) => {
    setDraft(next);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => onCommit(next), 300);
  };

  return (
    <input
      {...props}
      value={draft}
      onChange={(event) => scheduleCommit(event.target.value)}
      onBlur={(event) => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        onCommit(event.target.value);
        onBlur?.(event);
      }}
    />
  );
}

type DebouncedTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string;
  onCommit: (value: string) => void;
};

function DebouncedTextarea({ value, onCommit, onBlur, ...props }: DebouncedTextareaProps) {
  const [draft, setDraft] = useState(value);
  const timerRef = useRef<number | null>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  return (
    <textarea
      {...props}
      value={draft}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => onCommit(next), 300);
      }}
      onBlur={(event) => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        onCommit(event.target.value);
        onBlur?.(event);
      }}
    />
  );
}

export function SettingsScreen() {
  const {
    apiBaseUrl,
    apiKey,
    availableModels,
    selectedModel,
    chatPromptRoleMode,
    setModelConfig,
    setAvailableModels,
    userName,
    setUserName,
    ttsConfig,
    setTtsConfig,
    selectTtsProvider: activateTtsProvider,
    ttsEnabled,
    setTtsEnabled,
    imageGenerationConfig,
    setImageGenerationConfig,
    imageProviderConfigs,
    selectImageProvider: activateImageProvider,
    addCustomImageProviderProfile,
    updateCustomImageProviderProfile,
    deleteCustomImageProviderProfile,
    selectCustomImageProviderProfile,
    imageGenerationEnabled,
    proactiveImageGenerationEnabled,
    setImageGenerationEnabled,
    setProactiveImageGenerationEnabled,
    addAppLog,
    characters,
    updateCharacter,
  } = useAppStore(useShallow((state) => ({
    apiBaseUrl: state.apiBaseUrl,
    apiKey: state.apiKey,
    availableModels: state.availableModels,
    selectedModel: state.selectedModel,
    chatPromptRoleMode: state.chatPromptRoleMode,
    setModelConfig: state.setModelConfig,
    setAvailableModels: state.setAvailableModels,
    userName: state.userName,
    setUserName: state.setUserName,
    ttsConfig: state.ttsConfig,
    setTtsConfig: state.setTtsConfig,
    selectTtsProvider: state.selectTtsProvider,
    ttsEnabled: state.ttsEnabled,
    setTtsEnabled: state.setTtsEnabled,
    imageGenerationConfig: state.imageGenerationConfig,
    setImageGenerationConfig: state.setImageGenerationConfig,
    imageProviderConfigs: state.imageProviderConfigs,
    selectImageProvider: state.selectImageProvider,
    addCustomImageProviderProfile: state.addCustomImageProviderProfile,
    updateCustomImageProviderProfile: state.updateCustomImageProviderProfile,
    deleteCustomImageProviderProfile: state.deleteCustomImageProviderProfile,
    selectCustomImageProviderProfile: state.selectCustomImageProviderProfile,
    imageGenerationEnabled: state.imageGenerationEnabled,
    proactiveImageGenerationEnabled: state.proactiveImageGenerationEnabled,
    setImageGenerationEnabled: state.setImageGenerationEnabled,
    setProactiveImageGenerationEnabled: state.setProactiveImageGenerationEnabled,
    addAppLog: state.addAppLog,
    characters: state.characters,
    updateCharacter: state.updateCharacter,
  })));

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
  const [showTtsAdvanced, setShowTtsAdvanced] = useState(false);
  const [showImageAdvanced, setShowImageAdvanced] = useState(false);

  useEffect(() => {
    setCustomVoicePresets(readVoicePresets());
  }, []);

  const visibleVoicePresets = getVoicePresetsForProvider(ttsConfig.provider, customVoicePresets, ttsConfig.model);
  const modelPresets: ModelPreset[] = getProviderModelPresets(ttsConfig.provider);
  const showTtsVoiceControls = shouldShowTtsVoiceControls();
  const activeCustomImageProfile = imageProviderConfigs.customProfiles.find((profile) => profile.id === imageProviderConfigs.activeCustomProfileId)
    || imageProviderConfigs.customProfiles[0];
  const selfCheckItems = buildSettingsSelfCheckReport({
    apiBaseUrl,
    availableModels,
    selectedModel,
    ttsEnabled,
    ttsConfig,
    imageGenerationEnabled,
    imageGenerationConfig,
  });
  const selfCheckSummary = summarizeSettingsSelfCheck(selfCheckItems);

  const statusClass = (status: SettingsSelfCheckItem['status']) => {
    if (status === 'ok') return 'bg-[#dceecd] text-[#244b25]';
    if (status === 'warn') return 'bg-[#fff0b8] text-[#6c4b00]';
    return 'bg-[#ffd6d6] text-[#8f1d1d]';
  };

  const selectProvider = (provider: TtsProvider) => {
    activateTtsProvider(provider);
    setTtsStatus('');
    setTtsAvailableModels([]);
  };

  const applyVoicePreset = (preset: VoicePreset) => {
    if (ttsConfig.provider !== preset.provider) activateTtsProvider(preset.provider);
    setTtsConfig({
      provider: preset.provider,
      ...(preset.model ? { model: preset.model } : {}),
      voiceId: preset.voiceId,
    });
    setTtsStatus(`已切到 ${preset.label}`);
  };

  const applyModelPreset = (preset: ModelPreset) => {
    if (ttsConfig.provider !== preset.provider) activateTtsProvider(preset.provider);
    const nextVoiceId = getVoiceIdForModelPreset(ttsConfig.voiceId, preset);
    setTtsConfig({
      provider: preset.provider,
      ...(preset.baseUrl ? { baseUrl: preset.baseUrl } : {}),
      model: preset.model,
      ...(preset.provider === 'doubao' ? { voiceId: nextVoiceId } : {}),
    });
    setTtsStatus(
      preset.provider === 'doubao' && preset.model === 'seed-icl-2.0'
        ? `已切到 ${preset.label}，请填写控制台生成的 Speaker ID`
        : `已切到 ${preset.label}${nextVoiceId !== ttsConfig.voiceId ? '，并匹配了对应音色' : ''}`,
    );
  };

  const selectImageProvider = (provider: ImageGenerationConfig['provider']) => {
    activateImageProvider(provider);
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
    if (!canPullTtsModelsFromProvider(ttsConfig.provider)) {
      setTtsStatus('浏览器语音不需要拉取模型。');
      return;
    }
    const modelBaseUrl = getTtsModelListBaseUrl(ttsConfig.provider, ttsConfig.baseUrl);
    if (shouldUseTtsModelPresets(ttsConfig.provider)) {
      const presets = getProviderModelPresets(ttsConfig.provider);
      setTtsAvailableModels(presets.map((preset) => preset.model));
      if (!ttsConfig.model.trim() && presets[0]) setTtsConfig({ model: presets[0].model, baseUrl: presets[0].baseUrl || ttsConfig.baseUrl });
      const detail = presets.map((preset) => `${preset.label}: ${preset.model}`).join('\n');
      setTtsStatus(presets.length > 0 ? `已载入 ${presets.length} 个内置 TTS 模型预设` : '这个 TTS 提供商没有内置模型预设，请手动填写模型名。');
      addAppLog({ type: presets.length > 0 ? 'success' : 'info', title: 'TTS 模型预设载入', detail: detail || '无内置预设' });
      return;
    }
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
      setTtsStatus(`${message}。如果这个公益站/中转站不提供 /models，可以直接把模型名粘到下面输入框。`);
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
      const currentModel = imageGenerationConfig.model.trim();
      const availableModels = currentModel && !models.includes(currentModel) ? [currentModel, ...models] : models;
      setImageGenerationConfig({ availableModels, model: currentModel || models[0] || '' });
      setImageModelStatus(models.length > 0 ? `已拉取 ${models.length} 个候选模型；模型列表可访问不代表支持生图。` : '接口可访问，但没有返回模型列表');
      addAppLog({
        type: models.length > 0 ? 'success' : 'info',
        title: `${getImageProviderLabel(imageGenerationConfig.provider)} 生图模型拉取`,
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
    const providerLabel = getImageProviderLabel(imageGenerationConfig.provider);
    const isGptImage = imageGenerationConfig.provider === 'custom'
      && getCustomImageRequestFormat(imageGenerationConfig) === 'openai-images'
      && imageGenerationConfig.model.trim().toLowerCase().startsWith('gpt-image-');
    const testConfig: ImageGenerationConfig = {
      ...imageGenerationConfig,
      width: isGptImage ? 1024 : 512,
      height: isGptImage ? 1024 : 512,
      quality: isGptImage ? 'low' : imageGenerationConfig.quality || 'auto',
      steps: Math.min(Math.max(4, Math.round(imageGenerationConfig.steps || 6)), 8),
      scale: imageGenerationConfig.scale || 5,
    };
    const requestUrl = testConfig.provider === 'custom' && getCustomImageRequestFormat(testConfig) === 'openai-images'
      ? normalizeOpenAiImageEndpoint(testConfig.baseUrl)
      : testConfig.baseUrl;
    const requestSize = resolveEffectiveImageRequestSize(testConfig).label;
    const requestHost = (() => {
      try { return new URL(requestUrl, window.location.href).host || '本机'; } catch { return '地址无效'; }
    })();
    const requestSummary = `${requestHost} / ${testConfig.model || '未指定模型'} / ${requestSize}`;
    setImageTestStatus(`${providerLabel} 测试中：${requestSummary}`);
    setImageTestUrl('');
    setIsTestingImage(true);
    try {
      const imageUrl = await requestAppImage({
        config: testConfig,
        prompt: 'a small red apple on a clean white background',
        triggerType: 'manual',
        imageGenerationEnabled,
        proactiveImageGenerationEnabled,
        source: 'settings-test',
        timeoutMs: getImageRequestTimeoutMs(testConfig),
      });
      setImageTestUrl(imageUrl);
      setImageTestStatus(`${providerLabel} 小图测试成功：${requestSummary}`);
      addAppLog({ type: 'image', title: `${providerLabel} 小图测试成功`, detail: `host=${requestHost}; model=${testConfig.model}; size=${requestSize}` });
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
        tabsClassName="settings-tab-grid"
        tabs={
          <>
            <Pill active={tab === 'model'} icon={<Settings />} label="文本模型" onClick={() => setTab('model')} />
            <Pill active={tab === 'tts'} icon={<Mic />} label="TTS 语音" onClick={() => setTab('tts')} />
            <Pill active={tab === 'image'} icon={<Palette />} label="生图配置" onClick={() => setTab('image')} />
            <Pill active={tab === 'feedback'} icon={<MessageCircle />} label="问题反馈" onClick={() => setTab('feedback')} />
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
                  <DebouncedInput value={apiBaseUrl} onCommit={(value) => setModelConfig({ apiBaseUrl: value })} className="hand-input w-full" placeholder="例如：https://服务商地址/v1" />
                  <p className="mt-2 text-xs font-bold leading-5 opacity-55">支持填写域名、/v1、Gemini 的 /v1beta/openai，或完整 /chat/completions 地址，系统会自动补全。</p>
                </Field>
                <Field icon={<KeyRound />} label="API 密钥 / Token">
                  <DebouncedInput value={apiKey} onCommit={(value) => setModelConfig({ apiKey: value })} className="hand-input w-full" type="password" placeholder="没有密钥可留空" />
                </Field>
                {availableModels.length > 0 && (
                  <Field icon={<Bot />} label="选择模型">
                    <select value={selectedModel} onChange={(event) => setModelConfig({ selectedModel: event.target.value })} className="hand-input w-full">
                      {availableModels.map((model) => <option key={model} value={model}>{model}</option>)}
                    </select>
                  </Field>
                )}
                <Field icon={<Bot />} label="模型名称">
                  <DebouncedInput value={selectedModel} onCommit={(value) => setModelConfig({ selectedModel: value })} className="hand-input w-full" placeholder="例如：deepseek-chat" />
                </Field>
                <Field icon={<Bot />} label="提示词发送方式">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setModelConfig({ chatPromptRoleMode: 'default' })}
                      className={cn('pill w-full', chatPromptRoleMode === 'default' && 'active')}
                    >
                      默认提示词
                    </button>
                    <button
                      type="button"
                      onClick={() => setModelConfig({ chatPromptRoleMode: 'system' })}
                      className={cn('pill w-full', chatPromptRoleMode === 'system' && 'active')}
                    >
                      系统提示词
                    </button>
                    <button
                      type="button"
                      onClick={() => setModelConfig({ chatPromptRoleMode: 'user' })}
                      className={cn('pill w-full', chatPromptRoleMode === 'user' && 'active')}
                    >
                      用户提示词
                    </button>
                  </div>
                  <p className="mt-2 text-xs font-black leading-5 opacity-60">推荐“默认提示词”，会保留系统、用户和 AI 助手条目的真实顺序与身份。只有明确不兼容 system 的中转站才选“用户提示词”。</p>
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
              <button
                type="button"
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={cn('settings-feature-switch', ttsEnabled && 'is-on')}
                aria-pressed={ttsEnabled}
              >
                <span><Mic className="h-5 w-5" />聊天与电话 TTS</span>
                <b>{ttsEnabled ? '已开启' : '已关闭'}</b>
              </button>
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
              {ttsConfig.provider !== 'browser' && ttsConfig.provider !== 'local' && (
                <p className={cn('settings-config-status', ttsConfig.apiKey.trim() && 'is-ready')}>
                  {ttsConfig.apiKey.trim() ? 'API Key 已配置' : 'API Key 未配置'}
                </p>
              )}
              <button type="button" onClick={() => setShowTtsAdvanced((value) => !value)} className="settings-advanced-toggle">
                <span><Settings className="h-4 w-4" />接口与高级设置</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', showTtsAdvanced && 'rotate-180')} />
              </button>
              {showTtsAdvanced && (
                <>
              {ttsConfig.provider !== 'browser' && (
                <Field icon={<Link />} label="TTS 接口地址">
                  <DebouncedInput value={ttsConfig.baseUrl} onCommit={(value) => { setTtsConfig({ baseUrl: value }); setTtsAvailableModels([]); }} className="hand-input w-full" placeholder={getProviderPlaceholder(ttsConfig.provider)} />
                </Field>
              )}
              {ttsConfig.provider !== 'browser' && ttsConfig.provider !== 'local' && (
                <Field icon={<KeyRound />} label="TTS API Key">
                  <DebouncedInput value={ttsConfig.apiKey} onCommit={(value) => setTtsConfig({ apiKey: value })} className="hand-input w-full" type="password" placeholder={ttsConfig.provider === 'doubao' ? '火山引擎语音 API Key / 旧版 Token' : '官方 API key'} />
                </Field>
              )}
                </>
              )}
              <Field icon={<Bot />} label={ttsConfig.provider === 'doubao' ? '服务资源 ID' : 'TTS 模型'}>
                <button onClick={pullTtsModels} disabled={isPullingTtsModels || !canPullTtsModelsFromProvider(ttsConfig.provider)} className="fetch-button mb-3 bg-[#e7f4ff] disabled:opacity-60">
                  <RefreshCw className={cn('h-5 w-5', isPullingTtsModels && 'animate-spin')} />
                  {isPullingTtsModels ? '正在拉取 TTS 模型...' : ttsConfig.provider === 'doubao' ? '豆包用下方预设或手填资源 ID' : '拉取 TTS 模型'}
                </button>
                {ttsAvailableModels.length > 0 ? (
                  <select value={ttsConfig.model} onChange={(event) => setTtsConfig({ model: event.target.value })} className="hand-input w-full">
                    {ttsAvailableModels.map((model) => <option key={model} value={model}>{model}</option>)}
                  </select>
                ) : (
                  <DebouncedInput value={ttsConfig.model} onCommit={(value) => setTtsConfig({ model: value })} className="hand-input w-full" placeholder={getModelPlaceholder(ttsConfig.provider)} />
                )}
              </Field>
              {modelPresets.length > 0 && (
                <Field icon={<Bot />} label={ttsConfig.provider === 'doubao' ? '豆包服务快捷项' : '模型预设'}>
                  <div className="settings-preset-grid">
                    {modelPresets.map((preset) => (
                      <button key={preset.id} onClick={() => applyModelPreset(preset)} className={cn('pill settings-preset-pill w-full', ttsConfig.model === preset.model && 'active')}>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {ttsConfig.provider === 'doubao' && (
                    <p className="mt-2 text-xs font-black leading-5 opacity-60">这里选的是接口服务与计费资源，不是音乐模型，也不是声音本身；切换时会自动匹配可用音色。</p>
                  )}
                </Field>
              )}
              {showTtsVoiceControls && (
                <>
                  <Field icon={<Volume2 />} label="音色 / Voice ID">
                    <DebouncedInput value={ttsConfig.voiceId} onCommit={(value) => setTtsConfig({ voiceId: value })} className="hand-input w-full" placeholder={getVoicePlaceholder(ttsConfig.provider)} />
                  </Field>
                  <Field icon={<Volume2 />} label={ttsConfig.provider === 'doubao' ? '当前服务可用音色' : '音色预设'}>
                    <div className="settings-preset-grid">
                      {visibleVoicePresets.map((preset) => (
                        <button key={preset.id} onClick={() => applyVoicePreset(preset)} className={cn('pill settings-preset-pill w-full', ttsConfig.provider === preset.provider && ttsConfig.voiceId === preset.voiceId && 'active')}>
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    {visibleVoicePresets.length === 0 && (
                      <p className="text-xs font-black leading-5 opacity-60">这个服务没有内置公版音色；请填入你在控制台训练后得到的 Speaker ID。</p>
                    )}
                    <button type="button" onClick={saveCurrentVoicePreset} className="fetch-button mt-3 bg-[#e7f4ff]">保存当前音色为预设</button>
                  </Field>
                </>
              )}
              {showTtsAdvanced && ttsConfig.provider === 'doubao' && (
                <>
                <Field icon={<KeyRound />} label="豆包鉴权方式">
                  <DebouncedInput
                    value={ttsConfig.appId || ''}
                    onCommit={(value) => setTtsConfig({ appId: value })}
                    className="hand-input w-full"
                    placeholder="新版 API Key 留空；旧控制台填写 App ID"
                  />
                  <p className="mt-2 text-xs font-black leading-5 opacity-60">新版控制台只填上面的 API Key；旧控制台同时填写 App ID 与 Access Token。</p>
                </Field>
                {(ttsConfig.model === 'seed-tts-2.0' || ttsConfig.model === 'seed-icl-2.0') && (
                  <Field icon={<Bot />} label="豆包 2.0 子模型">
                    <select
                      value={ttsConfig.doubaoModel || 'seed-tts-2.0-standard'}
                      onChange={(event) => setTtsConfig({ doubaoModel: event.target.value as 'seed-tts-2.0-standard' | 'seed-tts-2.0-expressive' })}
                      className="hand-input w-full"
                    >
                      <option value="seed-tts-2.0-standard">标准版：更稳定</option>
                      <option value="seed-tts-2.0-expressive">表现力版：情绪更丰富</option>
                    </select>
                  </Field>
                )}
                {ttsConfig.model === 'seed-icl-2.0' && (
                  <p className="mb-3 rounded-xl bg-[#eef7ff] p-3 text-xs font-black leading-5 opacity-75">复刻音色：先在豆包语音控制台上传并训练声音，再把生成的 Speaker ID 填入“音色 / Voice ID”。这里不会直接上传你的录音。</p>
                )}
                <Field icon={<Volume2 />} label="豆包声音调节">
                  <label className="mb-2 block text-xs font-black opacity-65">音量 {ttsConfig.loudnessRate ?? 0}</label>
                  <input
                    type="range"
                    min="-50"
                    max="100"
                    step="1"
                    value={ttsConfig.loudnessRate ?? 0}
                    onChange={(event) => setTtsConfig({ loudnessRate: Number(event.target.value) })}
                    className="w-full accent-[#74a6ff]"
                  />
                  <label className="mb-2 mt-4 block text-xs font-black opacity-65">语速 {ttsConfig.speechRate ?? 0}</label>
                  <input
                    type="range"
                    min="-50"
                    max="100"
                    step="1"
                    value={ttsConfig.speechRate ?? 0}
                    onChange={(event) => setTtsConfig({ speechRate: Number(event.target.value) })}
                    className="w-full accent-[#74a6ff]"
                  />
                  <p className="mt-2 text-xs font-black leading-5 opacity-60">官方 V3 参数：语速与音量范围均为 -50～100，0 为默认值。这里只发送这两个已确认的调节项。</p>
                </Field>
                </>
              )}
              <button onClick={previewTts} disabled={isTestingTts} className="fetch-button mt-3 bg-[#fff0bd] disabled:opacity-60">
                {isTestingTts ? '正在试听...' : '试听 TTS'}
              </button>
              {ttsStatus && <p className="mt-3 text-sm font-black opacity-70">{ttsStatus}</p>}
              <p className="mt-3 text-xs font-black leading-5 opacity-60">TTS 会供微信语音条和电话通话使用。豆包无需拉模型：选服务、选音色，再试听成功一次即可。</p>
            </Panel>
          )}

          {tab === 'image' && (
            <Panel>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setImageGenerationEnabled(!imageGenerationEnabled)}
                  className={cn('settings-feature-switch', imageGenerationEnabled && 'is-on')}
                  aria-pressed={imageGenerationEnabled}
                >
                  <span><ImageIcon className="h-5 w-5" />生图功能</span>
                  <b>{imageGenerationEnabled ? '已开启' : '已关闭'}</b>
                </button>
                <button
                  type="button"
                  onClick={() => setProactiveImageGenerationEnabled(!proactiveImageGenerationEnabled)}
                  disabled={!imageGenerationEnabled}
                  className={cn('settings-feature-switch', proactiveImageGenerationEnabled && imageGenerationEnabled && 'is-on')}
                  aria-pressed={proactiveImageGenerationEnabled && imageGenerationEnabled}
                >
                  <span><Sparkles className="h-5 w-5" />AI / char 主动生图</span>
                  <b>{proactiveImageGenerationEnabled && imageGenerationEnabled ? '已开启' : '已关闭'}</b>
                </button>
              </div>
              <p className="mb-4 mt-3 text-xs font-black leading-5 opacity-60">关闭主动生图不会影响手动生成；关闭总开关后不会发送任何生图请求。</p>
              <Field icon={<Palette />} label="生图提供商">
                <div className="grid grid-cols-3 gap-2">
                  {(['novelai', 'comfyui', 'custom'] as const).map((provider) => (
                    <button key={provider} type="button" onClick={() => selectImageProvider(provider)} className={cn('pill w-full', imageGenerationConfig.provider === provider && 'active')}>
                      {imageProviderLabels[provider]}
                    </button>
                  ))}
                </div>
              </Field>
              {imageGenerationConfig.provider === 'custom' && activeCustomImageProfile && (
                <Field icon={<Sparkles />} label="公益站配置">
                  <div className="grid grid-cols-2 gap-2">
                    {imageProviderConfigs.customProfiles.map((profile) => (
                      <button key={profile.id} type="button" onClick={() => selectCustomImageProviderProfile(profile.id)} className={cn('pill w-full', profile.id === imageProviderConfigs.activeCustomProfileId && 'active')}>
                        {profile.name}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="fetch-button !w-auto flex-1" onClick={() => addCustomImageProviderProfile()}><Plus className="h-4 w-4" />新增公益站</button>
                    <button
                      type="button"
                      className="fetch-button !w-auto bg-[#ffd6d6]"
                      disabled={imageProviderConfigs.customProfiles.length <= 1}
                      onClick={() => {
                        if (window.confirm(`确认删除“${activeCustomImageProfile.name}”？`)) deleteCustomImageProviderProfile(activeCustomImageProfile.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />删除
                    </button>
                  </div>
                  <DebouncedInput
                    value={activeCustomImageProfile.name}
                    onCommit={(value) => updateCustomImageProviderProfile(activeCustomImageProfile.id, { name: value })}
                    className="hand-input mt-2 w-full"
                    placeholder="例如：LN 公益站"
                  />
                </Field>
              )}
              <Field icon={<Link />} label="生图接口地址">
                <DebouncedInput value={imageGenerationConfig.baseUrl} onCommit={(value) => setImageGenerationConfig({ baseUrl: value, availableModels: [], model: '' })} className="hand-input w-full" placeholder={getImageProviderPlaceholder(imageGenerationConfig)} />
              </Field>
              {showImageAdvanced && imageGenerationConfig.provider === 'custom' && (
                <>
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
                  {(imageGenerationConfig.customFormat || 'auto') === 'auto' && getCustomImageRequestFormat(imageGenerationConfig) === 'unknown' && (
                    <p className="mt-2 rounded-xl bg-[#fff0bd] px-3 py-2 text-xs font-black leading-5">当前地址和模型不足以判断协议；测试或生图前请选择 OpenAI、NAI、MJ 或 JSON。</p>
                  )}
                </Field>
                <Field icon={<Link />} label="模型列表地址（可选）">
                  <DebouncedInput
                    value={imageGenerationConfig.customModelListUrl || ''}
                    onCommit={(value) => setImageGenerationConfig({ customModelListUrl: value, availableModels: [] })}
                    className="hand-input w-full"
                    placeholder="例如：https://站点地址/v1/models"
                  />
                  <p className="mt-2 text-xs font-bold leading-5 opacity-60">站点不是标准 /v1/models 时填写完整地址；留空会根据生图地址自动推导。</p>
                </Field>
                </>
              )}
              <Field icon={<KeyRound />} label="API Key / Token">
                <DebouncedInput value={imageGenerationConfig.apiKey} onCommit={(value) => setImageGenerationConfig({ apiKey: value })} className="hand-input w-full" type="password" placeholder="只保存在本机浏览器里" />
              </Field>
              <p className={cn('settings-config-status', imageGenerationConfig.apiKey.trim() && 'is-ready')}>
                {imageGenerationConfig.apiKey.trim() ? 'API Key 已配置' : imageGenerationConfig.provider === 'comfyui' ? '本地 ComfyUI 通常不需要 Key' : 'API Key 未配置'}
              </p>
              <Field icon={<Bot />} label="模型">
                <button onClick={pullImageModels} disabled={isPullingImageModels} className="fetch-button mb-3 bg-[#e7f4ff] disabled:opacity-60">
                  <RefreshCw className="h-5 w-5" />
                  {isPullingImageModels ? '正在拉取模型...' : `拉取 ${getImageProviderLabel(imageGenerationConfig.provider)} 模型`}
                </button>
                {imageModelStatus && <p className="mb-3 text-sm font-black opacity-70">{imageModelStatus}</p>}
                {(imageGenerationConfig.availableModels || []).length > 0 ? (
                  <select value={imageGenerationConfig.model} onChange={(event) => setImageGenerationConfig({ model: event.target.value })} className="hand-input w-full">
                    {(imageGenerationConfig.availableModels || []).map((model) => <option key={model} value={model}>{model}</option>)}
                  </select>
                ) : (
                  <DebouncedInput value={imageGenerationConfig.model} onCommit={(value) => setImageGenerationConfig({ model: value })} className="hand-input w-full" placeholder="先拉取模型；自定义接口也可手动填写" />
                )}
              </Field>
              <button type="button" onClick={() => setShowImageAdvanced((value) => !value)} className="settings-advanced-toggle">
                <span><Settings className="h-4 w-4" />高级生图参数</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', showImageAdvanced && 'rotate-180')} />
              </button>
              {showImageAdvanced && (
                <>
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
                <DebouncedTextarea value={imageGenerationConfig.promptPreset} onCommit={(value) => setImageGenerationConfig({ promptPreset: value })} className="hand-input min-h-20 w-full resize-none" />
              </Field>
              <Field icon={<Sparkles />} label="Extra prompt">
                <DebouncedTextarea value={imageGenerationConfig.promptExtra || ''} onCommit={(value) => setImageGenerationConfig({ promptExtra: value })} className="hand-input min-h-16 w-full resize-none" placeholder="场景、镜头、画师补充；会夹在正向和本次描述中间" />
              </Field>
              <Field icon={<FileText />} label="反向提示">
                <div className="space-y-3">
                  <p className="text-sm font-black opacity-75">角色生图 tags</p>
                  {characters.length === 0 ? (
                    <p className="text-sm font-black opacity-60">先导入角色后再填写角色专属 tag。</p>
                  ) : characters.map((character) => (
                    <label key={character.id} className="block">
                      <span className="mb-1 block text-sm font-black opacity-70">{character.name || '未命名角色'}</span>
                      <DebouncedTextarea
                        value={character.imagePromptTags || ''}
                        onCommit={(value) => updateCharacter(character.id, { imagePromptTags: value })}
                        className="hand-input min-h-16 w-full resize-none"
                        placeholder="外貌、服装、专属画师串；风景/物品图会自动跳过"
                      />
                    </label>
                  ))}
                </div>
              </Field>
              <Field icon={<FileText />} label="反向提示">
                <DebouncedTextarea value={imageGenerationConfig.negativePrompt} onCommit={(value) => setImageGenerationConfig({ negativePrompt: value })} className="hand-input min-h-20 w-full resize-none" />
              </Field>
              {imageGenerationConfig.provider === 'custom' && getCustomImageRequestFormat(imageGenerationConfig) === 'openai-images' && (
                <Field icon={<Sparkles />} label="GPT Image 质量">
                  <select
                    value={imageGenerationConfig.quality || 'auto'}
                    onChange={(event) => setImageGenerationConfig({ quality: event.target.value as ImageGenerationConfig['quality'] })}
                    className="hand-input w-full"
                  >
                    <option value="auto">自动</option>
                    <option value="low">低（测试省额度）</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </Field>
              )}
                </>
              )}
              <button onClick={testNaiImage} disabled={isTestingImage || !imageGenerationEnabled} className="fetch-button mt-2 bg-[#fff0bd] disabled:opacity-60">
                {isTestingImage ? '小图测试中...' : '小图测试'}
              </button>
              {imageTestStatus && <p className="mt-3 text-sm font-black opacity-70">{imageTestStatus}</p>}
              {imageTestUrl && <PersistentImage src={imageTestUrl} alt="生图测试结果" className="mt-3 aspect-square w-full max-w-[220px] rounded-xl border-[3px] border-[#111] object-cover" />}
            </Panel>
          )}

          {tab === 'feedback' && (
            <Panel>
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-[2px] border-[#111] bg-[#d9e8f6]">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black">问题反馈社区</h2>
                  <p className="mt-1 text-sm font-bold leading-6 opacity-65">
                    社区验证已经取消，不加入社区也能正常使用小手机。遇到连接、语音、生图或界面问题时，可以来这里反馈。
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border-[2px] border-[#111] bg-white/60 px-4 py-3">
                <span className="block text-xs font-black opacity-55">Discord 邀请链接</span>
                <span className="mt-1 block break-all text-sm font-black">{communityFeedbackUrl}</span>
              </div>
              <button type="button" onClick={() => openCommunityFeedback()} className="fetch-button mt-4 w-full justify-center bg-[#dceecd]">
                <ExternalLink className="h-5 w-5" />
                打开反馈社区
              </button>
              <p className="mt-3 text-center text-xs font-bold leading-5 opacity-55">这里只负责跳转反馈，不读取 Discord 身份，也不保存验证信息。</p>
            </Panel>
          )}

      {tab === 'model' && <Panel>
        <Field icon={<CircleUserRound />} label="你的名字">
          <DebouncedInput value={userName} onCommit={setUserName} className="hand-input w-full" />
        </Field>
      </Panel>}
        </>
      )}
    </section>
  );
}
