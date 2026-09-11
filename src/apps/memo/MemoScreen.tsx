import {
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock,
  Clapperboard,
  Copy,
  Droplets,
  FileText,
  Gift,
  Heart,
  Import,
  Image as ImageIcon,
  KeyRound,
  Link,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Palette,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  ShoppingBag,
  Shuffle,
  SmilePlus,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Undo2,
  Users,
  UserPlus,
  Video,
  Wand2,
  Zap,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { cn, createId } from '../../lib/utils';
import { Header, Panel, Pill, Field, Row, Empty, EmptyScreen, Avatar } from '../shared/AppPrimitives';
import { buildMemoWorldContext, delay, describeChatMessage, getCharacterPrompt, requestChatCompletion, requestChatCompletionStream } from '../shared/aiText';
import type { MemoEntry, MemoEntryColor, MemoEntryType } from '../../store';
import { useAppStore } from '../../store';

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateInput(time: number) {
  const date = new Date(time);
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function formatTimeInput(time?: number) {
  if (!time) return '';
  const date = new Date(time);
  return `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function formatDateLabel(time: number) {
  const date = new Date(time);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

type MemoTab = 'all' | 'pinned' | 'tag' | 'todo' | 'locked';
type MemoDraft = {
  title: string;
  content: string;
  type: MemoEntryType;
  tags: string[];
  color: MemoEntryColor;
  characterId: string;
  readableByChar: boolean;
  reminderDate: string;
  reminderTime: string;
  pinned: boolean;
  locked: boolean;
  completed: boolean;
};

const memoTypeLabels: Record<MemoEntryType, string> = {
  note: '普通',
  todo: '待办',
  idea: '灵感',
};

const memoColorClasses: Record<MemoEntryColor, string> = {
  yellow: 'bg-[#fff0b8]',
  green: 'bg-[#dceecd]',
  blue: 'bg-[#d9e8f6]',
  pink: 'bg-[#ffe1ec]',
  white: 'bg-white/70',
};

function formatDiaryDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
}

function emptyMemoDraft(): MemoDraft {
  return {
    title: '',
    content: '',
    type: 'note',
    tags: [],
    color: 'yellow',
    characterId: '',
    readableByChar: true,
    reminderDate: '',
    reminderTime: '',
    pinned: false,
    locked: false,
    completed: false,
  };
}

function memoDraftFromEntry(entry: MemoEntry): MemoDraft {
  const reminder = entry.reminderAt ? new Date(entry.reminderAt) : null;
  return {
    title: entry.title,
    content: entry.content,
    type: entry.type,
    tags: entry.tags,
    color: entry.color || 'yellow',
    characterId: entry.characterId || '',
    readableByChar: entry.readableByChar !== false,
    reminderDate: reminder ? formatDateInput(reminder.getTime()) : '',
    reminderTime: reminder ? formatTimeInput(reminder.getTime()) : '',
    pinned: Boolean(entry.pinned),
    locked: Boolean(entry.locked),
    completed: Boolean(entry.completed),
  };
}

function memoReminderFromDraft(draft: MemoDraft) {
  if (!draft.reminderDate) return undefined;
  return new Date(`${draft.reminderDate}T${draft.reminderTime || '09:00'}`).getTime();
}

function defaultCharMemoTime() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date.getTime();
}

function formatDateTimeInput(timestamp: number) {
  const date = new Date(timestamp);
  return `${formatDateInput(timestamp)}T${date.toTimeString().slice(0, 5)}`;
}

function getMemoSummary(entry: MemoEntry) {
  return entry.content.replace(/\s+/g, ' ').slice(0, 72) || '还没有正文';
}

function sortMemos(entries: MemoEntry[]) {
  return [...entries].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}

export function MemoScreen() {
  const {
    characters,
    memos,
    memoTags,
    addMemoEntry,
    updateMemoEntry,
    deleteMemoEntry,
    toggleMemoPinned,
    toggleMemoLocked,
    toggleMemoCompleted,
    addMemoTag,
    deleteMemoTag,
    addCalendarEvent,
    memoCharWriter,
    setMemoCharWriter,
  } = useAppStore();
  const [tab, setTab] = useState<MemoTab>('all');
  const [view, setView] = useState<'list' | 'edit' | 'detail' | 'tags' | 'char-settings'>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MemoDraft>(() => emptyMemoDraft());
  const [quickText, setQuickText] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [charMemoCharacterId, setCharMemoCharacterId] = useState(() => memoCharWriter.characterId || '');
  const [charMemoAt, setCharMemoAt] = useState(() => formatDateTimeInput(memoCharWriter.scheduledAt || defaultCharMemoTime()));
  const [charMemoStatus, setCharMemoStatus] = useState('');
  const activeMemo = memos.find((memo) => memo.id === activeId) || null;
  const filteredMemos = sortMemos(memos).filter((memo) => {
    if (tab === 'pinned') return memo.pinned;
    if (tab === 'tag') return selectedTag ? memo.tags.includes(selectedTag) : false;
    if (tab === 'todo') return memo.type === 'todo';
    if (tab === 'locked') return memo.locked;
    return true;
  });
  const visibleCount = memos.filter((memo) => !memo.locked).length;
  const emptyMemoText = tab === 'pinned'
    ? '还没有收藏备忘。'
    : tab === 'todo'
      ? '还没有待办备忘。'
      : tab === 'locked'
        ? '还没有锁定备忘。'
        : tab === 'tag'
          ? selectedTag ? `没有「${selectedTag}」标签的备忘。` : '先选择一个标签。'
          : '这里还没有备忘。';

  const openNew = (preset?: Partial<MemoDraft>) => {
    setActiveId(null);
    setDraft({ ...emptyMemoDraft(), ...preset });
    setView('edit');
  };
  const openEdit = (entry: MemoEntry) => {
    setActiveId(entry.id);
    setDraft(memoDraftFromEntry(entry));
    setView('edit');
  };
  const openDetail = (entry: MemoEntry) => {
    setActiveId(entry.id);
    setView('detail');
  };
  const saveMemo = () => {
    const content = draft.content.trim();
    if (!content) return;
    const payload = {
      title: draft.title.trim() || content.slice(0, 18),
      content,
      type: draft.type,
      tags: draft.tags,
      color: draft.color,
      characterId: draft.characterId || undefined,
      readableByChar: draft.locked ? false : draft.readableByChar,
      reminderAt: memoReminderFromDraft(draft),
      pinned: draft.pinned,
      locked: draft.locked,
      completed: draft.completed,
      source: 'manual' as const,
    };
    if (activeId) {
      updateMemoEntry(activeId, payload);
      setView('detail');
      return;
    }
    const id = addMemoEntry(payload);
    setActiveId(id);
    setView('detail');
  };
  const quickAdd = () => {
    const content = quickText.trim();
    if (!content) return;
    const id = addMemoEntry({
      title: content.slice(0, 18),
      content,
      type: 'note',
      tags: [],
      color: 'yellow',
      readableByChar: true,
      source: 'manual',
    });
    setQuickText('');
    setActiveId(id);
  };
  const toggleDraftTag = (tag: string) => {
    setDraft((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag],
    }));
  };
  const createTag = () => {
    const tag = tagDraft.trim();
    if (!tag) return;
    addMemoTag(tag);
    setDraft((current) => current.tags.includes(tag) ? current : { ...current, tags: [...current.tags, tag] });
    setTagDraft('');
  };
  const sendMemoToCalendar = (entry: MemoEntry) => {
    const startAt = entry.reminderAt || Date.now();
    addCalendarEvent({
      owner: 'user',
      title: entry.title,
      note: entry.content,
      startAt,
      allDay: !entry.reminderAt,
      repeat: 'none',
      reminderAt: entry.reminderAt,
      tags: entry.tags.length > 0 ? entry.tags : ['备忘录'],
      source: 'memo',
      relatedDiaryIds: [],
      relatedMessageIds: [],
      favorite: false,
    });
  };
  const saveCharMemoSettings = () => {
    const character = characters.find((item) => item.id === charMemoCharacterId) || characters[0];
    if (!character) {
      setCharMemoStatus('先导入或选择一个角色。');
      return;
    }
    const reminderAt = new Date(charMemoAt || formatDateTimeInput(defaultCharMemoTime())).getTime();
    const scheduledAt = Number.isNaN(reminderAt) ? defaultCharMemoTime() : reminderAt;
    setMemoCharWriter({
      characterId: character.id,
      scheduledAt,
      enabled: true,
      lastRunAt: undefined,
    });
    setCharMemoStatus(`已设置：${character.name} 会在 ${new Date(scheduledAt).toLocaleString('zh-CN')} 写备忘。`);
  };

  if (view === 'edit') {
    return (
      <section className="h-full overflow-y-auto pb-8">
        <Header title={activeId ? '编辑备忘' : '新增备忘'} subtitle="标题、正文、标签和提醒" onBack={() => setView(activeId ? 'detail' : 'list')} onSave={saveMemo} saveLabel={activeId ? '更新' : '添加'} />
        <Panel>
          <Field icon={<FileText />} label="标题">
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="hand-input w-full" placeholder="可留空，自动取正文开头" />
          </Field>
          <Field icon={<BookOpen />} label="正文">
            <textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} className="hand-input min-h-[150px] w-full resize-none" placeholder="写下要记住的事" />
          </Field>
          <Field icon={<Sparkles />} label="类型">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(memoTypeLabels) as MemoEntryType[]).map((type) => (
                <button key={type} onClick={() => setDraft({ ...draft, type })} className={cn('pill w-full', draft.type === type && 'active')}>{memoTypeLabels[type]}</button>
              ))}
            </div>
          </Field>
          <Field icon={<Palette />} label="颜色">
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(memoColorClasses) as MemoEntryColor[]).map((color) => (
                <button key={color} onClick={() => setDraft({ ...draft, color })} aria-label={color} className={cn('h-10 rounded-2xl border-[3px] border-[#111]', memoColorClasses[color], draft.color === color && 'ring-4 ring-[#111]/20')} />
              ))}
            </div>
          </Field>
          <Field icon={<Tag />} label="标签">
            <div className="flex flex-wrap gap-2">
              {memoTags.map((tag) => (
                <button key={tag} onClick={() => toggleDraftTag(tag)} className={cn('pill', draft.tags.includes(tag) && 'active')}>{tag}</button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_74px] gap-2">
              <input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} className="hand-input min-w-0" placeholder="新标签" />
              <button onClick={createTag} className="save-button w-full">添加</button>
            </div>
          </Field>
          <Field icon={<CalendarDays />} label="提醒">
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={draft.reminderDate} onChange={(event) => setDraft({ ...draft, reminderDate: event.target.value })} className="hand-input w-full" />
              <input type="time" value={draft.reminderTime} onChange={(event) => setDraft({ ...draft, reminderTime: event.target.value })} className="hand-input w-full" />
            </div>
          </Field>
          <Field icon={<CircleUserRound />} label="查手机可见">
            <select value={draft.characterId} onChange={(event) => setDraft({ ...draft, characterId: event.target.value })} className="hand-input mb-3 w-full">
              <option value="">所有 char / 未指定</option>
              {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDraft({ ...draft, readableByChar: !draft.readableByChar })} className={cn('pill w-full', draft.readableByChar && !draft.locked && 'active')}>允许查看</button>
              <button onClick={() => setDraft({ ...draft, locked: !draft.locked, readableByChar: draft.locked ? draft.readableByChar : false })} className={cn('pill w-full', draft.locked && 'active')}>锁定</button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setDraft({ ...draft, pinned: !draft.pinned })} className={cn('pill w-full', draft.pinned && 'active')}>收藏</button>
            <button onClick={() => setDraft({ ...draft, completed: !draft.completed })} className={cn('pill w-full', draft.completed && 'active')}>完成</button>
          </div>
        </Panel>
      </section>
    );
  }

  if (view === 'detail' && activeMemo) {
    const character = characters.find((item) => item.id === activeMemo.characterId);
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        <Header title="备忘详情" subtitle={formatDiaryDate(activeMemo.updatedAt)} onBack={() => setView('list')} />
        <Panel className={memoColorClasses[activeMemo.color || 'yellow']}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn('text-2xl font-black leading-tight', activeMemo.completed && 'line-through opacity-60')}>{activeMemo.title}</p>
              <p className="mt-2 text-xs font-black opacity-60">{memoTypeLabels[activeMemo.type]} · {activeMemo.locked ? '已锁定' : activeMemo.readableByChar ? '查手机可见' : '仅自己可见'}{character ? ` · ${character.name}` : ''}</p>
            </div>
            <button onClick={() => toggleMemoPinned(activeMemo.id)} className={cn('circle-button small shrink-0', activeMemo.pinned && 'bg-[#fff0b8]')}>
              <Star className={cn('h-5 w-5', activeMemo.pinned && 'fill-[#111]')} />
            </button>
          </div>
          <p className="mt-5 whitespace-pre-wrap rounded-2xl bg-white/55 p-4 text-sm font-bold leading-7">{activeMemo.locked ? '这条备忘已锁定。' : activeMemo.content}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {activeMemo.tags.map((tag) => <span key={tag} className="rounded-full border-[2px] border-[#111] bg-white/70 px-3 py-1 text-xs font-black">{tag}</span>)}
            {activeMemo.reminderAt && <span className="rounded-full border-[2px] border-[#111] bg-white/70 px-3 py-1 text-xs font-black">提醒 {formatDateLabel(activeMemo.reminderAt)} {formatTimeInput(activeMemo.reminderAt)}</span>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button onClick={() => openEdit(activeMemo)} className="fetch-button">编辑</button>
            <button onClick={() => toggleMemoCompleted(activeMemo.id)} className="fetch-button bg-[#edf7ed]">{activeMemo.completed ? '取消完成' : '完成'}</button>
            <button onClick={() => toggleMemoLocked(activeMemo.id)} className="fetch-button">{activeMemo.locked ? '解锁' : '锁定'}</button>
            <button onClick={() => sendMemoToCalendar(activeMemo)} className="fetch-button bg-[#fff0bd]">转日历</button>
            <button onClick={() => { deleteMemoEntry(activeMemo.id); setActiveId(null); setView('list'); }} className="fetch-button bg-[#ffd6d6]">
              删除
            </button>
          </div>
        </Panel>
      </section>
    );
  }

  if (view === 'char-settings') {
    const selectedCharacter = characters.find((item) => item.id === charMemoCharacterId) || characters.find((item) => item.id === memoCharWriter.characterId) || characters[0];
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        <Header title="char 备忘设置" subtitle="到点自动综合最近内容生成" onBack={() => setView('list')} onSave={saveCharMemoSettings} saveLabel="保存" />
        <Panel>
          <Field icon={<Bot />} label="固定角色">
            <select value={charMemoCharacterId || memoCharWriter.characterId || ''} onChange={(event) => setCharMemoCharacterId(event.target.value)} className="hand-input w-full">
              <option value="">默认第一个角色</option>
              {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
            </select>
          </Field>
          <Field icon={<CalendarDays />} label="生成时间">
            <input type="datetime-local" value={charMemoAt} onChange={(event) => setCharMemoAt(event.target.value)} className="hand-input w-full" />
          </Field>
          <div className="rounded-2xl bg-white/60 p-4 text-sm font-black leading-7 opacity-75">
            到这个时间后，{selectedCharacter?.name || 'char'} 会根据最近聊天、朋友圈、小红书笔记、日记、日历、相册、订单和已有备忘写一条新备忘。生成后会自动收藏。
          </div>
          <button onClick={saveCharMemoSettings} className="fetch-button mt-4 bg-[#fff0bd]">
            <Bot className="h-5 w-5" />
            保存定时
          </button>
          {memoCharWriter.enabled && memoCharWriter.scheduledAt && (
            <p className="mt-3 text-xs font-black opacity-60">当前启用：{new Date(memoCharWriter.scheduledAt).toLocaleString('zh-CN')}</p>
          )}
          {charMemoStatus && <p className="mt-3 text-xs font-black opacity-60">{charMemoStatus}</p>}
        </Panel>
      </section>
    );
  }

  if (view === 'tags') {
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        <Header title="标签管理" subtitle="整理备忘录标签" onBack={() => setView('list')} />
        <Panel>
          <div className="grid grid-cols-[1fr_74px] gap-2">
            <input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} className="hand-input min-w-0" placeholder="新标签" />
            <button onClick={createTag} className="save-button w-full">添加</button>
          </div>
          <div className="mt-4 grid gap-2">
            {memoTags.map((tag) => (
              <div key={tag} className="flex items-center justify-between gap-3 border-b-[2px] border-[#111]/15 py-3 last:border-b-0">
                <span className="text-sm font-black">{tag}</span>
                <button onClick={() => deleteMemoTag(tag)} className="circle-button small"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    );
  }

  return (
    <section className="no-scrollbar h-full overflow-y-auto pb-8">
      <Header
        title="备忘录"
        subtitle={`${memos.length} 条备忘 · ${visibleCount} 条可给 char 看`}
        onSave={() => openNew()}
        tabsClassName="compact-tab-grid"
        saveLabel="新增"
        tabs={
          <>
            <Pill active={tab === 'all'} icon={<FileText />} label="全部" onClick={() => setTab('all')} />
            <Pill active={tab === 'pinned'} icon={<Star />} label="收藏" onClick={() => setTab('pinned')} />
            <Pill active={tab === 'tag'} icon={<Tag />} label="标签" onClick={() => setTab('tag')} />
            <Pill active={tab === 'todo'} icon={<Check />} label="待办" onClick={() => setTab('todo')} />
            <Pill active={tab === 'locked'} icon={<LockKeyhole />} label="已锁" onClick={() => setTab('locked')} />
          </>
        }
      />
      {tab === 'all' && (
        <>
          <Panel>
            <textarea value={quickText} onChange={(event) => setQuickText(event.target.value)} placeholder="快速新增备忘..." className="hand-input min-h-[88px] w-full resize-none" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button onClick={quickAdd} className="fetch-button">
                <Plus className="h-5 w-5" />
                快速添加
              </button>
              <button onClick={() => setView('tags')} className="fetch-button bg-[#fff0bd]">
                <Tag className="h-5 w-5" />
                管理标签
              </button>
              <button onClick={() => setView('char-settings')} className="fetch-button col-span-2 bg-[#edf7ed]">
                <Bot className="h-5 w-5" />
                char 备忘设置
              </button>
            </div>
          </Panel>
        </>
      )}
      {tab === 'tag' && (
        <Panel>
          <p className="mb-3 text-lg font-black">按标签筛选</p>
          <div className="grid grid-cols-2 gap-2">
            {memoTags.map((tag) => (
              <button key={tag} onClick={() => setSelectedTag(tag)} className={cn('fetch-button py-3 text-sm', selectedTag === tag && 'bg-[#fff0bd]')}>
                <Tag className="h-4 w-4" />
                {tag}
              </button>
            ))}
          </div>
          {memoTags.length === 0 && <Empty text="还没有标签。" />}
        </Panel>
      )}
      <Panel>
        {filteredMemos.length === 0 && <Empty text={emptyMemoText} />}
        {filteredMemos.map((memo) => (
          <button key={memo.id} onClick={() => openDetail(memo)} className={cn('mb-3 block w-full rounded-2xl border-[2px] border-[#111]/15 p-4 text-left last:mb-0', memoColorClasses[memo.color || 'yellow'])}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cn('text-base font-black leading-tight', memo.completed && 'line-through opacity-55')}>{memo.locked ? '已锁定备忘' : memo.title}</p>
                <p className="mt-1 line-clamp-2 text-sm font-bold opacity-65">{memo.locked ? '内容已隐藏' : getMemoSummary(memo)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {memo.pinned && <Star className="h-4 w-4 fill-[#111]" />}
                {memo.locked && <LockKeyhole className="h-4 w-4" />}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">{memoTypeLabels[memo.type]}</span>
              {memo.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">{tag}</span>)}
              {memo.reminderAt && <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">{formatDateLabel(memo.reminderAt)}</span>}
            </div>
          </button>
        ))}
      </Panel>
    </section>
  );
}
