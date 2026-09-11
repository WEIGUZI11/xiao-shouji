import type { ImageGenerationConfig } from '../../lib/naiImage';
import { isServerManagedNaiEndpoint } from '../../lib/naiImage';
import type { TtsConfig } from '../../tts';
import { getVoiceCallAudioIssue } from '../voice/voiceCallLogic';

export type SettingsSelfCheckStatus = 'ok' | 'warn' | 'error';

export type SettingsSelfCheckItemId = 'model' | 'tts' | 'image';

export interface SettingsSelfCheckInput {
  apiBaseUrl: string;
  availableModels: string[];
  selectedModel: string;
  ttsEnabled: boolean;
  ttsConfig: TtsConfig;
  imageGenerationEnabled: boolean;
  imageGenerationConfig: ImageGenerationConfig;
}

export interface SettingsSelfCheckItem {
  id: SettingsSelfCheckItemId;
  label: string;
  status: SettingsSelfCheckStatus;
  detail: string;
  action: string;
}

export interface SettingsSelfCheckSummary {
  status: SettingsSelfCheckStatus;
  ok: number;
  warn: number;
  error: number;
}

function isBlank(value: string | undefined) {
  return !value || !value.trim();
}

function checkModel(input: SettingsSelfCheckInput): SettingsSelfCheckItem {
  if (isBlank(input.apiBaseUrl)) {
    return {
      id: 'model',
      label: '文本大模型',
      status: 'error',
      detail: '还没有填写大模型接口地址，聊天、电话和生成类功能无法连接模型。',
      action: '在“文本大模型”里填写接口地址，然后运行自检或拉取模型。',
    };
  }
  if (!input.availableModels.length) {
    return {
      id: 'model',
      label: '文本大模型',
      status: 'warn',
      detail: '已经填写接口地址，但还没有成功拉取模型列表。',
      action: '点“运行自检”或“点击拉取模型”，确认接口能返回模型。',
    };
  }
  if (isBlank(input.selectedModel)) {
    return {
      id: 'model',
      label: '文本大模型',
      status: 'warn',
      detail: `已拉取 ${input.availableModels.length} 个模型，但还没有选择默认模型。`,
      action: '在模型下拉框里选择一个默认模型。',
    };
  }
  return {
    id: 'model',
    label: '文本大模型',
    status: 'ok',
    detail: `接口地址、模型列表和默认模型已配置。当前模型：${input.selectedModel}。`,
    action: '可以开始聊天、电话和内容生成。',
  };
}

