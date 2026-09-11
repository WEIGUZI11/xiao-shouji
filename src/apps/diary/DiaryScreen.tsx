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
import type { Character, DiaryEntry } from '../../store';
import { useAppStore } from '../../store';
import { buildXiaohongshuContext } from '../xiaohongshu/xiaohongshuLogic';
import { buildDiaryReviewUserMessage, getDiaryReviewMaxTokens } from './diaryReview';

type DiaryTab = 'user' | 'char' | 'favorite';
type DiaryDraft = Pick<DiaryEntry, 'owner' | 'title' | 'content'>;

const emptyDiaryDraft = (owner: DiaryEntry['owner'] = 'user'): DiaryDraft => ({
  owner,
  title: '',
  content: '',
});

function formatDiaryDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
}

function getDiarySummary(entry: DiaryEntry) {
  return entry.content.replace(/\s+/g, ' ').slice(0, 62) || '还没有正文';
}

export function DiaryScreen() {
  const {
    characters,
    chatSessions,
    wechatMoments,
    purchaseRecords,
    memos,
    xiaohongshuNotes,
    diaries,
    addDiary,
    updateDiary,
    deleteDiary,
    apiBaseUrl,
    apiKey,
    selectedModel,
    chatTemperature,
    chatMaxTokens,
    appPresets,
  } = useAppStore();
  const [tab, setTab] = useState<DiaryTab>('user');
  const [view, setView] = useState<'list' | 'edit' | 'detail'>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DiaryDraft>(() => emptyDiaryDraft('user'));
  const [charWriterId, setCharWriterId] = useState('');
  const [reviewerIds, setReviewerIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [streamingDiaryId, setStreamingDiaryId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState('');

  const activeEntry = diaries.find((entry) => entry.id === activeId) || null;
  const characterById = (id?: string) => characters.find((character) => character.id === id);
  const tabs: Array<{ id: DiaryTab; label: string }> = [
    { id: 'user', label: '我的日记' },
    { id: 'char', label: 'char日记' },
    { id: 'favorite', label: '收藏' },
  ];
  const visibleEntries = diaries.filter((entry) =>
    tab === 'favorite' ? entry.owner === 'char' && entry.favorite : entry.owner === tab,
  );
  const favoriteGroups = characters
    .map((character) => ({
      character,
      entries: visibleEntries.filter((entry) => entry.characterId === character.id),
    }))
    .filter((group) => group.entries.length > 0);
  const unknownFavoriteEntries = tab === 'favorite'
    ? visibleEntries.filter((entry) => !entry.characterId || !characterById(entry.characterId))
    : [];
  const currentWriterId = charWriterId || characters[0]?.id || '';

  const openNewDraft = (owner: DiaryEntry['owner']) => {
    setActiveId(null);
    setDraft(emptyDiaryDraft(owner));
    setReviewerIds(characters[0]?.id ? [characters[0].id] : []);
    setGenerationError('');
    setView('edit');
  };

  const openEdit = (entry: DiaryEntry) => {
    setActiveId(entry.id);
    setDraft({
      owner: entry.owner,
      title: entry.title,
      content: entry.content,
    });
    setReviewerIds((entry.reviews || (entry.review ? [entry.review] : []))
      .map((review) => review.characterId)
      .filter(Boolean) as string[]);
    setGenerationError('');
    setView('edit');
  };

  const writeOneUserReview = async (entry: Pick<DiaryEntry, 'title' | 'content'>, reader: Character) => {
    const createdAt = Date.now();
    if (!apiBaseUrl || !selectedModel) {
      return {
        characterId: reader.id,
        content: `${reader.name}读完后在下面留了一句：我看见了，今天这些不是小事。`,
        createdAt,
      };
    }
    try {
      const content = await requestChatCompletion({
        baseUrl: apiBaseUrl,
        apiKey,
        model: selectedModel,
        temperature: chatTemperature,
        maxTokens: getDiaryReviewMaxTokens(chatMaxTokens),
        messages: [
          {
            role: 'system',
            content: [
            getCharacterPrompt(reader) || `你是${reader.name}。`,
              appPresets.diary.prompt,
              '你刚读完用户写的一篇私人日记。请只写一段批注式评价，不展开对话，不提“作为AI”，不要复述全文。语气要像你本人在日记页下方留下的短评。',
            ].join('\n'),
          },
          {
            role: 'user',
            content: buildDiaryReviewUserMessage(entry),
          },
        ],
      });
      return {
        characterId: reader.id,
        content: content.trim() || `${reader.name}读完了，但什么也没写下。`,
        createdAt,
      };
    } catch (error) {
      return {
        characterId: reader.id,
        content: `${reader.name}读完了，但批注暂时写不出来。${error instanceof Error ? `（${error.message}）` : ''}`,
        createdAt,
      };
    }
  };

  const writeUserReviews = async (entry: Pick<DiaryEntry, 'title' | 'content'>) => {
    const readers = (reviewerIds.length > 0 ? reviewerIds : characters[0]?.id ? [characters[0].id] : [])
      .map((id) => characterById(id))
      .filter(Boolean) as Character[];
    if (readers.length === 0) {
      return [{ content: '还没有 char 能读这篇日记。', createdAt: Date.now() }];
    }
    return Promise.all(readers.map((reader) => writeOneUserReview(entry, reader)));
  };

  const saveDraft = async () => {
    const content = draft.content.trim();
    if (!content) return;
    const id = activeId || createId('diary');
    const now = Date.now();
    const payload = {
      owner: draft.owner,
      title: draft.title.trim() || content.slice(0, 18),
      content,
      tags: [],
      source: 'manual' as const,
    };
    if (activeId) {
      updateDiary(activeId, payload);
    } else {
      addDiary({ ...payload, id, createdAt: now, updatedAt: now });
    }
    setActiveId(id);
    setTab('user');
    setView('detail');
    setDraft(emptyDiaryDraft('user'));
    setReviewingId(id);
    const reviews = await writeUserReviews(payload);
    updateDiary(id, { review: reviews[0], reviews });
    setReviewingId(null);
  };

  const generateCharDiary = async () => {
    const character = characterById(currentWriterId);
    if (!character) {
      setGenerationError('先选择一个角色。');
      return;
    }
    if (!apiBaseUrl || !selectedModel) {
      setGenerationError('先在设置里填好接口地址和模型。');
      return;
    }
    setIsGenerating(true);
    setGenerationError('');
    const id = createId('diary');
    const createdAt = Date.now();
    addDiary({
      id,
      owner: 'char',
      characterId: character.id,
      title: `${character.name}的日记`,
      content: '',
      tags: ['char'],
      source: 'manual',
      createdAt,
      updatedAt: createdAt,
    });
    setActiveId(id);
    setTab('char');
    setView('detail');
    setStreamingDiaryId(id);
    try {
      const recentMessages = Object.values(chatSessions)
        .filter((session) => session.characterId === character.id)
        .flatMap((session) => session.messages.slice(-12).map((message) => `${message.role === 'user' ? '用户' : character.name}：${describeChatMessage(message, true, characters)}`))
        .slice(-24)
        .join('\n');
      const moments = wechatMoments.slice(0, 8).map((moment) => `朋友圈：${moment}`).join('\n');
      const xiaohongshuContext = buildXiaohongshuContext(xiaohongshuNotes, 8);
      const orders = purchaseRecords.slice(0, 6).map((record) => `订单：${record.itemName} ${record.amount} ${record.note}`).join('\n');
      const notes = memos
        .filter((memo) => !memo.locked)
        .slice(0, 5)
        .map((memo) => `备忘录：${memo.title}：${memo.content}`)
        .join('\n');
      const userDiarySummary = diaries
        .filter((entry) => entry.owner === 'user')
        .slice(0, 3)
        .map((entry) => `${entry.title}：${getDiarySummary(entry)}`)
        .join('\n');
      let streamedContent = '';
      const messages = [
        {
          role: 'system' as const,
          content: [
            getCharacterPrompt(character) || `你是${character.name}。`,
            appPresets.diary.prompt,
            '请按角色自己的口吻写一篇今天的私人日记。只输出日记正文，不写解释，不复述完整聊天记录，要写感受、误解、惦记和下一步想做什么。',
            '篇幅写到 800 到 1200 个中文字，像真的在手机里认真写日记，不要只写摘要。',
          ].join('\n'),
        },
        {
          role: 'user' as const,
          content: [
            recentMessages ? `近期聊天：\n${recentMessages}` : '近期聊天：暂无。',
            moments ? `微信/朋友圈内容：\n${moments}` : '微信/朋友圈内容：暂无。',
            xiaohongshuContext,
            orders ? `订单与生活事件：\n${orders}` : '订单与生活事件：暂无。',
            notes ? `备忘录：\n${notes}` : '备忘录：暂无。',
            userDiarySummary ? `用户近期日记摘要：\n${userDiarySummary}` : '用户近期日记摘要：暂无。',
          ].join('\n\n'),
        },
      ];
      const content = await requestChatCompletionStream({
        baseUrl: apiBaseUrl,
        apiKey,
        model: selectedModel,
        temperature: chatTemperature,
        messages,
        onToken: (token) => {
          streamedContent += token;
          updateDiary(id, { content: streamedContent });
        },
      });
      updateDiary(id, { content: content.trim() || streamedContent.trim() || 'TA 今天没有写出内容。' });
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : '生成失败');
      updateDiary(id, { content: `生成失败：${error instanceof Error ? error.message : '未知错误'}` });
    } finally {
      setIsGenerating(false);
      setStreamingDiaryId(null);
    }
  };

  const showDetail = (entry: DiaryEntry) => {
    setActiveId(entry.id);
    setView('detail');
  };

  if (view === 'detail' && activeEntry) {
    const character = characterById(activeEntry.characterId);
    const entryReviews = activeEntry.reviews || (activeEntry.review ? [activeEntry.review] : []);
    const toggleFavorite = () => updateDiary(activeEntry.id, { favorite: !activeEntry.favorite });
    return (
      <section className="diary-detail-screen h-full overflow-x-hidden overflow-y-auto pb-8">
        <Header title={activeEntry.owner === 'char' ? 'char日记' : '我的日记'} onBack={() => setView('list')} />
        <Panel className="!mx-auto max-w-[320px]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-[#111]/45">{formatDiaryDate(activeEntry.createdAt)}</p>
              <h2 className="text-xl font-black leading-tight">{activeEntry.title}</h2>
            </div>
            {character && <img src={character.avatar} alt={character.name} className="h-11 w-11 rounded-full border-[2px] border-[#111] object-cover" />}
          </div>
          <p className="whitespace-pre-wrap break-words text-sm font-bold leading-relaxed">
            {activeEntry.content || (streamingDiaryId === activeEntry.id ? 'TA 正在写...' : '还没有正文')}
          </p>
        </Panel>
        {activeEntry.owner === 'user' && (
          <Panel className="!mx-auto max-w-[320px]">
            {reviewingId === activeEntry.id && <p className="text-sm font-black text-[#111]/65">TA 们正在读这篇日记...</p>}
            {reviewingId !== activeEntry.id && entryReviews.length === 0 && <p className="text-sm font-black text-[#111]/65">还没有批注。</p>}
            {entryReviews.map((review, index) => {
              const reviewCharacter = characterById(review.characterId) || characters[0];
              return (
                <article key={`${review.characterId || 'review'}-${index}`} className="border-b-[2px] border-[#111]/10 py-2 last:border-b-0">
                  <p className="mb-1 text-xs font-black text-[#111]/45">{reviewCharacter ? `${reviewCharacter.name}的批注` : 'char批注'}</p>
                  <p className="whitespace-pre-wrap break-words text-sm font-black leading-relaxed text-[#111]/75">{review.content}</p>
                </article>
              );
            })}
          </Panel>
        )}
        <div className="flex justify-center gap-3 px-4">
          {activeEntry.owner === 'user' && <button onClick={() => openEdit(activeEntry)} className="save-button min-w-16 px-4 text-xs">编辑</button>}
          <button onClick={toggleFavorite} className={cn('save-button min-w-16 px-4 text-xs', activeEntry.favorite && 'bg-[#fff0bd]')}>
            {activeEntry.favorite ? '已收藏' : '收藏'}
          </button>
          <button onClick={() => (deleteDiary(activeEntry.id), setView('list'))} className="save-button min-w-16 bg-[#ffd8d8] px-4 text-xs">删除</button>
        </div>
      </section>
    );
  }

  if (view === 'edit') {
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        <Header title={activeId ? '编辑我的日记' : '写日记'} onBack={() => setView('list')} onSave={saveDraft} saveLabel="提交" />
        <Panel>
          <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="hand-input mb-3 w-full" placeholder="标题" />
          <textarea value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="正文" className="hand-input min-h-56 w-full" />
          <div className="mt-3">
            <p className="mb-2 text-xs font-black text-[#111]/50">选择谁来批注</p>
            {characters.length === 0 && <p className="text-sm font-black text-[#111]/55">导入角色后可以选择批注人。</p>}
            <div className="flex flex-wrap gap-2">
              {characters.map((character) => {
                const active = reviewerIds.includes(character.id);
                return (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => setReviewerIds((ids) => active ? ids.filter((id) => id !== character.id) : [...ids, character.id])}
                    className={cn('pill px-3 py-2 text-xs', active && 'active')}
                  >
                    {character.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setView('list')} className="fetch-button bg-[#f2f2f2]">取消</button>
            <button onClick={saveDraft} className="fetch-button">提交</button>
          </div>
        </Panel>
      </section>
    );
  }

  return (
    <section className="h-full overflow-y-auto pb-8">
      <Header title="日记" />
      <div className="mb-3 flex gap-2 overflow-x-auto px-6 pb-1">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`pill ${tab === item.id ? 'active' : ''}`}>
            {item.label}
          </button>
        ))}
      </div>
      <Panel>
        {tab === 'user' ? (
          <button onClick={() => openNewDraft('user')} className="fetch-button">写日记</button>
        ) : tab === 'char' ? (
          <>
            <select value={currentWriterId} onChange={(event) => setCharWriterId(event.target.value)} className="hand-input mb-3 w-full">
              <option value="">选择角色</option>
              {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
            </select>
            <button onClick={generateCharDiary} disabled={isGenerating} className="fetch-button disabled:opacity-60">{isGenerating ? '生成中...' : '让 TA 写日记'}</button>
            {generationError && <p className="mt-2 text-xs font-black text-[#b91c1c]">{generationError}</p>}
          </>
        ) : (
          <p className="text-sm font-black text-[#111]/60">收藏的 char 日记会按角色分组放在这里。</p>
        )}
      </Panel>
      <Panel>
        {visibleEntries.length === 0 && (
          <p className="text-sm font-black text-[#111]/55">
            {tab === 'user' ? '还没有我的日记。' : tab === 'char' ? '还没有char日记。' : '还没有收藏的char日记。'}
          </p>
        )}
        {tab === 'favorite' && favoriteGroups.map((group) => (
          <section key={group.character.id} className="border-b-[2px] border-[#111]/15 py-3 last:border-b-0">
            <div className="mb-2 flex items-center gap-2">
              <img src={group.character.avatar} alt={group.character.name} className="h-8 w-8 rounded-full border-[2px] border-[#111] object-cover" />
              <h3 className="text-sm font-black">{group.character.name}</h3>
            </div>
            {group.entries.map((entry) => (
              <button key={entry.id} onClick={() => showDetail(entry)} className="block w-full rounded-2xl px-2 py-2 text-left hover:bg-[#111]/5">
                <p className="text-xs font-black text-[#111]/45">{formatDiaryDate(entry.createdAt)}</p>
                <h4 className="text-base font-black">{entry.title}</h4>
                <p className="mt-1 text-sm font-bold leading-relaxed text-[#111]/70">{getDiarySummary(entry)}</p>
              </button>
            ))}
          </section>
        ))}
        {tab === 'favorite' && unknownFavoriteEntries.length > 0 && (
          <section className="py-3">
            <h3 className="mb-2 text-sm font-black">未关联角色</h3>
            {unknownFavoriteEntries.map((entry) => (
              <button key={entry.id} onClick={() => showDetail(entry)} className="block w-full rounded-2xl px-2 py-2 text-left hover:bg-[#111]/5">
                <p className="text-xs font-black text-[#111]/45">{formatDiaryDate(entry.createdAt)}</p>
                <h4 className="text-base font-black">{entry.title}</h4>
                <p className="mt-1 text-sm font-bold leading-relaxed text-[#111]/70">{getDiarySummary(entry)}</p>
              </button>
            ))}
          </section>
        )}
        {tab !== 'favorite' && visibleEntries.map((entry) => {
          const character = characterById(entry.characterId);
          return (
            <button key={entry.id} onClick={() => showDetail(entry)} className="block w-full border-b-[2px] border-[#111]/15 py-3 text-left last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[#111]/45">{formatDiaryDate(entry.createdAt)}</p>
                  <h3 className="text-base font-black">{entry.title}</h3>
                </div>
                {character && <img src={character.avatar} alt={character.name} className="h-10 w-10 rounded-full border-[2px] border-[#111] object-cover" />}
              </div>
              <p className="mt-2 text-sm font-bold leading-relaxed text-[#111]/70">{getDiarySummary(entry)}</p>
              {entry.owner === 'user' && entry.review && <p className="mt-2 text-xs font-black text-[#111]/45">有批注</p>}
            </button>
          );
        })}
      </Panel>
    </section>
  );
}
