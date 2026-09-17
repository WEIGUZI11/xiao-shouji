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
import type { BrowserSearchResult } from '../../store';
import { useAppStore } from '../../store';
function repairMojibake(text: string) {
  try {
    const decoded = decodeURIComponent(escape(text));
    const originalCjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const decodedCjk = (decoded.match(/[\u4e00-\u9fff]/g) || []).length;
    return decodedCjk > originalCjk ? decoded : text;
  } catch {
    return text;
  }
}function makeFallbackBrowserResults(query: string, context: string): { summary: string; results: BrowserSearchResult[] } {
  const clean = query.trim() || '最近发生的事';
  const encoded = encodeURIComponent(clean).replace(/%20/g, '+');
  const hasContext = context.trim() && !context.includes('当前没有太多最近记录');
  const summary = `找到约 4 条和「${clean}」有关的结果，包含社区讨论、笔记、短评式条目和资料页。`;
  const results = [
    {
      title: `如何看待「${clean}」最近又被提起？`,
      url: `https://www.zhihu.com/search?type=content&q=${encoded}`,
      snippet: hasContext ? `有答主从最近几件小事聊起，语气像熟人匿名分享，评论区也补了几个容易被忽略的细节。` : `有答主把这件事讲得很生活化，评论区补充了不同角度的经历和看法。`,
    },
    {
      title: `${clean}｜条目、短评与收藏`,
      url: `https://www.douban.com/search?q=${encoded}`,
      snippet: `豆瓣式条目页里有人把这件事记成一种氛围：安静、暧昧、带一点不想明说的私人感。`,
    },
    {
      title: `${clean} 相关笔记：今天也太有画面感了`,
      url: `https://www.xiaohongshu.com/search_result?keyword=${encoded}`,
      snippet: `笔记里像真人随手发的生活记录，配了地点、心情和几条热评，看起来像刚被收藏过。`,
    },
    {
      title: `${clean}_百度百科`,
      url: `https://baike.baidu.com/item/${encoded}`,
      snippet: `资料页整理了关键词、相关人物和时间线，像现实网页一样克制，但能自然接进当前世界观。`,
    },
  ];
  return { summary, results };
}

function getBrowserHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0];
  }
}