function checkTts(input: SettingsSelfCheckInput): SettingsSelfCheckItem {
  const { ttsConfig } = input;
  if (!input.ttsEnabled) {
    return {
      id: 'tts',
      label: 'TTS 语音',
      status: 'warn',
      detail: 'TTS 当前关闭，聊天和电话不会自动播放语音。',
      action: '需要语音时在“TTS 语音”里开启，并试听一次。',
    };
  }
  if (ttsConfig.provider === 'browser') {
    return {
      id: 'tts',
      label: 'TTS 语音',
      status: 'ok',
      detail: '正在使用浏览器免费语音，不需要额外 API Key。',
      action: '可以点“试听 TTS”确认设备是否允许播放。',
    };
  }
  if (ttsConfig.provider === 'local' && isBlank(ttsConfig.baseUrl)) {
    return {
      id: 'tts',
      label: 'TTS 语音',
      status: 'error',
      detail: '本地 HTTP TTS 已开启，但没有填写本地接口地址。',
      action: '填写本地 TTS 地址，例如 http://127.0.0.1:9880/tts。',
    };
  }
  if ((ttsConfig.provider === 'openai' || ttsConfig.provider === 'gemini' || ttsConfig.provider === 'minimax' || ttsConfig.provider === 'doubao') && isBlank(ttsConfig.apiKey)) {
    return {
      id: 'tts',
      label: 'TTS 语音',
      status: 'error',
      detail: `${ttsConfig.provider} TTS 需要 API Key。`,
      action: '填写 TTS API Key，或切回浏览器免费语音。',
    };
  }
  if (isBlank(ttsConfig.voiceId)) {
    return {
      id: 'tts',
      label: 'TTS 语音',
      status: 'warn',
      detail: 'TTS 已开启，但音色 Voice ID 为空。',
      action: ttsConfig.provider === 'doubao' ? '选择当前豆包服务下的公版音色，或填写复刻音色 Speaker ID。' : '填写该提供商支持的音色 ID。',
    };
  }
  const issue = getVoiceCallAudioIssue({
    ttsEnabled: input.ttsEnabled,
    provider: ttsConfig.provider,
    apiKey: ttsConfig.apiKey,
    baseUrl: ttsConfig.baseUrl,
    model: ttsConfig.model,
    voiceId: ttsConfig.voiceId,
    hasBrowserSpeechSynthesis: true,
  });
  if (issue) {
    return {
      id: 'tts',
      label: 'TTS 语音',
      status: 'error',
      detail: issue,
      action: '回到 TTS 页面重新选择匹配的服务和音色，再试听一次。',
    };
  }
  return {
    id: 'tts',
    label: 'TTS 语音',
    status: 'ok',
    detail: `TTS 配置完整，当前提供商：${ttsConfig.provider}（尚未代表网络试听成功）。`,
    action: '点“试听 TTS”；听到声音后再进入电话。',
  };
}

function checkImage(input: SettingsSelfCheckInput): SettingsSelfCheckItem {
  const config = input.imageGenerationConfig;
  if (!input.imageGenerationEnabled) {
    return {
      id: 'image',
      label: '生图配置',
      status: 'warn',
      detail: '生图总开关已关闭，所有软件都不会发送生图请求。',
      action: '需要生图时在“生图配置”顶部开启总开关。',
    };
  }
  if (isBlank(config.baseUrl)) {
    return {
      id: 'image',
      label: '生图配置',
      status: 'error',
      detail: '生图接口地址为空，微信、小红书和主动事件无法生成图片。',
      action: '填写 /api/nai/generate-image、ComfyUI 地址或自定义生图接口。',
    };
  }
  if (config.provider === 'novelai' && !isServerManagedNaiEndpoint(config.baseUrl) && isBlank(config.apiKey)) {
    return {
      id: 'image',
      label: '生图配置',
      status: 'error',
      detail: 'NovelAI 直连接口需要 NAI API Key；服务端代理可以把 key 放在服务器。',
      action: '填写 NAI API Key，或使用 /api/nai/generate-image 服务端代理。',
    };
  }
  if (config.provider === 'custom' && isBlank(config.model)) {
    return {
      id: 'image',
      label: '生图配置',
      status: 'warn',
      detail: '自定义生图接口已填写，但模型名为空。',
      action: '如果你的接口需要模型名，请在“模型”里填写。',
    };
  }
  return {
    id: 'image',
    label: '生图配置',
    status: 'ok',
    detail: `${config.provider} 生图基础配置已填写，默认尺寸 ${config.width}x${config.height}。`,
    action: '首次使用时建议在聊天里小图测试一次。',
  };
}

export function buildSettingsSelfCheckReport(input: SettingsSelfCheckInput): SettingsSelfCheckItem[] {
  return [
    checkModel(input),
    checkTts(input),
    checkImage(input),
  ];
}

export function summarizeSettingsSelfCheck(items: SettingsSelfCheckItem[]): SettingsSelfCheckSummary {
  const summary = items.reduce(
    (current, item) => ({ ...current, [item.status]: current[item.status] + 1 }),
    { ok: 0, warn: 0, error: 0 },
  );
  return {
    ...summary,
    status: summary.error > 0 ? 'error' : summary.warn > 0 ? 'warn' : 'ok',
  };
}
