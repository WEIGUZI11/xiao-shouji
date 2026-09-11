import { requestNaiImage, resolveEffectiveImageRequestSize, type ImageGenerationConfig, type ImageTriggerType } from './naiImage';
import { saveImageAsset } from './imageAssetStore';
import { hashImageTaskPrompt, type ImageGenerationTaskSource } from './imageGenerationTasks';
import { PaidTaskBusyError, runPaidTask } from './paidTaskManager';
import { useAppStore } from '../store';

export class ImageGenerationDisabledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageGenerationDisabledError';
  }
}

export function assertImageGenerationAllowed({
  imageGenerationEnabled,
  proactiveImageGenerationEnabled,
  triggerType,
}: {
  imageGenerationEnabled: boolean;
  proactiveImageGenerationEnabled: boolean;
  triggerType: ImageTriggerType;
}) {
  if (!imageGenerationEnabled) {
    throw new ImageGenerationDisabledError('生图功能已关闭，请先在设置里开启。');
  }
  if (triggerType === 'proactive' && !proactiveImageGenerationEnabled) {
    throw new ImageGenerationDisabledError('主动生图已关闭，文字回复仍会正常发送。');
  }
}

export async function requestAppImage({
  config,
  prompt,
  triggerType,
  imageGenerationEnabled,
  proactiveImageGenerationEnabled,
  signal,
  timeoutMs,
  source = triggerType === 'proactive' ? 'proactive' : 'legacy',
  profileName,
}: {
  config: ImageGenerationConfig;
  prompt: string;
  triggerType: ImageTriggerType;
  imageGenerationEnabled: boolean;
  proactiveImageGenerationEnabled: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  source?: ImageGenerationTaskSource;
  profileName?: string;
}) {
  assertImageGenerationAllowed({ imageGenerationEnabled, proactiveImageGenerationEnabled, triggerType });
  const store = useAppStore.getState();
  const effectiveProfileName = profileName || (config.provider === 'custom'
    ? store.imageProviderConfigs.customProfiles.find((profile) => profile.id === store.imageProviderConfigs.activeCustomProfileId)?.name
    : undefined);
  const effectiveSize = resolveEffectiveImageRequestSize(config);
  const taskId = store.addImageGenerationTask({
    status: 'queued',
    source,
    triggerType,
    provider: config.provider,
    profileName: effectiveProfileName,
    model: config.model,
    width: effectiveSize.width,
    height: effectiveSize.height,
    requestedWidth: config.width,
    requestedHeight: config.height,
    requestSize: effectiveSize.label,
    prompt,
    promptHash: hashImageTaskPrompt(prompt),
    createdAt: Date.now(),
  });
  const startedAt = Date.now();
  try {
    return await runPaidTask({
      kind: 'image-generation',
      key: taskId,
      signal,
      run: async (paidSignal) => {
        useAppStore.getState().updateImageGenerationTask(taskId, { status: 'running', startedAt });
        const image = await requestNaiImage({ config, prompt, signal: paidSignal, timeoutMs });
        const imageRef = await saveImageAsset(image);
        const completedAt = Date.now();
        useAppStore.getState().updateImageGenerationTask(taskId, {
          status: 'success',
          imageRef,
          completedAt,
          durationMs: completedAt - startedAt,
        });
        return imageRef;
      },
    });
  } catch (error) {
    const completedAt = Date.now();
    const detail = error instanceof Error ? error.message : '生图失败。';
    useAppStore.getState().updateImageGenerationTask(taskId, {
      status: error instanceof DOMException && error.name === 'AbortError' ? 'interrupted' : 'failure',
      error: error instanceof PaidTaskBusyError ? '已有生图任务正在进行，本次没有调用接口。' : detail,
      httpStatus: typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : undefined,
      completedAt,
      durationMs: completedAt - startedAt,
    });
    throw error;
  }
}
