import { Asterisk, ChevronDown, ChevronUp, Copy, GripVertical, Pencil, Pin, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { cn, createId } from '../../lib/utils';
import {
  chatPresetPlaceholderLabels,
  getChatPresetPlaceholderKind,
  isChatPresetPinnedEntry,
  moveChatPresetEntry,
  type ChatPresetEntry,
  type ChatPresetEntryRole,
} from '../wechat/presets/chatPresetEntries';

type EntryFilter = 'all' | 'enabled' | 'disabled';

const roleLabels: Record<ChatPresetEntryRole, string> = {
  system: '系统',
  user: '用户',
  assistant: 'AI 助手',
};

function isRpModeEntry(entry: Pick<ChatPresetEntry, 'id' | 'exclusiveGroup'>) {
  return entry.exclusiveGroup === 'small-phone-rp-mode'
    || entry.id === 'small-phone-short-rp'
    || entry.id === 'small-phone-long-rp';
}

export function ChatPresetEntriesEditor({ entries, onChange }: { entries: ChatPresetEntry[]; onChange: (entries: ChatPresetEntry[]) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<EntryFilter>('all');
  const [visibleLimit, setVisibleLimit] = useState(30);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragTargetRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; role: ChatPresetEntryRole; content: string }>({ name: '', role: 'system', content: '' });
  const enabledCount = entries.filter((entry) => entry.enabled).length;
  const dynamicEntryCount = entries.filter((entry) => isChatPresetPinnedEntry(entry)).length;
  const visibleEntries = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => filter === 'all' || (filter === 'enabled' ? entry.enabled : !entry.enabled))
    .filter(({ entry }) => !query.trim() || `${entry.name}\n${entry.content}`.toLowerCase().includes(query.trim().toLowerCase()));
  const displayedEntries = visibleEntries.slice(0, visibleLimit);

  useEffect(() => {
    setVisibleLimit(30);
  }, [query, filter]);

  const openEditor = (entry: ChatPresetEntry) => {
    setEditingId(entry.id);
    setDraft({ name: entry.name, role: entry.role, content: entry.content });
  };

  const saveEditor = () => {
    if (!editingId) return;
    onChange(entries.map((entry) => entry.id === editingId ? { ...entry, name: draft.name.trim() || '未命名条目', role: draft.role, content: draft.content } : entry));
    setEditingId(null);
  };

  const addEntry = () => {
    const entry: ChatPresetEntry = { id: createId('preset-entry'), name: '新条目', role: 'system', content: '', enabled: true };
    onChange([entry, ...entries]);
    openEditor(entry);
  };

  const duplicateEntry = (entry: ChatPresetEntry) => {
    if (isChatPresetPinnedEntry(entry) || isRpModeEntry(entry)) return;
    const index = entries.findIndex((item) => item.id === entry.id);
    const duplicate: ChatPresetEntry = { ...entry, id: createId('preset-entry'), name: `${entry.name} · 副本` };
    const next = [...entries];
    next.splice(index + 1, 0, duplicate);
    onChange(next);
    openEditor(duplicate);
  };

  const moveEntry = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= entries.length) return;
    const next = [...entries];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const reorderEntry = (movingId: string | null, targetId: string | null) => {
    if (!movingId || !targetId || movingId === targetId) return;
    onChange(moveChatPresetEntry(entries, movingId, targetId));
  };

  const resetDrag = () => {
    setDraggingId(null);
    setDragOverId(null);
    dragTargetRef.current = null;
  };

  const setDragTarget = (id: string | null) => {
    dragTargetRef.current = id;
    setDragOverId(id);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!draggingId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-preset-entry-id]');
    setDragTarget(target?.dataset.presetEntryId || null);
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    reorderEntry(draggingId, dragTargetRef.current);
    resetDrag();
  };

  const toggleEntry = (entry: ChatPresetEntry) => {
    if (isRpModeEntry(entry)) return;
    if (entry.exclusiveGroup && entry.enabled) return;
    const willEnable = !entry.enabled;
    onChange(entries.map((item) => {
      if (item.id === entry.id) return { ...item, enabled: willEnable };
      if (willEnable && entry.exclusiveGroup && item.exclusiveGroup === entry.exclusiveGroup) return { ...item, enabled: false };
      return item;
    }));
  };

  const deleteEntry = (id: string) => {
    const entry = entries.find((item) => item.id === id);
    if (!entry || isChatPresetPinnedEntry(entry) || isRpModeEntry(entry)) return;
    onChange(entries.filter((item) => item.id !== id));
    if (editingId === id) setEditingId(null);
    setPendingDeleteId(null);
  };

  return (
    <div className="mt-3 space-y-3" data-testid="chat-preset-entry-editor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black">预设条目 <span className="text-xs opacity-60">共 {entries.length} 条 · 已开启 {enabledCount} 条</span></p>
        <button type="button" className="preset-compact-button" onClick={addEntry}>＋ 新增条目</button>
      </div>
      {dynamicEntryCount > 0 && (
        <div className="preset-slot-notice rounded-xl border-2 border-emerald-500/30 bg-emerald-50/80 px-3 py-2 text-[11px] font-bold leading-5 text-emerald-950 dark:bg-emerald-950/25 dark:text-emerald-100">
          <Pin className="mr-1 inline h-3.5 w-3.5" />{dynamicEntryCount} 个图钉是人物、用户、世界信息和聊天记录的动态插槽：可以拖动、改发送身份和开关，但不能误删。普通星号条目可以复制或删除。
        </div>
      )}
      {entries.some((entry) => isRpModeEntry(entry)) && (
        <div className="preset-mode-notice rounded-xl border-2 border-sky-500/25 bg-sky-50/80 px-3 py-2 text-[11px] font-bold leading-5 text-sky-950 dark:bg-sky-950/25 dark:text-sky-100">
          短 RP / 长 RP 由上方“正在使用”控制：当前模式为绿色开启，另一个保持关闭；括号风格也只能开启一个。
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
        <input className="hand-input min-w-0" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索条目" />
        <select className="hand-input" value={filter} onChange={(event) => setFilter(event.target.value as EntryFilter)} aria-label="筛选预设条目">
          <option value="all">全部</option>
          <option value="enabled">只看已开启</option>
          <option value="disabled">只看已关闭</option>
        </select>
      </div>
      <div className="max-h-[55vh] space-y-1.5 overflow-y-auto pr-1">
        {displayedEntries.map(({ entry, index }) => {
          const placeholderKind = getChatPresetPlaceholderKind(entry);
          const pinned = Boolean(placeholderKind);
          const rpModeEntry = isRpModeEntry(entry);
          const isEditing = editingId === entry.id;
          return (
            <article
              key={entry.id}
              data-preset-entry-id={entry.id}
              className={cn('preset-entry-card text-left transition', draggingId === entry.id && 'opacity-45', dragOverId === entry.id && draggingId !== entry.id && 'preset-entry-drop-target')}
              onDragOver={(event) => { event.preventDefault(); setDragTarget(entry.id); }}
              onDrop={(event) => { event.preventDefault(); reorderEntry(draggingId || event.dataTransfer.getData('text/plain'), entry.id); resetDrag(); }}
            >
              <div className="flex min-h-11 items-center gap-1.5">
                <button
                  type="button"
                  draggable
                  className="preset-drag-handle"
                  title="按住拖动条目"
                  aria-label={`拖动 ${entry.name}`}
                  onDragStart={(event) => { setDraggingId(entry.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', entry.id); }}
                  onDragEnd={resetDrag}
                  onPointerDown={(event) => { if (event.pointerType === 'mouse') return; setDraggingId(entry.id); setDragTarget(entry.id); event.currentTarget.setPointerCapture(event.pointerId); }}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={resetDrag}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <span className={cn('preset-entry-kind', pinned && 'is-pinned')} title={pinned ? '动态插槽' : '普通提示词'}>
                  {pinned ? <Pin className="h-4 w-4" /> : <Asterisk className="h-4 w-4" />}
                </span>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => isEditing ? setEditingId(null) : openEditor(entry)}>
                  <strong className="block truncate text-[13px] leading-5">{entry.name}</strong>
                  <span className="block truncate text-[10px] leading-4 opacity-55">
                    {index + 1} · {roleLabels[entry.role]} · {placeholderKind ? chatPresetPlaceholderLabels[placeholderKind] : `${entry.content.length} 字`}
                    {entry.activeForReplyStyles ? ` · 仅${entry.activeForReplyStyles.map((style) => style === 'burst' ? '短RP' : style === 'single' ? '长RP' : '自动').join('/')}` : ''}
                  </span>
                </button>
                {!pinned && !rpModeEntry && <button type="button" className="preset-icon-button" onClick={() => duplicateEntry(entry)} aria-label={`复制 ${entry.name}`}><Copy className="h-3.5 w-3.5" /></button>}
                {!pinned && !rpModeEntry && (
                  <button type="button" className="preset-delete-button" onClick={() => setPendingDeleteId((id) => id === entry.id ? null : entry.id)} aria-label={`删除 ${entry.name}`} aria-expanded={pendingDeleteId === entry.id}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button type="button" className={cn('preset-icon-button', isEditing && 'is-active')} onClick={() => isEditing ? setEditingId(null) : openEditor(entry)} aria-label={`编辑 ${entry.name}`} aria-pressed={isEditing}><Pencil className="h-3.5 w-3.5" /></button>
                <button
                  type="button"
                  className={cn('preset-entry-toggle', entry.enabled && 'is-enabled')}
                  onClick={() => toggleEntry(entry)}
                  disabled={rpModeEntry}
                  title={rpModeEntry ? '请从上方“正在使用”切换短 RP / 长 RP' : undefined}
                  aria-label={rpModeEntry ? `${entry.name}由当前预设控制` : `${entry.enabled ? '关闭' : '启用'} ${entry.name}`}
                  aria-pressed={entry.enabled}
                >
                  <span />
                </button>
              </div>
              {pendingDeleteId === entry.id && !pinned && (
                <div className="preset-delete-confirm" role="alert">
                  <span className="min-w-0 flex-1 truncate">确定删除“{entry.name}”？</span>
                  <button type="button" onClick={() => deleteEntry(entry.id)}>确认删除</button>
                  <button type="button" onClick={() => setPendingDeleteId(null)}>取消</button>
                </div>
              )}
              {isEditing && (
                <div className="mt-2 space-y-2 border-t border-black/10 pt-2 dark:border-white/10">
                  <input className="hand-input w-full" value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} placeholder="条目名称" />
                  <div>
                    <p className="mb-1 text-[10px] font-black opacity-60">发送身份</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(Object.keys(roleLabels) as ChatPresetEntryRole[]).map((role) => (
                        <button key={role} type="button" className={cn('preset-role-button', draft.role === role && 'is-selected')} onClick={() => setDraft((value) => ({ ...value, role }))} aria-pressed={draft.role === role}>{roleLabels[role]}</button>
                      ))}
                    </div>
                  </div>
                  <textarea className="hand-input min-h-28 w-full resize-y" value={draft.content} onChange={(event) => setDraft((value) => ({ ...value, content: event.target.value }))} placeholder={pinned ? '动态资料会插在这里；留空即可，也可以在资料前追加固定说明' : '条目内容；留空时不会发送'} />
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="preset-compact-button" onClick={saveEditor}>保存</button>
                    <button type="button" className="preset-compact-button" onClick={() => setEditingId(null)}>取消</button>
                    <span className="ml-auto flex gap-1">
                      <button type="button" className="preset-icon-button" onClick={() => moveEntry(index, -1)} disabled={index === 0} aria-label={`上移 ${entry.name}`}><ChevronUp className="h-4 w-4" /></button>
                      <button type="button" className="preset-icon-button" onClick={() => moveEntry(index, 1)} disabled={index === entries.length - 1} aria-label={`下移 ${entry.name}`}><ChevronDown className="h-4 w-4" /></button>
                    </span>
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {visibleEntries.length === 0 && <div className="rounded-2xl border-2 border-dashed border-black/10 p-5 text-center text-sm font-bold opacity-60">没有符合条件的条目。</div>}
        {visibleEntries.length > displayedEntries.length && (
          <button type="button" className="preset-compact-button w-full" onClick={() => setVisibleLimit((value) => value + 30)}>
            再显示 30 条（剩余 {visibleEntries.length - displayedEntries.length} 条）
          </button>
        )}
      </div>
    </div>
  );
}
