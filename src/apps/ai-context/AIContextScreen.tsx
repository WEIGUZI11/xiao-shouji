import { Bot, CircleUserRound, Clock, Copy, FileText, MessageCircle, RotateCcw, Shield, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { Empty, Field, Header, Panel, Pill } from '../shared/AppPrimitives';
import {
  buildContextPackage,
  contextBudgetOptions,
  type ContextBudgetKey,
  type ContextRangeKey,
} from './contextPackage';
import {
  buildContextBudgetStats,
  buildPreviewRowKey,
  getPreviewRowExcerpt,
} from './aiContextPreview';

const rangeOptions: Array<{ id: ContextRangeKey; label: string; desc: string }> = [
  { id: 'today', label: '今天', desc: '从今天 00:00 到现在' },
  { id: '1d', label: '近 1 天', desc: '往前 24 小时' },
  { id: '3d', label: '近 3 天', desc: '短期连续剧情' },
  { id: '5d', label: '近 5 天', desc: '默认推荐范围' },
  { id: '7d', label: '近 7 天', desc: '一周总结范围' },
];

const budgetLabels: Record<ContextBudgetKey, string> = {
  light: '轻量',
  standard: '标准',
  full: '完整',
};

export function AIContextScreen() {
  const state = useAppStore(useShallow((store) => ({
    characters: store.characters,
    chatSessions: store.chatSessions,
    groupChats: store.groupChats,
    diaries: store.diaries,
    browserSearches: store.browserSearches,
    browserHistory: store.browserHistory,
    browserBookmarks: store.browserBookmarks,
    browserWorldBook: store.browserWorldBook,
    xiaohongshuNotes: store.xiaohongshuNotes,
    musicListenRecords: store.musicListenRecords,
    musicTracks: store.musicTracks,
    galleryPhotos: store.galleryPhotos,
    memos: store.memos,
    calendarEvents: store.calendarEvents,
    userName: store.userName,
    aiContextExcludedSectionsByCharacter: store.aiContextExcludedSectionsByCharacter,
    setAiContextSectionExcluded: store.setAiContextSectionExcluded,
    clearAiContextSectionExclusions: store.clearAiContextSectionExclusions,
    addAppLog: store.addAppLog,
  })));
  const { characters, addAppLog } = state;
  const [characterId, setCharacterId] = useState(characters[0]?.id || '');
  const [range, setRange] = useState<ContextRangeKey>('5d');
  const [budget, setBudget] = useState<ContextBudgetKey>('standard');
  const [wechatLimit, setWechatLimit] = useState(300);
  const [qqLimit, setQqLimit] = useState(200);
  const [status, setStatus] = useState('');
  const [expandedPreviewRows, setExpandedPreviewRows] = useState<Record<string, boolean>>({});
  const [showGeneratedContent, setShowGeneratedContent] = useState(false);
  const character = characters.find((item) => item.id === characterId) || characters[0];

  useEffect(() => {
    if (!characterId && characters[0]?.id) setCharacterId(characters[0].id);
  }, [characterId, characters]);

  const excludedSectionIds = character ? state.aiContextExcludedSectionsByCharacter[character.id] || [] : [];
  const contextPackage = useMemo(
    () => character
      ? buildContextPackage({ character, range, wechatLimit, qqLimit, excludedSectionIds, state: state as ReturnType<typeof useAppStore.getState> })
      : null,
    [character, excludedSectionIds, qqLimit, range, state, wechatLimit],
  );
  const budgetInfo = { ...contextBudgetOptions[budget], label: budgetLabels[budget] };
  const budgetStats = useMemo(() => buildContextBudgetStats(contextPackage?.text || '', budgetInfo), [budgetInfo.label, budgetInfo.max, budgetInfo.min, contextPackage?.text]);

  if (!character || !contextPackage) {
    return (
      <section className="ai-context-app no-scrollbar h-full overflow-y-auto pb-8">
        <Header title="AI 上下文" subtitle="先导入角色，再生成角色独立上下文" />
        <Panel>
          <Empty text="还没有角色。导入角色卡后，这里会按角色拆分微信、QQ、日记、音乐和浏览内容。" />
        </Panel>
      </section>
    );
  }

  const overBudget = budgetStats.status === 'over-budget';
  const overHardLimit = budgetStats.status === 'over-hard-limit';
  const hardLimitRemaining = Math.max(0, 60000 - budgetStats.chars);

  const togglePreviewRow = (key: string) => {
    setExpandedPreviewRows((current) => ({ ...current, [key]: !current[key] }));
  };

  const copyContext = async () => {
    try {
      await navigator.clipboard.writeText(contextPackage.text);
      setStatus('已复制上下文。');
    } catch {
      setStatus('浏览器不允许自动复制，可以先写入后台记录再手动复制。');
    }
  };

  const recordContext = () => {
    addAppLog({
      type: overHardLimit ? 'error' : 'ai',
      title: `AI上下文：${character.name}`,
      detail: [
        `角色：${character.name}`,
        `范围：${contextPackage.rangeLabel}`,
        `字符数：${budgetStats.chars}`,
        `估算 tokens：${budgetStats.estimatedTokens}`,
        `预算：${budgetInfo.label} / ${budgetInfo.max} 字`,
        `预算占用：${budgetStats.percentOfBudget}%`,
        `微信上限：${wechatLimit}`,
        `QQ上限：${qqLimit}`,
        '',
        contextPackage.text,
      ].join('\n'),
    });
    setStatus('已写入后台记录。');
  };

  return (
    <section className="ai-context-app no-scrollbar h-full overflow-y-auto pb-8">
      <Header title="AI 上下文" subtitle="按现实时间和当前角色生成记忆包" />
      <Panel>
        <Field icon={<CircleUserRound />} label="当前角色">
          <select value={character.id} onChange={(event) => setCharacterId(event.target.value)} className="hand-input w-full">
            {characters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field icon={<Clock />} label="现实时间范围">
          <div className="compact-tab-grid">
            {rangeOptions.map((item) => (
              <Pill key={item.id} icon={<Clock />} label={item.label} active={range === item.id} onClick={() => setRange(item.id)} />
            ))}
          </div>
          <p className="mt-2 text-xs font-bold opacity-60">{rangeOptions.find((item) => item.id === range)?.desc}</p>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field icon={<MessageCircle />} label="微信条数">
            <select value={wechatLimit} onChange={(event) => setWechatLimit(Number(event.target.value))} className="hand-input w-full">
              {[100, 300, 500, 1000].map((value) => <option key={value} value={value}>最近 {value} 条</option>)}
            </select>
          </Field>
          <Field icon={<Bot />} label="QQ条数">
            <select value={qqLimit} onChange={(event) => setQqLimit(Number(event.target.value))} className="hand-input w-full">
              {[100, 200, 300, 500, 1000].map((value) => <option key={value} value={value}>最近 {value} 条</option>)}
            </select>
          </Field>
        </div>
        <Field icon={<Shield />} label="上下文预算">
          <div className="compact-tab-grid">
            {(Object.keys(contextBudgetOptions) as ContextBudgetKey[]).map((id) => (
              <Pill key={id} icon={<Shield />} label={budgetLabels[id]} active={budget === id} onClick={() => setBudget(id)} />
            ))}
          </div>
        </Field>
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-black">发送预览</p>
            <p className="text-sm font-bold opacity-60">每一项都可以展开，查看实际会进入上下文的详情。</p>
          </div>
          <span className={cn('rounded-full border-[2px] border-[#111] px-3 py-1 text-xs font-black', overHardLimit ? 'bg-[#ffd6d6]' : overBudget ? 'bg-[#fff0b8]' : 'bg-white/70')}>
            {budgetStats.percentOfBudget}%
          </span>
        </div>
        {excludedSectionIds.length > 0 && (
          <button
            type="button"
            onClick={() => state.clearAiContextSectionExclusions(character.id)}
            className="fetch-button mt-3 bg-[#e7f4ff]"
          >
            <RotateCcw className="h-4 w-4" />恢复全部已排除来源（{excludedSectionIds.length}）
          </button>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black">
          <span className="rounded-2xl bg-white/70 px-3 py-2">{budgetStats.chars} 字</span>
          <span className="rounded-2xl bg-white/70 px-3 py-2">约 {budgetStats.estimatedTokens} tokens</span>
          <span className="rounded-2xl bg-white/70 px-3 py-2">预算 {budgetInfo.max} 字</span>
          <span className="rounded-2xl bg-white/70 px-3 py-2">
            {budgetStats.overBudgetChars > 0 ? `超出 ${budgetStats.overBudgetChars} 字` : `剩余 ${budgetStats.remainingChars} 字`}
          </span>
        </div>
        <p className="mt-2 text-xs font-bold opacity-60">{budgetStats.summary}；60000 字硬上限还剩 {hardLimitRemaining} 字。</p>
        <div className="mt-4 overflow-hidden rounded-[18px] border-[3px] border-[#111] bg-white/65">
          {contextPackage.previewRows.map((row) => {
            const rowKey = buildPreviewRowKey(row);
            const expanded = Boolean(expandedPreviewRows[rowKey]);
            return (
              <article key={rowKey} className={cn('border-b-[2px] border-[#111]/15 p-3 text-xs font-bold last:border-b-0', row.excluded && 'bg-[#f3f3f3] opacity-65')}>
                <button
                  type="button"
                  onClick={() => togglePreviewRow(rowKey)}
                  aria-expanded={expanded}
                  className="grid w-full grid-cols-[74px_1fr_64px] gap-2 text-left"
                >
                  <span className="font-black">{row.app}{row.excluded ? '（已排除）' : ''}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{row.content}</span>
                    <span className="block opacity-55">{row.method} · {row.range}</span>
                    <span className="mt-1 block truncate opacity-70">{getPreviewRowExcerpt(row.detail, 72)}</span>
                  </span>
                  <span className="text-right">{expanded ? '收起' : '展开'}<br />{row.count} 条<br />{row.chars} 字</span>
                </button>
                {expanded && (
                  <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-[#111]/10 bg-white/80 p-3 text-[11px] leading-5">
                    {row.detail}
                  </pre>
                )}
                <button
                  type="button"
                  onClick={() => state.setAiContextSectionExcluded(character.id, row.sectionId, !row.excluded)}
                  className={cn('mt-2 inline-flex items-center gap-1 rounded-full border border-[#111]/20 px-2.5 py-1 text-[11px] font-black', row.excluded ? 'bg-[#dceecd]' : 'bg-[#ffd6d6]')}
                >
                  {row.excluded ? <RotateCcw className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                  {row.excluded ? '恢复到上下文' : '从上下文排除'}
                </button>
              </article>
            );
          })}
        </div>
        {overHardLimit && <p className="mt-3 text-sm font-black text-[#9d1f1f]">超过 60000 字硬上限，建议缩短时间范围或降低聊天条数。</p>}
        {!overHardLimit && overBudget && <p className="mt-3 text-sm font-black text-[#7a4b00]">超过当前预算档位，建议降低聊天条数、缩短范围，或改用完整档。</p>}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={copyContext} disabled={overHardLimit} className="fetch-button disabled:opacity-45">
            <Copy className="h-5 w-5" />
            复制上下文
          </button>
          <button type="button" onClick={recordContext} className="fetch-button">
            <FileText className="h-5 w-5" />
            写入记录
          </button>
        </div>
        {status && <p className="mt-3 text-sm font-black opacity-70">{status}</p>}
      </Panel>

      <Panel>
        <button
          type="button"
          onClick={() => setShowGeneratedContent((current) => !current)}
          aria-expanded={showGeneratedContent}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="block text-lg font-black">生成内容</span>
            <span className="block text-xs font-bold opacity-60">完整 prompt，可折叠查看。</span>
          </span>
          <span className="rounded-full border-[2px] border-[#111] bg-white/70 px-3 py-1 text-xs font-black">
            {showGeneratedContent ? '收起' : '展开'}
          </span>
        </button>
        {showGeneratedContent && (
          <textarea readOnly value={contextPackage.text} className="hand-input mt-3 min-h-72 w-full resize-none text-xs leading-5" />
        )}
      </Panel>
    </section>
  );
}
