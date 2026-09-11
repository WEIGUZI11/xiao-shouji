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
import React, { useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Character, TheaterScene, TheaterWorldBookEntry } from '../../store';
import { useAppStore } from '../../store';
import { cn, createId } from '../../lib/utils';
import { Header, Panel, Pill, Field, Empty, Avatar } from '../shared/AppPrimitives';
import { getCharacterPrompt, requestChatCompletion } from '../shared/aiText';
import {
  buildTheaterOutputRule,
  buildTheaterResultStatus,
  appendTheaterContinuation,
  buildTheaterChatMessage,
  buildTheaterContinuationPrompt,
  buildTheaterSystemPrompt,
  buildTheaterUserPrompt,
  getRandomBlocks,
  getTheaterMaxTokens,
  parseTheaterTopicImport,
  parseWorldBookJson,
  resolveTavernRandom,
  rollWorldBookEntries,
  theaterLengthLabels,
} from './theaterLogic';

function formatDateLabel(time: number) {
  const date = new Date(time);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

type TheaterStyle = TheaterScene['style'];
type TheaterLength = TheaterScene['length'];
type TheaterView = 'create' | 'favorites' | 'history' | 'topics' | 'worldbook';

const theaterLengthShortLabels: Record<TheaterLength, string> = {
  short: '短',
  medium: '中',
  long: '长',
  custom: '自定',
};

const theaterLengthHints: Record<TheaterLength, string> = {
  short: '约 200-600 字',
  medium: '约 400-800 字',
  long: '约 800-1500 字',
  custom: '自定义字数',
};

export function TheaterScreen() {
  const {
    characters,
    theaterScenes,
    theaterTopicEntries,
    theaterWorldBookEntries,
    apiBaseUrl,
    apiKey,
    selectedModel,
    chatTemperature,
    addTheaterScene,
    updateTheaterScene,
    deleteTheaterScene,
    toggleTheaterSceneFavorite,
    addTheaterTopicEntry,
    importTheaterTopicEntries,
    deleteTheaterTopicEntry,
    toggleTheaterTopicFavorite,
    importTheaterWorldBookEntries,
    updateTheaterWorldBookEntry,
    deleteTheaterWorldBookEntry,
    addDiary,
    addMessage,
    openChat,
    appPresets,
  } = useAppStore(useShallow((state) => ({
    characters: state.characters,
    theaterScenes: state.theaterScenes,
    theaterTopicEntries: state.theaterTopicEntries,
    theaterWorldBookEntries: state.theaterWorldBookEntries,
    apiBaseUrl: state.apiBaseUrl,
    apiKey: state.apiKey,
    selectedModel: state.selectedModel,
    chatTemperature: state.chatTemperature,
    addTheaterScene: state.addTheaterScene,
    updateTheaterScene: state.updateTheaterScene,
    deleteTheaterScene: state.deleteTheaterScene,
    toggleTheaterSceneFavorite: state.toggleTheaterSceneFavorite,
    addTheaterTopicEntry: state.addTheaterTopicEntry,
    importTheaterTopicEntries: state.importTheaterTopicEntries,
    deleteTheaterTopicEntry: state.deleteTheaterTopicEntry,
    toggleTheaterTopicFavorite: state.toggleTheaterTopicFavorite,
    importTheaterWorldBookEntries: state.importTheaterWorldBookEntries,
    updateTheaterWorldBookEntry: state.updateTheaterWorldBookEntry,
    deleteTheaterWorldBookEntry: state.deleteTheaterWorldBookEntry,
    addDiary: state.addDiary,
    addMessage: state.addMessage,
    openChat: state.openChat,
    appPresets: state.appPresets,
  })));
  const worldBookInputRef = useRef<HTMLInputElement>(null);
  const topicInputRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState(theaterScenes[0]?.theme || '');
  const [length, setLength] = useState<TheaterLength>(theaterScenes[0]?.length || 'medium');
  const [customLengthText, setCustomLengthText] = useState(theaterScenes[0]?.customLengthText || '1200');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => theaterScenes[0]?.characterIds || (characters[0]?.id ? [characters[0].id] : []));
  const [actorsOpen, setActorsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [activeId, setActiveId] = useState<string | null>(theaterScenes[0]?.id || null);
  const [status, setStatus] = useState('');
  const [rollResult, setRollResult] = useState(theaterScenes[0]?.rollResult || '');
  const [worldBookOpenId, setWorldBookOpenId] = useState<string | null>(null);
  const [topicDraft, setTopicDraft] = useState('');
  const [topicCategory, setTopicCategory] = useState('默认');
  const [topicFilter, setTopicFilter] = useState('全部');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'favorite'>('all');
  const [theaterView, setTheaterView] = useState<TheaterView>('create');
  const [isGenerating, setIsGenerating] = useState(false);

  const activeScene = theaterScenes.find((scene) => scene.id === activeId) || null;
  const actors = selectedIds.map((id) => characters.find((character) => character.id === id)).filter(Boolean) as Character[];
  const previewContent = content || activeScene?.content || '';
  const rollableEntries = theaterWorldBookEntries.filter((entry) => entry.enabled && entry.selected);
  const topicCategories = Array.from(new Set(['全部', '默认', ...theaterTopicEntries.map((entry) => entry.category || '默认')]));
  const filteredTopicEntries = theaterTopicEntries.filter((entry) => topicFilter === '全部' || entry.category === topicFilter);
  const visibleScenes = historyFilter === 'favorite' ? theaterScenes.filter((scene) => scene.favorite) : theaterScenes;
  const actorSummary = actors.length > 0 ? actors.map((actor) => actor.name).join('、') : '未选择角色';
  const activeLengthHint = length === 'custom' ? `目标 ${customLengthText || '自定'} 字` : theaterLengthHints[length];

  const toggleActor = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const loadScene = (scene: TheaterScene) => {
    setActiveId(scene.id);
    setTheme(scene.theme);
    setLength(scene.length);
    setCustomLengthText(scene.customLengthText || '1200');
    setSelectedIds(scene.characterIds);
    setContent(scene.content);
    setRollResult(scene.rollResult || '');
    setStatus('');
    setTheaterView('create');
  };
  const resetDraft = () => {
    setActiveId(null);
    setTheme('');
    setLength('medium');
    setCustomLengthText('1200');
    setSelectedIds(characters[0]?.id ? [characters[0].id] : []);
    setContent('');
    setRollResult('');
    setStatus('');
    setTheaterView('create');
  };
  const saveScene = (overrideContent?: string) => {
    const cleanContent = (overrideContent ?? content).trim();
    if (!cleanContent) {
      setStatus('先生成或写一段剧情。');
      return '';
    }
    const title = (theme.trim() || cleanContent.split('\n').find(Boolean) || '小剧场').replace(/[《》]/g, '').slice(0, 24);
    const payload = {
      title,
      theme: theme.trim() || title,
      characterIds: selectedIds,
      style: 'random' as TheaterStyle,
      length,
      customLengthText: length === 'custom' ? customLengthText.trim() : '',
      rollResult: rollResult.trim(),
      content: cleanContent,
      beats: cleanContent.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('【')).slice(0, 6),
      source: 'manual' as const,
    };
    if (activeId) {
      updateTheaterScene(activeId, payload);
      setStatus('已更新小剧场。');
      return activeId;
    }
    const id = addTheaterScene(payload);
    setActiveId(id);
    setStatus('已保存小剧场。');
    return id;
  };
  const toggleActiveFavorite = () => {
    const existing = activeId || saveScene();
    if (!existing) return;
    toggleTheaterSceneFavorite(existing);
    setStatus(activeScene?.favorite ? '已取消收藏。' : '已收藏。');
  };
  const importTopicFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const entries = parseTheaterTopicImport(text, topicCategory || '默认');
      if (entries.length === 0) {
        setStatus('没有识别到可用主题。');
        return;
      }
      importTheaterTopicEntries(entries);
      setStatus(`已导入 ${entries.length} 个主题。`);
    } catch (error) {
      setStatus(error instanceof Error ? `主题导入失败：${error.message}` : '主题导入失败。');
    } finally {
      event.target.value = '';
    }
  };
  const addTopicFromDraft = () => {
    const clean = topicDraft.trim() || theme.trim();
    if (!clean) {
      setStatus('先写一个主题。');
      return;
    }
    addTheaterTopicEntry({
      title: clean.replace(/\s+/g, ' ').slice(0, 24),
      content: clean,
      category: topicCategory.trim() || '默认',
    });
    setTopicDraft('');
    setStatus('已保存到主题库。');
  };
  const useTopic = (content: string) => {
    setTheme(resolveTavernRandom(content));
    setStatus('已选入主题。');
    setTheaterView('create');
  };
  const randomTopic = () => {
    const source = filteredTopicEntries.length > 0 ? filteredTopicEntries : theaterTopicEntries;
    const picked = source[Math.floor(Math.random() * source.length)];
    if (!picked) {
      setStatus('主题库还是空的。');
      return;
    }
    useTopic(picked.content);
  };
  const importWorldBookFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const entries = parseWorldBookJson(text);
      if (entries.length === 0) {
        setStatus('没有识别到可用世界书条目。');
        return;
      }
      importTheaterWorldBookEntries(entries);
      setStatus(`已导入 ${entries.length} 条世界书。`);
    } catch (error) {
      setStatus(error instanceof Error ? `导入失败：${error.message}` : '导入失败。');
    } finally {
      event.target.value = '';
    }
  };
  const rollWorldBook = () => {
    const result = rollWorldBookEntries(rollableEntries);
    if (result.length === 0) {
      setStatus('先导入世界书，并打开至少一个条目的 roll。');
      return;
    }
    const text = result.join('\n');
    setRollResult(text);
    setStatus(`已生成世界输入，可直接修改后生成。`);
  };
  const appendRollToTheme = () => {
    if (!rollResult.trim()) {
      setStatus('先 roll 一次。');
      return;
    }
    setTheme((current) => [current.trim(), rollResult.trim()].filter(Boolean).join('\n\n'));
    setStatus('已复制到主题。');
  };
  const saveRollAsTopic = () => {
    const clean = rollResult.trim();
    if (!clean) {
      setStatus('先 roll 一次。');
      return;
    }
    addTheaterTopicEntry({
      title: clean.split('\n').find((line) => line.trim())?.replace(/[【】]/g, '').slice(0, 24) || '随机结果',
      content: clean,
      category: topicCategory.trim() || '默认',
    });
    setStatus('已把随机结果保存为主题。');
  };
  const confirmDeleteScene = (id: string) => {
    if (!window.confirm('确定删除这个小剧场吗？\n删除后不可恢复。')) return;
    deleteTheaterScene(id);
    if (activeId === id) resetDraft();
    setStatus('已删除小剧场。');
  };
  const generateScene = async () => {
    if (isGenerating) return;
    if (!apiBaseUrl || !selectedModel) {
      setStatus('请先在设置中配置可用模型。不会用固定长度的本地示例替代生成，原文未改动。');
      return;
    }
    const cleanTheme = theme.trim();
    let effectiveRollResult = rollResult.trim();
    if (!cleanTheme && !effectiveRollResult) {
      setStatus('先写一个主题，或点随机主题 / 世界输入。');
      return;
    }
    const sceneActors = actors.length > 0 ? actors : characters.slice(0, 2);
    setIsGenerating(true);
    setStatus('正在生成小剧场...');
    try {
      const maxTokens = getTheaterMaxTokens(length, customLengthText);
      let truncated = false;
      let nextContent = '';
      if (apiBaseUrl && selectedModel) {
        nextContent = await requestChatCompletion({
          baseUrl: apiBaseUrl,
          apiKey,
          model: selectedModel,
          temperature: chatTemperature,
          maxTokens,
          includeLengthNotice: false,
          onFinish: (result) => { truncated = result.truncated; },
          messages: [
            {
              role: 'system',
              content: [appPresets.theater.prompt, buildTheaterSystemPrompt(sceneActors.map(getCharacterPrompt).filter(Boolean).join('\n\n')), buildTheaterOutputRule(length, customLengthText)].join('\n\n'),
            },
            {
              role: 'user',
              content: buildTheaterUserPrompt({
                theme: cleanTheme,
                length,
                customLengthText,
                actorNames: sceneActors.map((actor) => actor.name),
                rollResult: effectiveRollResult,
              }),
            },
          ],
        });
      }
      const finalContent = nextContent.trim();
      if (!finalContent) throw new Error('模型没有返回正文，原文未改动。');
      setContent(finalContent);
      const id = addTheaterScene({
        title: (cleanTheme || effectiveRollResult.split('\n').find(Boolean) || '随机小剧场').slice(0, 24),
        theme: cleanTheme || '随机小剧场',
        characterIds: sceneActors.map((actor) => actor.id),
        style: 'random',
        length,
        customLengthText: length === 'custom' ? customLengthText.trim() : '',
        rollResult: effectiveRollResult,
        content: finalContent,
        beats: finalContent.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('【')).slice(0, 6),
        source: 'ai',
      });
      setSelectedIds(sceneActors.map((actor) => actor.id));
      setActiveId(id);
      setStatus(buildTheaterResultStatus(finalContent, length, customLengthText, truncated));
    } catch (error) {
      setStatus(`生成失败，原文未改动：${error instanceof Error ? error.message : '请重试。'}`);
    } finally {
      setIsGenerating(false);
    }
  };
  const continueScene = async () => {
    if (isGenerating) return;
    const previousContent = previewContent.trim();
    if (!previousContent) {
      setStatus('先生成或打开一段小剧场，再续写后续。');
      return;
    }
    if (!apiBaseUrl || !selectedModel) {
      setStatus('先在设置中配置可用模型，再续写后续。');
      return;
    }
    const sceneActors = actors.length > 0 ? actors : characters.slice(0, 2);
    setIsGenerating(true);
    setStatus('正在续写后续…');
    try {
      let truncated = false;
      const continuation = (await requestChatCompletion({
        baseUrl: apiBaseUrl,
        apiKey,
        model: selectedModel,
        temperature: chatTemperature,
        maxTokens: getTheaterMaxTokens(length, customLengthText),
        includeLengthNotice: false,
        onFinish: (result) => { truncated = result.truncated; },
        messages: [
          {
            role: 'system',
            content: [appPresets.theater.prompt, buildTheaterSystemPrompt(sceneActors.map(getCharacterPrompt).filter(Boolean).join('\n\n')), buildTheaterOutputRule(length, customLengthText)].join('\n\n'),
          },
          {
            role: 'user',
            content: buildTheaterContinuationPrompt({
              previousContent,
              theme: theme || activeScene?.theme || '',
              length,
              customLengthText,
              actorNames: sceneActors.map((actor) => actor.name),
              rollResult,
            }),
          },
        ],
      })).trim();
      if (!continuation) throw new Error('模型没有返回续写内容。');
      const combinedContent = appendTheaterContinuation(previousContent, continuation);
      setContent(combinedContent);
      saveScene(combinedContent);
      setStatus(`后续已接在原文末尾。${buildTheaterResultStatus(continuation, length, customLengthText, truncated)}`);
    } catch (error) {
      setStatus(error instanceof Error ? `续写失败：${error.message}` : '续写失败，请稍后重试。');
    } finally {
      setIsGenerating(false);
    }
  };
  const saveToDiary = () => {
    const cleanContent = previewContent.trim();
    if (!cleanContent) {
      setStatus('没有可保存的剧情。');
      return;
    }
    addDiary({
      owner: 'user',
      title: `小剧场：${(theme || activeScene?.theme || '未命名').slice(0, 16)}`,
      content: cleanContent,
      tags: ['小剧场'],
      source: 'manual',
      relatedMessageIds: [],
      favorite: false,
    });
    setStatus('已保存到日记。');
  };
  const sendToChat = () => {
    const cleanContent = previewContent.trim();
    const characterId = selectedIds[0] || characters[0]?.id;
    if (!cleanContent || !characterId) {
      setStatus('需要至少一个角色和一段剧情。');
      return;
    }
    addMessage(characterId, 'wechat', {
      id: createId('msg'),
      role: 'model',
      content: buildTheaterChatMessage(theme || activeScene?.theme || '', cleanContent),
      timestamp: Date.now(),
      kind: 'theater',
    });
    openChat(characterId, 'wechat');
  };

  const renderHeader = (subtitle: string) => (
    <Header
      title="小剧场"
      subtitle={subtitle}
      onSave={theaterView === 'create' ? () => void generateScene() : undefined}
      onBack={theaterView === 'create' ? undefined : () => setTheaterView('create')}
      saveLabel={isGenerating ? '生成中' : '生成'}
      tabs={
        <>
          <Pill active={theaterView === 'create'} icon={<Clapperboard />} label="创作" onClick={resetDraft} />
          <Pill active={theaterView === 'favorites'} icon={<Star />} label="收藏夹" onClick={() => { setHistoryFilter('favorite'); setTheaterView('favorites'); }} />
          <Pill active={theaterView === 'history'} icon={<BookOpen />} label="历史" onClick={() => { setHistoryFilter('all'); setTheaterView('history'); }} />
        </>
      }
    />
  );

  const renderHiddenInputs = () => (
    <>
      <input ref={worldBookInputRef} type="file" accept=".json,application/json" onChange={(event) => void importWorldBookFile(event)} className="hidden" />
      <input ref={topicInputRef} type="file" accept=".json,.txt,text/plain,application/json" onChange={(event) => void importTopicFile(event)} className="hidden" />
    </>
  );

  const renderSceneList = (scenes: TheaterScene[], emptyText: string) => (
    <Panel>
      {scenes.length === 0 && <Empty text={emptyText} />}
      <div className="grid gap-3">
        {scenes.map((scene) => (
          <article key={scene.id} className={cn('rounded-2xl border-[2px] border-[#111]/15 p-4 text-left', activeId === scene.id && 'bg-[#fff0bd]')}>
            <div className="flex items-start justify-between gap-3">
              <button onClick={() => loadScene(scene)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-base font-black">{scene.title}</p>
                <p className="mt-1 line-clamp-2 text-xs font-bold opacity-60">{scene.content.replace(/\s+/g, ' ').slice(0, 82)}</p>
              </button>
              <button onClick={() => toggleTheaterSceneFavorite(scene.id)} className={cn('circle-button small shrink-0', scene.favorite && 'bg-[#fff0bd]')} title={scene.favorite ? '取消收藏' : '收藏'}>
                <Star className={cn('h-4 w-4', scene.favorite && 'fill-current')} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">{theaterLengthHints[scene.length]}</span>
              {scene.favorite && <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">已收藏</span>}
              <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">{formatDateLabel(scene.updatedAt)}</span>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );

  const renderTopicLibrary = () => (
    <Panel>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-black">主题库</h2>
          <p className="mt-1 truncate text-xs font-bold opacity-60">{theaterTopicEntries.length} 个主题 · {topicFilter}</p>
        </div>
        <button onClick={() => topicInputRef.current?.click()} className="save-button">导入</button>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input value={topicCategory} onChange={(event) => setTopicCategory(event.target.value)} className="hand-input min-w-0 text-sm" placeholder="分类 / 圈" />
        <button onClick={addTopicFromDraft} className="circle-button" title="新增主题"><Plus className="h-5 w-5" /></button>
      </div>
      <textarea value={topicDraft} onChange={(event) => setTopicDraft(event.target.value)} className="hand-input mt-2 min-h-[76px] w-full resize-none text-sm" placeholder="新主题，或留空把创作页主题保存进主题库" />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {topicCategories.map((category) => (
          <button key={category} onClick={() => setTopicFilter(category)} className={cn('pill shrink-0 px-3 py-2 text-xs', topicFilter === category && 'active')}>{category}</button>
        ))}
      </div>
      <div className="mt-3 grid gap-2">
        {filteredTopicEntries.length === 0 && <Empty text="还没有这个分类的主题。" />}
        {filteredTopicEntries.map((entry) => (
          <article key={entry.id} className="rounded-2xl border-[2px] border-[#111]/15 p-3">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => useTopic(entry.content)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-black">{entry.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] font-bold opacity-60">{entry.content.replace(/\s+/g, ' ').slice(0, 96)}</p>
              </button>
              <button onClick={() => toggleTheaterTopicFavorite(entry.id)} className={cn('circle-button small shrink-0', entry.favorite && 'bg-[#fff0bd]')} title={entry.favorite ? '取消收藏主题' : '收藏主题'}>
                <Star className={cn('h-4 w-4', entry.favorite && 'fill-current')} />
              </button>
              <button onClick={() => deleteTheaterTopicEntry(entry.id)} className="circle-button small shrink-0" title="删除主题">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">{entry.category}</span>
              {entry.favorite && <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-black">已收藏</span>}
            </div>
          </article>
        ))}
      </div>
      {status && <p className="mt-3 rounded-2xl bg-white/55 px-3 py-2 text-xs font-black leading-5 opacity-70">{status}</p>}
    </Panel>
  );

  const renderWorldBookManager = () => (
    <>
      <Panel>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-black">主题随机</h2>
            <p className="mt-1 truncate text-xs font-bold opacity-60">{theaterTopicEntries.length} 个主题 · {topicFilter}</p>
          </div>
          <button onClick={() => topicInputRef.current?.click()} className="save-button">导入主题</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={randomTopic} className="fetch-button bg-[#edf7ed]">
            <Shuffle className="h-5 w-5" />
            随机主题
          </button>
          <button onClick={addTopicFromDraft} className="fetch-button bg-[#fff0bd]">
            <Plus className="h-5 w-5" />
            保存当前主题
          </button>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <input value={topicCategory} onChange={(event) => setTopicCategory(event.target.value)} className="hand-input min-w-0 text-sm" placeholder="分类 / 圈" />
          <button onClick={addTopicFromDraft} className="circle-button" title="新增主题"><Plus className="h-5 w-5" /></button>
        </div>
        <textarea value={topicDraft} onChange={(event) => setTopicDraft(event.target.value)} className="hand-input mt-2 min-h-[70px] w-full resize-none text-sm" placeholder="新主题，或留空把创作页主题保存进主题库" />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {topicCategories.map((category) => (
            <button key={category} onClick={() => setTopicFilter(category)} className={cn('pill shrink-0 px-3 py-2 text-xs', topicFilter === category && 'active')}>{category}</button>
          ))}
        </div>
        <div className="mt-3 grid gap-2">
          {filteredTopicEntries.length === 0 && <Empty text="还没有这个分类的主题。" />}
          {filteredTopicEntries.slice(0, 8).map((entry) => (
            <article key={entry.id} className="rounded-2xl border-[2px] border-[#111]/15 p-3">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => useTopic(entry.content)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-black">{entry.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] font-bold opacity-60">{entry.content.replace(/\s+/g, ' ').slice(0, 96)}</p>
                </button>
                <button onClick={() => toggleTheaterTopicFavorite(entry.id)} className={cn('circle-button small shrink-0', entry.favorite && 'bg-[#fff0bd]')} title={entry.favorite ? '取消收藏主题' : '收藏主题'}>
                  <Star className={cn('h-4 w-4', entry.favorite && 'fill-current')} />
                </button>
                <button onClick={() => deleteTheaterTopicEntry(entry.id)} className="circle-button small shrink-0" title="删除主题">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
        {status && <p className="mt-3 rounded-2xl bg-white/55 px-3 py-2 text-xs font-black leading-5 opacity-70">{status}</p>}
      </Panel>

      <Panel>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-black">世界书随机</h2>
            <p className="mt-1 truncate text-xs font-bold opacity-60">{theaterWorldBookEntries.length} 条 · {rollableEntries.length} 条参与随机</p>
          </div>
          <button onClick={() => worldBookInputRef.current?.click()} className="save-button">导入世界书</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={rollWorldBook} className="fetch-button">
            <Shuffle className="h-5 w-5" />
            世界书 Roll
          </button>
          <button onClick={appendRollToTheme} className="fetch-button bg-[#fff0bd]">
            <Copy className="h-5 w-5" />
            复制到主题
          </button>
          <button onClick={() => { setTheaterView('create'); void generateScene(); }} className="fetch-button bg-[#edf7ed]">
            <Sparkles className="h-5 w-5" />
            使用生成
          </button>
          <button onClick={saveRollAsTopic} className="fetch-button bg-[#f4edbd]">
            <Plus className="h-5 w-5" />
            保存为主题
          </button>
        </div>
        {rollResult && (
          <textarea value={rollResult} onChange={(event) => setRollResult(event.target.value)} className="hand-input mt-3 min-h-[130px] w-full resize-none text-sm" />
        )}
        <div className="mt-4 grid gap-2">
          {theaterWorldBookEntries.length === 0 && <Empty text="导入 SillyTavern 世界书 JSON 后，这里会显示条目开关。" />}
          {theaterWorldBookEntries.map((entry) => {
            const randomCount = getRandomBlocks(entry.content).length;
            const opened = worldBookOpenId === entry.id;
            return (
              <article key={entry.id} className={cn('rounded-2xl border-[2px] border-[#111]/15 p-3', !entry.enabled && 'opacity-50')}>
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                  <button onClick={() => setWorldBookOpenId(opened ? null : entry.id)} className="min-w-0 text-left">
                    <p className="truncate text-sm font-black">{entry.comment}</p>
                    <p className="mt-1 truncate text-[11px] font-bold opacity-55">{entry.category || (entry.source === 'low' ? '默认 low' : '玩家导入')} · {randomCount ? `${randomCount} 组 random` : '固定条目'} · {entry.keys.slice(0, 3).join('、') || '无关键词'}</p>
                  </button>
                  <button onClick={() => updateTheaterWorldBookEntry(entry.id, { enabled: !entry.enabled })} className={cn('pill px-3 py-2 text-xs', entry.enabled && 'active')}>
                    {entry.enabled ? '开' : '关'}
                  </button>
                  <button onClick={() => updateTheaterWorldBookEntry(entry.id, { selected: !entry.selected })} className={cn('pill px-3 py-2 text-xs', entry.selected && 'active')}>
                    Roll
                  </button>
                </div>
                {opened && (
                  <div className="mt-3">
                    <div className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-white/55 p-3 text-xs font-bold leading-5">{entry.content}</div>
                    <button onClick={() => deleteTheaterWorldBookEntry(entry.id)} className="save-button mt-2 bg-[#ffd6d6]">删除条目</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </Panel>
    </>
  );

  if (theaterView === 'favorites') {
    const favoriteScenes = theaterScenes.filter((scene) => scene.favorite);
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        {renderHeader(`${favoriteScenes.length} 段收藏`)}
        {renderHiddenInputs()}
        {renderSceneList(favoriteScenes, '收藏夹还是空的。')}
      </section>
    );
  }

  if (theaterView === 'history') {
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        {renderHeader(`${theaterScenes.length} 段历史`)}
        {renderHiddenInputs()}
        {renderSceneList(theaterScenes, '还没有保存的小剧场。')}
      </section>
    );
  }

  if (theaterView === 'worldbook') {
    return (
      <section className="no-scrollbar h-full overflow-y-auto pb-8">
        {renderHeader('高级随机')}
        {renderHiddenInputs()}
        {renderWorldBookManager()}
      </section>
    );
  }

  return (
    <section className="no-scrollbar h-full overflow-y-auto pb-8">
      {renderHeader(`${theaterScenes.length} 段剧情`)}
      {renderHiddenInputs()}
      <Panel>
        <Field icon={<Sparkles />} label="主题">
          <textarea value={theme} onChange={(event) => setTheme(event.target.value)} className="hand-input min-h-[92px] w-full resize-none" placeholder="比如：雨夜误会、偷看手机后冷战、梦里重逢" />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={randomTopic} className="fetch-button bg-[#edf7ed]">
            <Shuffle className="h-5 w-5" />
            随机主题
          </button>
          <button onClick={() => setTheaterView('worldbook')} className="fetch-button bg-[#f4edbd]">
            <Settings className="h-5 w-5" />
            管理
          </button>
          <button onClick={rollWorldBook} className="fetch-button bg-[#fff0bd]">
            <Wand2 className="h-5 w-5" />
            世界输入
          </button>
        </div>
        {rollResult && (
          <Field icon={<Shuffle />} label="世界输入">
            <textarea value={rollResult} onChange={(event) => setRollResult(event.target.value)} className="hand-input min-h-[120px] w-full resize-none text-sm" />
          </Field>
        )}
        <Field icon={<Users />} label="出场角色">
          <button onClick={() => setActorsOpen((current) => !current)} className="pill w-full justify-between">
            <span className="truncate">{actorSummary}</span>
            <span className="text-xs opacity-60">{actorsOpen ? '收起' : '展开'}</span>
          </button>
          {actorsOpen && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {characters.map((character) => (
                <button key={character.id} onClick={() => toggleActor(character.id)} className={cn('pill min-w-0 justify-start', selectedIds.includes(character.id) && 'active')}>
                  <Avatar character={character} />
                  <span className="truncate">{character.name}</span>
                </button>
              ))}
            </div>
          )}
          {characters.length === 0 && <Empty text="先去通讯录导入角色。" />}
        </Field>
        <Field icon={<FileText />} label="长度">
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(theaterLengthShortLabels) as TheaterLength[]).map((item) => (
              <button key={item} onClick={() => setLength(item)} className={cn('pill w-full justify-center', length === item && 'active')}>{theaterLengthShortLabels[item]}</button>
            ))}
          </div>
          {length === 'custom' && (
            <input aria-label="自定义字数" inputMode="numeric" value={customLengthText} onChange={(event) => setCustomLengthText(event.target.value)} className="hand-input mt-2 w-full text-sm" placeholder="例如 1200" />
          )}
          <p className="mt-2 text-xs font-black opacity-60">{activeLengthHint}</p>
          <p className="mt-1 text-xs leading-5">按所选字数发送；续写按此字数新增。模型字数可能有偏差，接口单次上限不足时可分段继续。</p>
        </Field>
        <button onClick={() => void generateScene()} disabled={isGenerating} className="fetch-button w-full">{isGenerating ? '生成中' : '生成完整小剧场'}</button>
        {status && <p className="mt-3 rounded-2xl bg-white/55 px-3 py-2 text-xs font-black leading-5 opacity-70">{status}</p>}
      </Panel>

      <Panel>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-black">生成结果</h2>
            <p className="mt-1 truncate text-xs font-bold opacity-60">{activeScene ? activeScene.title : '还没有生成'}</p>
          </div>
          {activeId && (
            <button onClick={() => confirmDeleteScene(activeId)} className="circle-button small" title="删除">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {activeScene && (
          <div className="mb-3 grid gap-2 rounded-2xl bg-white/55 p-3 text-xs font-bold leading-5 opacity-75">
            <p>角色：{activeScene.characterIds.map((id) => characters.find((character) => character.id === id)?.name).filter(Boolean).join('、') || '未指定'}</p>
            <p>主题：{activeScene.theme || '随机小剧场'}</p>
            <p>长度：{activeScene.length === 'custom' ? `目标 ${activeScene.customLengthText || '未设置'} 字` : theaterLengthHints[activeScene.length]}</p>
            <p>创建：{formatDateLabel(activeScene.createdAt)}</p>
            {activeScene.rollResult && <p className="whitespace-pre-wrap">随机结果：{activeScene.rollResult}</p>}
          </div>
        )}
        {previewContent ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs">正文 {Array.from(previewContent.replace(/\s/g, '')).length} 字符（不含空白）</span>
              <button onClick={() => void continueScene()} disabled={isGenerating} className="fetch-button">{isGenerating ? '处理中…' : '继续写'}</button>
            </div>
            {status && <p role="status" className="mb-3 text-sm leading-6">{status}</p>}
            <div className="whitespace-pre-wrap rounded-2xl bg-white/55 p-4 text-sm font-bold leading-7">{previewContent}</div>
          </>
        ) : (
          <Empty text="写主题、选角色和长度后生成。" />
        )}
        {previewContent && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={toggleActiveFavorite} className="fetch-button bg-[#f4edbd]">{activeScene?.favorite ? '取消收藏' : '收藏'}</button>
            <button onClick={sendToChat} className="fetch-button bg-[#edf7ed]">进聊天</button>
            {activeId && <button onClick={() => confirmDeleteScene(activeId)} className="fetch-button bg-[#ffd6d6]">删除</button>}
            <button onClick={() => void generateScene()} disabled={isGenerating} className="fetch-button bg-[#fff0bd]">{isGenerating ? '生成中' : '重新生成'}</button>
            <button onClick={() => void continueScene()} disabled={isGenerating} className="fetch-button col-span-2 bg-[#edf7ed]">{isGenerating ? '处理中…' : '继续写'}</button>
          </div>
        )}
      </Panel>
    </section>
  );
}