export function BrowserScreen() {
  const {
    characters,
    chatSessions,
    wechatMoments,
    diaries,
    calendarEvents,
    galleryPhotos,
    memos,
    xiaohongshuNotes,
    browserSearches,
    browserBookmarks,
    browserHistory,
    browserWorldBook,
    addBrowserSearch,
    deleteBrowserSearch,
    addBrowserBookmark,
    deleteBrowserBookmark,
    addBrowserHistory,
    clearBrowserHistory,
    setBrowserWorldBook,
    browserApiBaseUrl,
    browserApiKey,
    browserSelectedModel,
    setBrowserApiConfig,
    apiBaseUrl,
    apiKey,
    selectedModel,
    chatTemperature,
    browserPresetPrompt,
  } = useAppStore();
  const worldBookInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(browserSearches[0]?.id || null);
  const [openedResult, setOpenedResult] = useState<BrowserSearchResult | null>(null);
  const [browserPanel, setBrowserPanel] = useState<'results' | 'bookmarks' | 'history' | 'settings'>('results');
  const [isSearching, setIsSearching] = useState(false);
  const [status, setStatus] = useState('');
  const activeRecord = browserSearches.find((record) => record.id === activeId);

  const runSearch = async (overrideQuery?: string) => {
    const clean = (overrideQuery ?? query).trim();
    if (!clean) {
      setStatus('先输入要搜索的内容。');
      return;
    }
    setIsSearching(true);
    setOpenedResult(null);
    setBrowserPanel('results');
    setStatus('正在生成浏览器搜索页...');
    const context = buildMemoWorldContext({
      characters,
      chatSessions,
      wechatMoments,
      purchaseRecords: [],
      diaries,
      calendarEvents,
      galleryPhotos,
      memos,
      xiaohongshuNotes,
      characterId: characters[0]?.id,
    });
    try {
      let payload = makeFallbackBrowserResults(clean, context);
      const activeApiBaseUrl = browserApiBaseUrl || apiBaseUrl;
      const activeApiKey = browserApiKey || apiKey;
      const activeModel = browserSelectedModel || selectedModel;
      if (activeApiBaseUrl && activeModel) {
        const reply = await requestChatCompletion({
          baseUrl: activeApiBaseUrl,
          apiKey: activeApiKey,
          model: activeModel,
          temperature: chatTemperature,
          maxTokens: 700,
          messages: [
            {
              role: 'system',
              content: [
                '你是虚拟手机里的浏览器搜索页。输出严格 JSON，不要 Markdown。',
                '结构：{"summary":"...","results":[{"title":"...","url":"https://...","snippet":"..."}]}。',
                '这是给玩家看的沉浸式界面，不要出现代码、CSS、JS、发给char、example.com、phone://、生成器、开发说明。',
                '结果要像真实互联网里存在的知乎、豆瓣、小红书、微博、贴吧、百科、新闻、本地生活站等页面。',
                '不要把最近内容逐字贴进摘要，要改写成像网友、博主、条目编辑自然写出来的话。',
                browserPresetPrompt,
              ].filter(Boolean).join('\n'),
            },
            {
              role: 'user',
              content: `搜索词：${clean}\n\n浏览器世界书：\n${browserWorldBook || '未导入'}\n\n最近内容，只用于理解背景，不要逐字照抄：\n${context}`,
            },
          ],
        });
        const parsed = JSON.parse(reply) as Partial<{ summary: string; results: BrowserSearchResult[] }>;
        if (parsed.summary && Array.isArray(parsed.results) && parsed.results.length > 0) {
          const results = parsed.results
            .filter((item) => item && item.title && item.url && item.snippet)
            .slice(0, 5);
          payload = { summary: parsed.summary, results };
        }
      }
      const id = addBrowserSearch({
        query: clean,
        summary: payload.summary,
        results: payload.results,
        source: activeApiBaseUrl && activeModel ? 'model' : 'generated',
      });
      setActiveId(id);
      setQuery('');
      setStatus('已生成搜索页。');
    } catch {
      const payload = makeFallbackBrowserResults(clean, context);
      const id = addBrowserSearch({
        query: clean,
        summary: payload.summary,
        results: payload.results,
        source: 'generated',
      });
      setActiveId(id);
      setStatus('模型生成失败，已使用本地搜索页。');
    } finally {
      setIsSearching(false);
    }
  };

  const goBrowserBack = () => {
    if (openedResult) {
      setOpenedResult(null);
      return;
    }
    if (browserPanel !== 'results') {
      setBrowserPanel('results');
      return;
    }
    if (activeRecord) {
      setActiveId(null);
      return;
    }
    useAppStore.getState().goBack();
  };

  const refreshBrowser = () => {
    const target = openedResult?.title || activeRecord?.query || query;
    if (target.trim()) void runSearch(target);
  };

  const openResult = (result: BrowserSearchResult) => {
    setOpenedResult(result);
    addBrowserHistory({ title: result.title, url: result.url, query: activeRecord?.query });
  };

  const bookmarkResult = (result: BrowserSearchResult) => {
    addBrowserBookmark({ title: result.title, url: result.url, snippet: result.snippet });
    setStatus('已加入书签。');
  };

  const importBrowserWorldBook = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const utf8Text = new TextDecoder('utf-8').decode(buffer);
    const repairedText = repairMojibake(utf8Text);
    const finalText = ['�', '锟', 'Â', 'Ã', 'æ', 'ç', 'è', 'é'].some((marker) => repairedText.includes(marker))
      ? new TextDecoder('gb18030').decode(buffer)
      : repairedText;
    setBrowserWorldBook(finalText);
    setStatus(`已导入世界书：${file.name}`);
    event.target.value = '';
  };

  return (
    <section className="browser-app no-scrollbar h-full overflow-y-auto">
      <div className="browser-tabs">
        <div className="browser-tab active"><Search className="h-3.5 w-3.5" />新标签页</div>
        <button type="button" onClick={() => useAppStore.getState().setScreen('desktop')} className="browser-window-button" aria-label="返回桌面" title="返回桌面"><ChevronLeft className="h-4 w-4" /></button>
      </div>
      <div className="browser-toolbar">
        <button type="button" onClick={goBrowserBack} className="browser-tool" aria-label="浏览器返回" title="返回上一页"><ChevronLeft className="h-4 w-4" /></button>
        <button onClick={refreshBrowser} className="browser-tool"><RefreshCw className={cn('h-4 w-4', isSearching && 'animate-spin')} /></button>
        <div className="browser-address">
          <Shield className="h-4 w-4 text-[#188038]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="搜索或输入网址" />
          <button onClick={() => runSearch()} disabled={isSearching}>{isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</button>
        </div>
        <button onClick={() => setBrowserPanel(browserPanel === 'settings' ? 'results' : 'settings')} className="browser-tool"><MoreHorizontal className="h-4 w-4" /></button>
      </div>

      {!openedResult && browserPanel === 'results' && !activeRecord && (
        <div className="browser-home">
          <div className="browser-logo"><span>Edge</span> Search</div>
          <div className="browser-home-search">
            <Search className="h-5 w-5" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && runSearch()} placeholder="搜索世界观、最近事件或网址" />
          </div>
          {status && <p className="browser-status">{status}</p>}
        </div>
      )}

      {openedResult && (
        <div className="browser-content">
          <div className="browser-page-view">
            <div className="browser-site-line">
              <span>{getBrowserHost(openedResult.url)}</span>
              <small>{openedResult.url}</small>
            </div>
            <h2>{openedResult.title}</h2>
            <p>{openedResult.snippet}</p>
            <div className="browser-article-body">
              <p>页面内容根据当前背景世界观整理，保留真实网页的口吻和结构。</p>
              <p>相关讨论里更关注人物动机、细节时间线和旁观者的生活化反应，所以读起来不像档案，更像刚被人搜到的一页。</p>
            </div>
            <button onClick={() => bookmarkResult(openedResult)} className="browser-action-button"><Star className="h-4 w-4" />加入书签</button>
          </div>
        </div>
      )}

      {!openedResult && browserPanel === 'settings' && (
        <div className="browser-content">
          <div className="browser-result-header">
            <div>
              <p>浏览器设置</p>
              <h2>世界书</h2>
            </div>
          </div>
          <input ref={worldBookInputRef} type="file" accept=".txt,.json,.md" onChange={importBrowserWorldBook} className="hidden" />
          <button onClick={() => worldBookInputRef.current?.click()} className="browser-action-button"><Import className="h-4 w-4" />导入世界书</button>
          <textarea value={browserWorldBook} onChange={(event) => setBrowserWorldBook(event.target.value)} className="browser-worldbook-input" placeholder="粘贴或导入浏览器生成时要参考的世界书。" />
          <div className="browser-settings-grid">
            <input value={browserApiBaseUrl} onChange={(event) => setBrowserApiConfig({ browserApiBaseUrl: event.target.value })} className="browser-setting-input" placeholder="浏览器专属 API 地址" />
            <input value={browserSelectedModel} onChange={(event) => setBrowserApiConfig({ browserSelectedModel: event.target.value })} className="browser-setting-input" placeholder="浏览器专属模型" />
            <input value={browserApiKey} onChange={(event) => setBrowserApiConfig({ browserApiKey: event.target.value })} className="browser-setting-input" type="password" placeholder="浏览器专属 API Key" />
          </div>
        </div>
      )}

      {!openedResult && browserPanel === 'bookmarks' && (
        <div className="browser-content">
          <div className="browser-result-header"><div><p>收藏夹</p><h2>书签</h2></div></div>
          {browserBookmarks.length === 0 && <p className="browser-summary">还没有书签。</p>}
          {browserBookmarks.map((bookmark) => (
            <article key={bookmark.id} className="browser-result-card">
              <button onClick={() => openResult(bookmark)} className="w-full text-left">
                <div className="browser-site-line"><span>{bookmark.url.replace(/^https?:\/\//, '').split('/')[0]}</span><small>{bookmark.url}</small></div>
                <h3>{bookmark.title}</h3>
                <p>{bookmark.snippet}</p>
              </button>
              <button onClick={() => deleteBrowserBookmark(bookmark.id)} className="browser-inline-delete"><Trash2 className="h-4 w-4" />删除</button>
            </article>
          ))}
        </div>
      )}

      {!openedResult && browserPanel === 'history' && (
        <div className="browser-content">
          <div className="browser-result-header">
            <div><p>浏览记录</p><h2>历史</h2></div>
            <button onClick={clearBrowserHistory}><Trash2 className="h-4 w-4" /></button>
          </div>
          {browserHistory.length === 0 && <p className="browser-summary">还没有浏览历史。</p>}
          {browserHistory.map((item) => (
            <button key={item.id} onClick={() => openResult({ title: item.title, url: item.url, snippet: item.query ? `来自「${item.query}」的浏览记录。` : '浏览记录。' })} className="browser-history-row">
              <span>{item.title}</span>
              <small>{new Date(item.visitedAt).toLocaleString('zh-CN')}</small>
            </button>
          ))}
        </div>
      )}

      {!openedResult && browserPanel === 'results' && activeRecord && (
        <div className="browser-content">
          <div className="browser-result-header">
            <div>
              <p>搜索结果</p>
              <h2>{activeRecord.query}</h2>
            </div>
            <button onClick={() => deleteBrowserSearch(activeRecord.id)}><Trash2 className="h-4 w-4" /></button>
          </div>
          <p className="browser-summary">{activeRecord.summary}</p>
          <div className="browser-result-list">
            {activeRecord.results.map((result) => {
              let host = result.url;
              try {
                host = getBrowserHost(result.url);
              } catch {
                host = getBrowserHost(result.url);
              }
              return (
                <article key={`${activeRecord.id}-${result.url}`} className="browser-result-card">
                  <button onClick={() => openResult(result)} className="w-full text-left">
                    <div className="browser-site-line">
                      <span>{host}</span>
                      <small>{result.url}</small>
                    </div>
                    <h3>{result.title}</h3>
                    <p>{result.snippet}</p>
                  </button>
                  <button onClick={() => bookmarkResult(result)} className="browser-inline-delete"><Star className="h-4 w-4" />收藏</button>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <div className="browser-history">
        <button onClick={() => setBrowserPanel('bookmarks')} className={cn(browserPanel === 'bookmarks' && 'active')}>
          <Star className="h-4 w-4" />
          <span>书签</span>
        </button>
        <button onClick={() => setBrowserPanel('history')} className={cn(browserPanel === 'history' && 'active')}>
          <Clock className="h-4 w-4" />
          <span>历史</span>
        </button>
        {browserSearches.slice(0, 8).map((record) => (
          <button key={record.id} onClick={() => { setOpenedResult(null); setBrowserPanel('results'); setActiveId(record.id); }} className={cn(activeRecord?.id === record.id && browserPanel === 'results' && 'active')}>
            <Search className="h-4 w-4" />
            <span>{record.query}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
