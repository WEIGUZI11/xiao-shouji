import { AlertCircle, CheckCircle2, Clock3, Copy, Image as ImageIcon, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { PersistentImage } from '../../components/PersistentImage';
import { requestAppImage } from '../../lib/appImageGeneration';
import type { ImageGenerationTask, ImageGenerationTaskSource } from '../../lib/imageGenerationTasks';
import type { ImageGenerationConfig } from '../../lib/naiImage';
import { cancelPaidTask, getPaidTaskSnapshot, subscribePaidTasks } from '../../lib/paidTaskManager';
import { useAppStore } from '../../store';
import { Empty, Header, Panel, Pill } from '../shared/AppPrimitives';

const sourceLabels: Record<ImageGenerationTaskSource, string> = {
  'settings-test': '设置测试',
  'wechat-chat': '微信聊天',
  'qq-chat': 'QQ聊天',
  'wechat-moments': '朋友圈',
  'qq-space': 'QQ空间',
  xiaohongshu: '小红书',
  gallery: '相册',
  proactive: 'char主动',
  legacy: '旧版本记录',
};

const statusLabels: Record<ImageGenerationTask['status'], string> = {
  queued: '排队中',
  running: '生成中',
  success: '成功',
  failure: '失败',
  interrupted: '已中断',
};

type Filter = 'all' | 'active' | 'success' | 'failure';

function configForTask(task: ImageGenerationTask, state: ReturnType<typeof useAppStore.getState>): ImageGenerationConfig {
  if (task.provider === 'novelai') return state.imageProviderConfigs.novelai;
  if (task.provider === 'comfyui') return state.imageProviderConfigs.comfyui;
  const profile = state.imageProviderConfigs.customProfiles.find((item) => item.name === task.profileName)
    || state.imageProviderConfigs.customProfiles.find((item) => item.id === state.imageProviderConfigs.activeCustomProfileId);
  return profile?.config || state.imageGenerationConfig;
}

export function ImageTasksScreen() {
  const {
    imageGenerationTasks,
    imageGenerationEnabled,
    proactiveImageGenerationEnabled,
    deleteImageGenerationTask,
    clearImageGenerationTasks,
  } = useAppStore(useShallow((state) => ({
    imageGenerationTasks: state.imageGenerationTasks,
    imageGenerationEnabled: state.imageGenerationEnabled,
    proactiveImageGenerationEnabled: state.proactiveImageGenerationEnabled,
    deleteImageGenerationTask: state.deleteImageGenerationTask,
    clearImageGenerationTasks: state.clearImageGenerationTasks,
  })));
  const [filter, setFilter] = useState<Filter>('all');
  const [retryingId, setRetryingId] = useState('');
  const [status, setStatus] = useState('任务记录只会手动删除；清除记录不会删除图片。');
  const paidTasks = useSyncExternalStore(subscribePaidTasks, getPaidTaskSnapshot, getPaidTaskSnapshot);
  const activeImageTaskId = paidTasks['image-generation']?.key || '';

  const visibleTasks = useMemo(() => imageGenerationTasks.filter((task) => {
    if (filter === 'active') return task.status === 'queued' || task.status === 'running';
    if (filter === 'success') return task.status === 'success';
    if (filter === 'failure') return task.status === 'failure' || task.status === 'interrupted';
    return true;
  }), [filter, imageGenerationTasks]);

  const retryTask = async (task: ImageGenerationTask) => {
    setRetryingId(task.id);
    setStatus('正在重新生成；本次会调用当前保存的对应服务商配置。');
    try {
      const state = useAppStore.getState();
      const base = configForTask(task, state);
      await requestAppImage({
        config: {
          ...base,
          model: task.model || base.model,
          width: task.requestedWidth || task.width,
          height: task.requestedHeight || task.height,
        },
        prompt: task.prompt,
        triggerType: 'manual',
        source: task.source === 'proactive' ? 'proactive' : task.source,
        profileName: task.profileName,
        imageGenerationEnabled,
        proactiveImageGenerationEnabled,
      });
      setStatus('重新生成完成，新结果已添加到任务历史。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '重新生成失败。');
    } finally {
      setRetryingId('');
    }
  };

  const clearHistory = () => {
    if (!window.confirm('确认清空全部生图任务记录？不会删除聊天、相册或动态里的图片。')) return;
    clearImageGenerationTasks();
    setStatus('任务记录已清空，图片资产没有被删除。');
  };

  return (
    <section className="no-scrollbar h-full overflow-y-auto pb-8">
      <Header
        title="生图任务"
        subtitle={`${imageGenerationTasks.length} 条历史`}
        tabs={(
          <>
            <Pill label="全部" icon={<ImageIcon />} active={filter === 'all'} onClick={() => setFilter('all')} />
            <Pill label="进行中" icon={<Clock3 />} active={filter === 'active'} onClick={() => setFilter('active')} />
            <Pill label="成功" icon={<CheckCircle2 />} active={filter === 'success'} onClick={() => setFilter('success')} />
            <Pill label="失败" icon={<AlertCircle />} active={filter === 'failure'} onClick={() => setFilter('failure')} />
          </>
        )}
      />
      <Panel>
        <p className="text-sm font-black leading-5 opacity-70">{status}</p>
        {activeImageTaskId && (
          <button
            type="button"
            className="fetch-button mt-3 bg-[#fff0bd]"
            onClick={() => {
              if (cancelPaidTask('image-generation')) setStatus('正在停止生图任务；APK 原生请求也会同步取消。');
            }}
          >
            <AlertCircle className="h-4 w-4" /> 停止当前生图
          </button>
        )}
        <button type="button" className="fetch-button mt-3 bg-[#ffd6d6]" onClick={clearHistory} disabled={!imageGenerationTasks.length}>
          <Trash2 className="h-4 w-4" /> 清空任务记录
        </button>
      </Panel>
      {visibleTasks.length === 0 ? <Empty text="这里还没有对应的生图任务。" /> : visibleTasks.map((task) => (
        <Panel key={task.id}>
          <div className="flex items-start gap-3">
            {task.imageRef ? (
              <PersistentImage src={task.imageRef} alt="生图结果" className="h-20 w-20 shrink-0 rounded-2xl border-[3px] border-[#111] object-cover" />
            ) : (
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-[3px] border-[#111] bg-white/70"><ImageIcon /></div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{sourceLabels[task.source]}</strong>
                <span className="rounded-full border-2 border-[#111] bg-white px-2 py-0.5 text-xs font-black">{statusLabels[task.status]}</span>
              </div>
              <p className="mt-1 text-xs font-bold opacity-60">
                {task.provider} · {task.model || '默认模型'} · 请求：{task.requestSize || `${task.width}×${task.height}`}
                {task.requestedWidth && task.requestedHeight && (task.requestedWidth !== task.width || task.requestedHeight !== task.height)
                  ? `（设置 ${task.requestedWidth}×${task.requestedHeight}）`
                  : ''}
              </p>
              <p className="mt-1 text-xs font-bold opacity-60">{new Date(task.createdAt).toLocaleString()} {typeof task.durationMs === 'number' ? `· ${(task.durationMs / 1000).toFixed(1)}秒` : ''}</p>
            </div>
          </div>
          <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm font-bold leading-5">{task.prompt}</p>
          {task.error && <p className="mt-2 rounded-xl bg-[#ffd6d6] p-2 text-xs font-black leading-5">{task.httpStatus ? `HTTP ${task.httpStatus} · ` : ''}{task.error}</p>}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" className="save-button" onClick={() => void navigator.clipboard?.writeText(task.prompt)}><Copy className="h-4 w-4" />提示词</button>
            <button type="button" className="save-button" disabled={Boolean(retryingId || activeImageTaskId)} onClick={() => void retryTask(task)}><RefreshCw className="h-4 w-4" />{retryingId === task.id ? '生成中' : '重画'}</button>
            <button type="button" className="save-button bg-[#ffd6d6]" onClick={() => deleteImageGenerationTask(task.id)}><Trash2 className="h-4 w-4" />记录</button>
          </div>
        </Panel>
      ))}
    </section>
  );
}
