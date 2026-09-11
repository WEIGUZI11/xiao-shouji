import type { ImageGenerationConfig, ImageTriggerType } from './naiImage';

export type ImageGenerationTaskStatus = 'queued' | 'running' | 'success' | 'failure' | 'interrupted';
export type ImageGenerationTaskSource =
  | 'settings-test'
  | 'wechat-chat'
  | 'qq-chat'
  | 'wechat-moments'
  | 'qq-space'
  | 'xiaohongshu'
  | 'gallery'
  | 'proactive'
  | 'legacy';

export interface ImageGenerationTask {
  id: string;
  status: ImageGenerationTaskStatus;
  source: ImageGenerationTaskSource;
  triggerType: ImageTriggerType;
  provider: ImageGenerationConfig['provider'];
  profileName?: string;
  model: string;
  width: number;
  height: number;
  requestedWidth?: number;
  requestedHeight?: number;
  requestSize?: string;
  prompt: string;
  promptHash: string;
  imageRef?: string;
  error?: string;
  httpStatus?: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
}

export const imageGenerationTaskHistoryLimit = 100;

export function createImageGenerationTaskId(now = Date.now(), random = Math.random()) {
  return `image-task-${now.toString(36)}-${random.toString(36).slice(2, 9)}`;
}

export function hashImageTaskPrompt(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function normalizeImageGenerationTasks(value: unknown, now = Date.now()): ImageGenerationTask[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is ImageGenerationTask => Boolean(item && typeof item === 'object' && typeof item.id === 'string'))
    .map((item) => {
      const interrupted = item.status === 'queued' || item.status === 'running';
      return {
        ...item,
        status: interrupted ? 'interrupted' as const : item.status,
        error: interrupted ? '应用刷新或关闭，任务已中断，未自动重试。' : item.error,
        completedAt: interrupted ? now : item.completedAt,
        durationMs: interrupted && item.startedAt ? Math.max(0, now - item.startedAt) : item.durationMs,
      };
    })
    .slice(0, imageGenerationTaskHistoryLimit);
}
