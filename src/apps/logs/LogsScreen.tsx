import { Copy, FileText, Search, TerminalSquare, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { Empty, Header, Panel } from '../shared/AppPrimitives';
import {
  buildLogCopyText,
  filterConsoleLogs,
  formatConsoleTime,
  getConsoleLogMeta,
  getLogDiagnostics,
  getLogDetailExcerpt,
  type ConsoleLogLevel,
} from './logConsole';

const filterTabs: Array<{ id: ConsoleLogLevel; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'error', label: '错误' },
  { id: 'ai', label: 'AI' },
  { id: 'generation', label: '生成' },
  { id: 'system', label: '系统' },
];

const toneClass = {
  danger: 'bg-[#ffd6d6] text-[#8f1d1d]',
  success: 'bg-[#dceecd] text-[#244b25]',
  ai: 'bg-[#f4edbd] text-[#5c4400]',
  tts: 'bg-[#cfe5ef] text-[#16465c]',
  music: 'bg-[#e8ddff] text-[#452775]',
  image: 'bg-[#e7f0ff] text-[#1d4f91]',
  info: 'bg-white/75 text-[#111]',
};

export function LogsScreen() {
  const { appLogs, clearAppLogs } = useAppStore();
  const [filter, setFilter] = useState<ConsoleLogLevel>('all');
  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState('');

  const visibleLogs = useMemo(() => filterConsoleLogs(appLogs, { level: filter, query }), [appLogs, filter, query]);
  const errorCount = appLogs.filter((log) => log.type === 'error').length;
  const aiCount = appLogs.filter((log) => log.type === 'ai' || /AI|模型|上下文/i.test(log.title)).length;

  const toggleLog = (id: string) => {
    setExpandedIds((current) => ({ ...current, [id]: !current[id] }));
  };

  const copyLog = async (id: string) => {
    const log = appLogs.find((item) => item.id === id);
    if (!log) return;
    try {
      await navigator.clipboard.writeText(buildLogCopyText(log));
      setStatus('已复制该条后台日志。');
    } catch {
      setStatus('当前环境不允许自动复制，可以展开后手动复制。');
    }
  };

  return (
    <section className="logs-app no-scrollbar h-full overflow-y-auto pb-8">
      <Header title="后台控制台" subtitle="像酒馆后台一样看请求、返回和报错" onSave={clearAppLogs} saveLabel="清空" />

      <Panel>
        <div className="grid grid-cols-3 gap-2 text-xs font-black">
          <span className="rounded-2xl border-[2px] border-[#111]/15 bg-white/75 px-3 py-2">总计 {appLogs.length}</span>
          <span className="rounded-2xl border-[2px] border-[#111]/15 bg-[#ffd6d6] px-3 py-2 text-[#8f1d1d]">错误 {errorCount}</span>
          <span className="rounded-2xl border-[2px] border-[#111]/15 bg-[#f4edbd] px-3 py-2">AI {aiCount}</span>
        </div>

        <label className="mt-3 flex items-center gap-2 rounded-2xl border-[2px] border-[#111] bg-white/75 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 opacity-60" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索 HTTP、模型名、prompt_hash、错误文本"
            className="min-w-0 flex-1 bg-transparent text-sm font-black outline-none"
          />
        </label>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                'shrink-0 rounded-full border-[2px] border-[#111] px-3 py-2 text-xs font-black',
                filter === tab.id ? 'bg-[var(--accent)]' : 'bg-white/70',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {status && <p className="mt-3 text-xs font-black opacity-65">{status}</p>}
      </Panel>

      <Panel>
        <div className="mb-3 flex items-center gap-2">
          <TerminalSquare className="h-5 w-5" />
          <p className="text-lg font-black">Console</p>
          <span className="ml-auto text-xs font-black opacity-55">{visibleLogs.length} 条</span>
        </div>

        {visibleLogs.length > 0 ? (
          <div className="overflow-hidden rounded-[18px] border-[3px] border-[#111] bg-[#171717] text-white shadow-[4px_4px_0_rgba(17,17,17,0.16)]">
            {visibleLogs.map((log) => {
              const meta = getConsoleLogMeta(log);
              const diagnostics = getLogDiagnostics(log);
              const expanded = Boolean(expandedIds[log.id]);
              return (
                <article key={log.id} className="border-b border-white/10 p-3 last:border-b-0">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggleLog(log.id)}
                      aria-expanded={expanded}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-black text-white/45">{formatConsoleTime(log.createdAt)}</span>
                        <span className={cn('rounded-full px-2 py-1 text-[10px] font-black', toneClass[meta.tone])}>{meta.level}</span>
                        <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-white/75">{meta.source}</span>
                        <span className="ml-auto text-[10px] font-black text-white/45">{expanded ? '收起' : '展开'}</span>
                      </div>
                      <h3 className="mt-2 text-sm font-black text-white">{log.title}</h3>
                      <p className="mt-1 line-clamp-2 font-mono text-[11px] leading-5 text-white/62">{getLogDetailExcerpt(log.detail, 150)}</p>
                      {diagnostics.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {diagnostics.slice(0, 4).map((item) => (
                            <span key={`${item.label}-${item.value}`} className="max-w-full rounded-full bg-white/10 px-2 py-1 font-mono text-[10px] font-black text-white/68">
                              {item.label}: {item.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyLog(log.id)}
                      aria-label="复制该条后台日志"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>

                  {expanded && (
                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/45 p-3 font-mono text-[11px] leading-5 text-white/82">
                      {log.detail || '无详情'}
                    </pre>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <Empty text={appLogs.length > 0 ? '没有匹配当前筛选的后台日志。' : '还没有后台记录。'} />
        )}
      </Panel>

      {appLogs.length > 0 && (
        <Panel>
          <button type="button" onClick={clearAppLogs} className="fetch-button bg-[#ffd6d6] text-[#8f1d1d]">
            <Trash2 className="h-5 w-5" />
            清空后台日志
          </button>
          <p className="mt-2 flex items-center gap-2 text-xs font-bold opacity-60">
            <FileText className="h-4 w-4" />
            这里只清空显示记录，不会删除聊天、图片、角色或设置。
          </p>
        </Panel>
      )}
    </section>
  );
}
