import {
  ChevronLeft,
  ChevronRight,
  Check,
  CircleUserRound,
  Clock,
  FileText,
  Headphones,
  Heart,
  Image as ImageIcon,
  Import,
  Link,
  MoreHorizontal,
  Music,
  Pause,
  Play,
  Plus,
  Quote,
  RefreshCw,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Volume2,
  Wand2,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Character, ChatMessage, MusicPlaylist, MusicTrack, useAppStore } from '../../store';
import { buildHttpErrorMessage, readHttpErrorDetail } from '../../lib/httpErrors';
import { cn } from '../../lib/utils';
import {
  buildMiniMaxMusicGenerationRequest,
  extractMiniMaxMusicAudio,
  formatMiniMaxLyrics,
  hexToAudioBlobUrl,
} from './musicGeneration';

type ChatCompletionMessage = { role: 'user' | 'assistant' | 'system'; content: string };

function normalizeApiBaseUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

async function requestChatCompletion({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature,
  maxTokens,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatCompletionMessage[];
  temperature: number;
  maxTokens: number;
}) {
  const endpoint = `${normalizeApiBaseUrl(baseUrl)}/chat/completions`;
  useAppStore.getState().addAppLog?.({
    type: 'ai',
    title: '发送给 AI 的消息',
    detail: JSON.stringify({ endpoint, model, messages, temperature, maxTokens }, null, 2),
  });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!response.ok) {
    const message = buildHttpErrorMessage('聊天接口失败', {
      status: response.status,
      statusText: response.statusText,
      detail: await readHttpErrorDetail(response),
    });
    useAppStore.getState().addAppLog?.({ type: 'error', title: 'AI 接口失败', detail: `${endpoint}\n${message}` });
    throw new Error(message);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '';
  useAppStore.getState().addAppLog?.({ type: 'ai', title: 'AI 返回内容', detail: content });
  return content;
}

function describeChatMessage(message: Pick<ChatMessage, 'kind' | 'content' | 'stickerLabel' | 'transcript' | 'recalled' | 'speakerId' | 'amount' | 'note' | 'itemName'>) {
  if (message.recalled) return '已撤回一条消息';
  if (message.kind === 'sticker') return `表情包注释：${message.stickerLabel || '表情包'}`;
  if (message.kind === 'image') return '图片';
  if (message.kind === 'voice') return message.transcript || message.content || '语音';
  if (message.kind === 'call-note') return `通话：${message.content}`;
  if (message.kind === 'transfer') return `转账：${message.amount || message.content}${message.note ? `，${message.note}` : ''}`;
  if (message.kind === 'red-packet') return `红包：${message.note || message.content || '恭喜发财，大吉大利'}${message.amount ? `，${message.amount}` : ''}`;
  if (message.kind === 'shopping') return `购物：${message.itemName || message.content}${message.amount ? `，${message.amount}` : ''}${message.note ? `，${message.note}` : ''}`;
  return message.content;
}

function stringifyForPrompt(value: unknown, maxLength = 6000) {
  if (!value) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...` : text;
}

function getCharacterPrompt(character: Character) {
  return [
    `角色名：${character.name}`,
    character.description && `简介：${character.description}`,
    character.personality && `性格：${character.personality}`,
    character.firstMessage && `开场白参考：${character.firstMessage}`,
    character.systemPrompt && `角色系统提示：${character.systemPrompt}`,
    character.worldBook && `世界书：\n${stringifyForPrompt(character.worldBook)}`,
  ].filter(Boolean).join('\n');
}

function Header({
  title,
  subtitle,
  tabs,
  onSave,
  onBack,
  saveLabel = '保存',
}: {
  title: string;
  subtitle?: string;
  tabs?: React.ReactNode;
  onSave?: () => void;
  onBack?: () => void;
  saveLabel?: string;
}) {
  const { goBack } = useAppStore();
  return (
    <header className="sticky top-0 z-30 bg-[var(--phone-bg)] px-4 pb-4 pt-6">
      <div className="grid grid-cols-[48px_1fr_56px] items-center">
        <button onClick={onBack || goBack} className="circle-button" aria-label="返回">
          <ChevronLeft className="h-7 w-7" aria-hidden />
        </button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-2xl font-black">{title}</h1>
          {subtitle && <p className="truncate text-xs font-bold opacity-60">{subtitle}</p>}
        </div>
        {onSave ? <button onClick={onSave} className="save-button">{saveLabel}</button> : <span />}
      </div>
      {tabs && <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">{tabs}</div>}
    </header>
  );
}

function Pill({ icon, label, active, onClick }: { key?: React.Key; icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn('pill', active && 'active')}>
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-4 w-4' })}
      {label}
    </button>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="mb-5 block last:mb-0">
      <span className="mb-2 flex items-center gap-2 text-lg font-black">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}
        {label}
      </span>
      {children}
    </label>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('hand-panel mx-4 mt-4 p-5', className)}>{children}</div>;
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm font-black opacity-55">{text}</p>;
}
type MusicTab = 'library' | 'player' | 'char' | 'me';
type MusicLibraryView = 'index' | 'liked' | 'playlists' | 'playlist-detail' | 'history';

const minimaxMusicModelPresets = [
  { label: 'music-2.6', value: 'music-2.6' },
  { label: 'music-2.6-free', value: 'music-2.6-free' },
];

type MusicPlaylistDraft = {
  name: string;
  description: string;
  cover: string;
  trackIds: string[];
};

type MusicSearchResult = {
  id: string;
  sourceId?: string;
  title: string;
  artist: string;
  album?: string;
  cover?: string;
  audioUrl?: string;
  sourceUrl?: string;
  access: 'playable' | 'preview' | 'unplayable';
  source: 'audius' | 'netease' | 'qq' | 'custom' | 'demo';
};

const demoMusicResult: MusicSearchResult = {
  id: 'demo-soundhelix-1',
  title: 'Public Demo Song',
  artist: 'SoundHelix',
  album: '测试声音',
  cover: 'linear-gradient(135deg,#111,#7e1114)',
  audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  access: 'playable',
  source: 'demo',
};

type MusicApiRecord = Record<string, unknown>;

function asMusicRecord(value: unknown): MusicApiRecord {
  return value && typeof value === 'object' ? value as MusicApiRecord : {};
}

function musicText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function musicNumber(value: unknown) {
  return typeof value === 'number' ? value : undefined;
}

function trimMusicBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function pickNestedText(record: MusicApiRecord, keys: string[]) {
  for (const key of keys) {
    const parts = key.split('.');
    let cursor: unknown = record;
    for (const part of parts) cursor = asMusicRecord(cursor)[part];
    const text = musicText(cursor);
    if (text) return text;
  }
  return '';
}

function pickFirstArray(value: unknown, paths: string[]) {
  for (const path of paths) {
    let cursor: unknown = value;
    for (const part of path.split('.')) cursor = asMusicRecord(cursor)[part];
    if (Array.isArray(cursor)) return cursor;
  }
  return [];
}

type CharSongDraft = {
  characterId: string;
  title: string;
  mood: string;
  melody: string;
  arrangement: string;
  lyrics: string;
};

function formatMusicTime(seconds: number) {
  const current = Math.max(0, Math.floor(seconds || 0));
  const minute = Math.floor(current / 60);
  const second = String(current % 60).padStart(2, '0');
  return `${minute}:${second}`;
}

function formatMusicDuration(seconds?: number) {
  if (!seconds) return '0秒';
  const minute = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  if (minute <= 0) return `${rest}秒`;
  return `${minute}分${String(rest).padStart(2, '0')}秒`;
}

function musicPlaylistDraft(playlist?: MusicPlaylist): MusicPlaylistDraft {
  return {
    name: playlist?.name || '',
    description: playlist?.description || '',
    cover: playlist?.cover || '',
    trackIds: playlist?.trackIds || [],
  };
}

function MusicCover({ track, playlist, className }: { track?: MusicTrack; playlist?: MusicPlaylist; className?: string }) {
  const cover = track?.cover || playlist?.cover;
  const title = track?.title || playlist?.name || '♪';
  const style = cover
    ? cover.startsWith('linear-gradient')
      ? { background: cover }
      : { backgroundImage: `url(${cover})` }
    : { background: 'linear-gradient(135deg, var(--accent), #e9c4d5)' };
  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden border-[3px] border-[#111] bg-cover bg-center text-lg font-black shadow-[2px_3px_0_rgba(0,0,0,0.16)]', className)} style={style}>
      {!cover?.startsWith('http') && !cover?.startsWith('data:') && <span className="px-2 text-center text-white drop-shadow">{title.slice(0, 2)}</span>}
    </div>
  );
}

function MusicIconButton({ icon, label, active, dark, onClick }: { icon: React.ReactNode; label: string; active?: boolean; dark?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn('circle-button small shrink-0', dark ? 'border-white/45 bg-black/70 text-white shadow-[0_8px_18px_rgba(0,0,0,.28)]' : 'bg-[#f8f1df] text-[#111]', active && (dark ? 'bg-[#d64545] text-white' : 'bg-[#ffb3ca]'))} title={label} aria-label={label}>
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: cn('h-4 w-4', active && 'fill-current') })}
    </button>
  );
}

function MusicTrackRow({
  track,
  active,
  onPlay,
  onLike,
  onDelete,
}: {
  key?: React.Key;
  track: MusicTrack;
  active?: boolean;
  onPlay: () => void;
  onLike: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className={cn('grid grid-cols-[48px_1fr_auto] items-center gap-3 border-b-[2px] border-[#111]/15 py-3 last:border-b-0', active && 'rounded-2xl bg-black/5 px-2')}>
      <button onClick={onPlay} className="contents" title="播放">
        <MusicCover track={track} className="h-12 w-12 rounded-2xl" />
        <span className="min-w-0 text-left">
          <span className="block truncate text-sm font-black">{track.title}</span>
          <span className="block truncate text-xs font-bold opacity-60">{track.artist}{track.album ? ` · ${track.album}` : ''}</span>
        </span>
      </button>
      <span className="flex items-center justify-end gap-1">
        <MusicIconButton icon={<Heart />} label="喜欢" active={track.liked} onClick={onLike} />
        {onDelete && <MusicIconButton icon={<Trash2 />} label="删除" onClick={onDelete} />}
      </span>
    </div>
  );
}

export function MusicScreen() {
  const {
    characters,
    chatSessions,
    browserWorldBook,
    apiBaseUrl,
    apiKey,
    selectedModel,
    chatTemperature,
    musicPresetPrompt,
    userName,
    userAvatar,
    setUserName,
    setUserAvatar,
    galleryPhotos,
    musicTracks,
    musicPlaylists,
    musicListenRecords,
    musicPlayer,
    musicSourceConfig,
    ttsConfig,
    ttsEnabled,
    addMusicTrack,
    updateMusicTrack,
    deleteMusicTrack,
    toggleMusicTrackLiked,
    addMusicPlaylist,
    updateMusicPlaylist,
    deleteMusicPlaylist,
    toggleMusicPlaylistFavorite,
    addTrackToMusicPlaylist,
    removeTrackFromMusicPlaylist,
    setMusicPlayer,
    setMusicSourceConfig,
    playMusicTrack,
    addMusicListenRecord,
    addAppLog,
  } = useAppStore();
  const [tab, setTab] = useState<MusicTab>('library');
  const [libraryView, setLibraryView] = useState<MusicLibraryView>('index');
  const [query, setQuery] = useState('');
  const [externalQuery, setExternalQuery] = useState('');
  const [searchingMusic, setSearchingMusic] = useState(false);
  const [musicSearchResults, setMusicSearchResults] = useState<MusicSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [musicStatus, setMusicStatus] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [quickPlaylistId, setQuickPlaylistId] = useState('');
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [playlistDraft, setPlaylistDraft] = useState<MusicPlaylistDraft>(() => musicPlaylistDraft());
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [listenCharacterId, setListenCharacterId] = useState('');
  const [listenStartedAt, setListenStartedAt] = useState<number | null>(null);
  const [listenElapsed, setListenElapsed] = useState(0);
  const [listenGreeting, setListenGreeting] = useState('等好友加入中...');
  const [charSongDraft, setCharSongDraft] = useState<CharSongDraft>(() => ({ characterId: '', title: '', mood: '晚风、想念、耳机共享', melody: '', arrangement: '', lyrics: '' }));
  const [charSongStatus, setCharSongStatus] = useState('');
  const [generatingCharSong, setGeneratingCharSong] = useState(false);
  const [activeCharSongId, setActiveCharSongId] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [showPlayerLyrics, setShowPlayerLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [playerBackground, setPlayerBackground] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playableTracks = musicTracks.filter((track) => Boolean(track.audioUrl));
  const currentTrack = playableTracks.find((track) => track.id === musicPlayer.trackId) || playableTracks[0];
  const likedTracks = playableTracks.filter((track) => track.liked);
  const recentTracks = [...playableTracks].filter((track) => track.lastPlayedAt).sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
  const selectedPlaylist = musicPlaylists.find((playlist) => playlist.id === selectedPlaylistId) || musicPlaylists[0];
  const playlistTracks = selectedPlaylist ? selectedPlaylist.trackIds.map((id) => musicTracks.find((track) => track.id === id)).filter(Boolean) as MusicTrack[] : [];
  const filteredTracks = playableTracks.filter((track) => {
    const text = `${track.title} ${track.artist} ${track.album || ''} ${track.tags.join(' ')}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });
  const playlistTrackOptions = [...playableTracks].sort((a, b) => Number(b.liked) - Number(a.liked) || a.title.localeCompare(b.title));
  const listenCharacter = characters.find((character) => character.id === listenCharacterId);
  const charWriter = characters.find((character) => character.id === charSongDraft.characterId) || characters[0];
  const activeCharSong = musicTracks.find((track) => track.id === activeCharSongId);
  const charSongs = musicTracks.filter((track) => track.source === 'char' && (track.characterId === charWriter?.id || track.artist === charWriter?.name));
  const togetherRecords = musicListenRecords.filter((record) => record.mood === '一起听' && record.characterId);
  const togetherRanking = characters
    .map((character) => {
      const records = togetherRecords.filter((record) => record.characterId === character.id);
      const seconds = records.reduce((sum, record) => sum + (record.durationSeconds || 0), 0);
      return { character, records, seconds };
    })
    .filter((item) => item.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
  const togetherSeconds = togetherRecords.reduce((sum, record) => sum + (record.durationSeconds || 0), 0) + (listenStartedAt ? listenElapsed : 0);
  const myPlayCount = musicTracks.reduce((sum, track) => sum + track.playCount, 0);
  const playerBackgroundImage = playerBackground
    || (currentTrack?.cover && !currentTrack.cover.startsWith('linear-gradient') ? currentTrack.cover : '')
    || galleryPhotos[0]?.url
    || '';
  const sortedMusicSearchResults = [...musicSearchResults].sort((a, b) => {
    const weight = { playable: 0, preview: 1, unplayable: 2 };
    return weight[a.access] - weight[b.access] || a.title.localeCompare(b.title);
  });

  const searchAccessLabel = (result: MusicSearchResult) => {
    if (result.access === 'playable') return '可听';
    if (result.access === 'preview') return '试听';
    return '不可播';
  };

  const searchAccessClass = (result: MusicSearchResult) => {
    if (result.access === 'playable') return 'bg-[#dceecd]';
    if (result.access === 'preview') return 'bg-[#f4edbd]';
    return 'bg-[#e5e5e5] opacity-70';
  };

  const searchSourceLabel = (result: MusicSearchResult) => {
    if (result.source === 'audius') return 'Audius';
    if (result.source === 'netease') return '网易云';
    if (result.source === 'qq') return 'QQ';
    if (result.source === 'demo') return '测试';
    return '我的';
  };

  const sourceTag = (result: MusicSearchResult) => searchSourceLabel(result);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 1;
    if (!musicPlayer.playing) audio.pause();
  }, [musicPlayer.playing]);

  useEffect(() => {
    if (!listenStartedAt) return;
    const timer = window.setInterval(() => setListenElapsed(Math.floor((Date.now() - listenStartedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [listenStartedAt]);

  const playAudioUrl = async (track: MusicTrack, directUrl = track.audioUrl, restart = false) => {
    if (!directUrl) {
      setMusicStatus('这首歌没有可播放音频源。');
      return;
    }
    const audio = (document.getElementById('global-music-audio') as HTMLAudioElement | null) || audioRef.current;
    if (!audio) return;
    try {
      const sameSource = audio.src === directUrl || decodeURIComponent(audio.src) === directUrl;
      audio.muted = false;
      audio.volume = 1;
      if (!sameSource) {
        audio.pause();
        audio.src = directUrl;
        audio.currentTime = 0;
        audio.load();
      } else if (restart) {
        audio.currentTime = 0;
      }
      await audio.play();
      playMusicTrack(track.id);
      setMusicPlayer({ trackId: track.id, playing: true, progress: restart || !sameSource ? 0 : musicPlayer.progress, duration: Number.isFinite(audio.duration) ? audio.duration : musicPlayer.duration });
      setMusicStatus('');
    } catch {
      setMusicPlayer({ trackId: track.id, playing: false, progress: 0 });
      setMusicStatus('这个音频源被浏览器或来源站点拦住了，换一首或换一个可直连音频源。');
    }
  };

  const play = (trackId?: string) => {
    const track = musicTracks.find((item) => item.id === (trackId || currentTrack?.id));
    if (!track) return;
    void playAudioUrl(track);
  };

  const togglePlay = () => {
    const audio = (document.getElementById('global-music-audio') as HTMLAudioElement | null) || audioRef.current;
    if (!currentTrack || !audio) return;
    if (musicPlayer.playing) {
      audio.pause();
      setMusicPlayer({ playing: false });
      return;
    }
    if (currentTrack.audioUrl && (audio.src === currentTrack.audioUrl || decodeURIComponent(audio.src) === currentTrack.audioUrl)) {
      audio.muted = false;
      audio.volume = 1;
      audio.play()
        .then(() => setMusicPlayer({ playing: true }))
        .catch(() => setMusicStatus('浏览器没有允许继续播放，请再点一次播放。'));
      return;
    }
    void playAudioUrl(currentTrack);
  };

  const moveTrack = (direction: 1 | -1) => {
    if (playableTracks.length === 0) return;
    const currentIndex = playableTracks.findIndex((track) => track.id === currentTrack?.id);
    const nextIndex = musicPlayer.shuffle
      ? Math.floor(Math.random() * playableTracks.length)
      : (currentIndex + direction + playableTracks.length) % playableTracks.length;
    play(playableTracks[nextIndex]?.id);
  };

  const searchAudiusMusic = async (term: string): Promise<MusicSearchResult[]> => {
    const response = await fetch(`https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(term)}&limit=24`);
    if (!response.ok) throw new Error(`Audius ${response.status}`);
    const data = await response.json();
    return Array.isArray(data?.data)
      ? data.data
          .filter((item: { id?: string; title?: string }) => item.id && item.title)
          .map((item: { id: string; title?: string; user?: { name?: string; handle?: string }; album?: string; artwork?: { '150x150'?: string; '480x480'?: string; '1000x1000'?: string }; permalink?: string }) => ({
            id: `audius-${item.id}`,
            sourceId: item.id,
            title: item.title || '未命名歌曲',
            artist: item.user?.name || item.user?.handle || 'Audius',
            album: item.album || 'Audius',
            cover: item.artwork?.['1000x1000'] || item.artwork?.['480x480'] || item.artwork?.['150x150'],
            audioUrl: `https://api.audius.co/v1/tracks/${item.id}/stream?app_name=small_phone_music`,
            sourceUrl: item.permalink,
            access: 'playable' as const,
            source: 'audius' as const,
          }))
      : [];
  };

  const searchNeteaseMusic = async (term: string): Promise<MusicSearchResult[]> => {
    const baseUrl = trimMusicBaseUrl(musicSourceConfig.neteaseBaseUrl);
    if (!baseUrl) return [];
    addAppLog({ type: 'music', title: 'NeteaseCloudMusicApi 搜索', detail: `${baseUrl}/search?keywords=${term}` });
    const searchResponse = await fetch(`${baseUrl}/search?keywords=${encodeURIComponent(term)}&limit=20&type=1`);
    if (!searchResponse.ok) throw new Error(`Netease ${searchResponse.status}`);
    const searchData = await searchResponse.json();
    const songs = pickFirstArray(searchData, ['result.songs', 'body.result.songs', 'songs']);
    return Promise.all(songs.map(async (raw): Promise<MusicSearchResult | null> => {
      const song = asMusicRecord(raw);
      const id = String(song.id || song.mid || song.songmid || '').trim();
      const title = musicText(song.name) || musicText(song.title);
      if (!id || !title) return null;
      const artists = Array.isArray(song.artists) ? song.artists : Array.isArray(song.ar) ? song.ar : [];
      const artist = artists.map((item) => musicText(asMusicRecord(item).name)).filter(Boolean).join(' / ') || '网易云';
      const albumRecord = asMusicRecord(song.album || song.al);
      let audioUrl = '';
      try {
        const urlResponse = await fetch(`${baseUrl}/song/url/v1?id=${encodeURIComponent(id)}&level=standard`);
        if (urlResponse.ok) {
          const urlData = await urlResponse.json();
          const urlItem = pickFirstArray(urlData, ['data', 'body.data'])[0];
          audioUrl = pickNestedText(asMusicRecord(urlItem), ['url']);
        }
      } catch {
        audioUrl = '';
      }
      return {
        id: `netease-${id}`,
        sourceId: id,
        title,
        artist,
        album: musicText(albumRecord.name) || '网易云',
        cover: pickNestedText(albumRecord, ['picUrl', 'cover', 'img1v1Url']),
        audioUrl: audioUrl || undefined,
        sourceUrl: `https://music.163.com/#/song?id=${id}`,
        access: audioUrl ? 'playable' : 'unplayable',
        source: 'netease',
      };
    })).then((results) => results.filter(Boolean) as MusicSearchResult[]);
  };

  const searchQqMusic = async (term: string): Promise<MusicSearchResult[]> => {
    const baseUrl = trimMusicBaseUrl(musicSourceConfig.qqBaseUrl);
    if (!baseUrl) return [];
    addAppLog({ type: 'music', title: 'QQ 音乐 API 搜索', detail: baseUrl });
    const endpoints = [
      `${baseUrl}/api/search?key=${encodeURIComponent(term)}&pageNo=1&pageSize=20`,
      `${baseUrl}/search?key=${encodeURIComponent(term)}&pageNo=1&pageSize=20`,
      `${baseUrl}/search?keyword=${encodeURIComponent(term)}&page=1&limit=20`,
    ];
    let searchData: unknown = null;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          searchData = await response.json();
          break;
        }
      } catch {
        searchData = null;
      }
    }
    const songs = pickFirstArray(searchData, ['data.list', 'data.song.list', 'data', 'list', 'result.songs']);
    return Promise.all(songs.map(async (raw): Promise<MusicSearchResult | null> => {
      const song = asMusicRecord(raw);
      const id = musicText(song.songmid) || musicText(song.mid) || String(song.id || '').trim();
      const title = musicText(song.songname) || musicText(song.name) || musicText(song.title);
      if (!id || !title) return null;
      const singers = Array.isArray(song.singer) ? song.singer : Array.isArray(song.singers) ? song.singers : [];
      const artist = singers.map((item) => musicText(asMusicRecord(item).name)).filter(Boolean).join(' / ') || musicText(song.artist) || 'QQ音乐';
      let audioUrl = musicText(song.url) || musicText(song.src);
      if (!audioUrl) {
        const urlEndpoints = [
          `${baseUrl}/api/song/url?id=${encodeURIComponent(id)}`,
          `${baseUrl}/song/url?id=${encodeURIComponent(id)}`,
          `${baseUrl}/song/url?mid=${encodeURIComponent(id)}`,
        ];
        for (const endpoint of urlEndpoints) {
          try {
            const response = await fetch(endpoint);
            if (!response.ok) continue;
            const urlData = await response.json();
            audioUrl = pickNestedText(asMusicRecord(urlData), ['data.url', 'data', 'url', 'src']);
            if (audioUrl) break;
          } catch {
            audioUrl = '';
          }
        }
      }
      const album = asMusicRecord(song.album);
      const albumMid = musicText(album.mid) || musicText(song.albummid);
      return {
        id: `qq-${id}`,
        sourceId: id,
        title,
        artist,
        album: musicText(album.name) || musicText(song.albumname) || 'QQ音乐',
        cover: musicText(song.pic) || musicText(song.cover) || (albumMid ? `https://y.qq.com/music/photo_new/T002R300x300M000${albumMid}.jpg` : undefined),
        audioUrl: audioUrl || undefined,
        sourceUrl: `https://y.qq.com/n/ryqq/songDetail/${id}`,
        access: audioUrl ? 'playable' : 'unplayable',
        source: 'qq',
      };
    })).then((results) => results.filter(Boolean) as MusicSearchResult[]);
  };

  const searchExternalMusic = async () => {
    const term = externalQuery.trim();
    if (!term) return;
    setSearchingMusic(true);
    setMusicStatus('');
    try {
      const enabledSources = [
        searchAudiusMusic(term),
        musicSourceConfig.neteaseBaseUrl.trim() ? searchNeteaseMusic(term) : Promise.resolve([]),
        musicSourceConfig.qqBaseUrl.trim() ? searchQqMusic(term) : Promise.resolve([]),
      ];
      const settled = await Promise.allSettled(enabledSources);
      const results = settled.flatMap((item) => item.status === 'fulfilled' ? item.value : []);
      const failedCount = settled.filter((item) => item.status === 'rejected').length;
      setMusicSearchResults(results);
      setShowSearchResults(true);
      setMusicStatus(results.length > 0 ? `搜到 ${results.length} 首，来自 ${new Set(results.map((item) => searchSourceLabel(item))).size} 个来源。${failedCount ? `有 ${failedCount} 个来源没连上。` : ''}` : '没有搜到可听结果。');
    } catch {
      setMusicSearchResults([]);
      setShowSearchResults(true);
      setMusicStatus('搜索失败，可以先用上传或 URL。');
    } finally {
      setSearchingMusic(false);
    }
  };

  const resolveSearchResultAudioUrl = async (result: MusicSearchResult) => {
    if (result.audioUrl) return result.audioUrl;
    const id = result.sourceId || result.id.replace(/^(netease|qq)-/, '');
    if (result.source === 'netease') {
      const baseUrl = trimMusicBaseUrl(musicSourceConfig.neteaseBaseUrl);
      if (!baseUrl || !id) return '';
      const response = await fetch(`${baseUrl}/song/url/v1?id=${encodeURIComponent(id)}&level=standard`);
      if (!response.ok) return '';
      const data = await response.json();
      const item = pickFirstArray(data, ['data', 'body.data'])[0];
      return pickNestedText(asMusicRecord(item), ['url']);
    }
    if (result.source === 'qq') {
      const baseUrl = trimMusicBaseUrl(musicSourceConfig.qqBaseUrl);
      if (!baseUrl || !id) return '';
      const endpoints = [
        `${baseUrl}/api/song/url?id=${encodeURIComponent(id)}`,
        `${baseUrl}/song/url?id=${encodeURIComponent(id)}`,
        `${baseUrl}/song/url?mid=${encodeURIComponent(id)}`,
      ];
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          if (!response.ok) continue;
          const data = await response.json();
          const url = pickNestedText(asMusicRecord(data), ['data.url', 'data', 'url', 'src']);
          if (url) return url;
        } catch {
          // try next shape
        }
      }
    }
    return '';
  };

  const playableSearchResult = async (result: MusicSearchResult) => {
    const audioUrl = await resolveSearchResultAudioUrl(result);
    if (!audioUrl) return null;
    return { ...result, audioUrl, access: 'playable' as const };
  };

  const playSearchResult = async (result: MusicSearchResult) => {
    const resolved = await playableSearchResult(result);
    if (!resolved) {
      setMusicStatus('这条结果暂时没有从 API 拿到可播放地址，换一首或检查 NeteaseCloudMusicApi / QQ API 是否运行。');
      return;
    }
    const existing = musicTracks.find((track) => track.audioUrl === resolved.audioUrl);
    const id = existing?.id || addMusicTrack({
        title: resolved.title,
        artist: resolved.artist,
        album: resolved.album,
        cover: resolved.cover,
        audioUrl: resolved.audioUrl,
        lyrics: '',
        tags: [sourceTag(resolved), '可听'],
        source: 'browser',
        liked: false,
      });
    if (quickPlaylistId) addTrackToMusicPlaylist(quickPlaylistId, id);
    const track: MusicTrack = existing || {
      id,
      title: resolved.title,
      artist: resolved.artist,
      album: resolved.album,
      cover: resolved.cover,
      audioUrl: resolved.audioUrl,
      lyrics: '',
      tags: [sourceTag(resolved), '可听'],
      liked: false,
      playCount: 0,
      source: 'browser',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setTab('player');
    await playAudioUrl(track, resolved.audioUrl, true);
  };

  const likeSearchResult = async (result: MusicSearchResult) => {
    const resolved = await playableSearchResult(result);
    if (!resolved) {
      setMusicStatus('这条结果暂时没有从 API 拿到可播放地址，不能加入我喜欢。');
      return;
    }
    const existing = musicTracks.find((track) => track.audioUrl === resolved.audioUrl);
    const id = existing?.id || addMusicTrack({
      title: resolved.title,
      artist: resolved.artist,
      album: resolved.album,
      cover: resolved.cover,
      audioUrl: resolved.audioUrl,
      lyrics: '',
      tags: [sourceTag(resolved), '可听'],
      source: 'browser',
      liked: false,
    });
    if (!existing?.liked) toggleMusicTrackLiked(id);
    setMusicStatus('已加入我喜欢。');
  };

  const addSearchResultToLibrary = async (result: MusicSearchResult) => {
    const resolved = await playableSearchResult(result);
    if (!resolved) {
      setMusicStatus('这条结果暂时没有从 API 拿到可播放地址，不能导入曲库。');
      return;
    }
    const existing = musicTracks.find((track) => track.audioUrl === resolved.audioUrl);
    const id = existing?.id || addMusicTrack({
      title: resolved.title,
      artist: resolved.artist,
      album: resolved.album,
      cover: resolved.cover,
      audioUrl: resolved.audioUrl,
      lyrics: '',
      tags: [sourceTag(resolved), '可听'],
      source: 'browser',
      liked: false,
    });
    if (quickPlaylistId) addTrackToMusicPlaylist(quickPlaylistId, id);
    setMusicStatus(quickPlaylistId ? '已加入曲库和选中的歌单。' : '已加入曲库。');
  };

  const playDemoSound = () => {
    void playSearchResult(demoMusicResult);
  };

  const addCustomUrlTrack = () => {
    const url = customUrl.trim();
    if (!url) {
      setMusicStatus('先填一个可以直接播放的音频 URL。');
      return;
    }
    const title = customTitle.trim() || decodeURIComponent(url.split('/').pop()?.split('?')[0] || '自定义音频');
    const trackPayload = {
      title,
      artist: '自有音源',
      album: 'URL 导入',
      cover: 'linear-gradient(135deg,#111,#7e1114)',
      audioUrl: url,
      lyrics: `${title}\n歌词未检测到\n可以在后续歌词编辑里补充`,
      tags: ['自有URL', '可听'],
      source: 'manual' as const,
      liked: false,
    };
    const id = addMusicTrack(trackPayload);
    setCustomUrl('');
    setCustomTitle('');
    setMusicStatus('已加入曲库，正在播放。');
    void playAudioUrl({ ...trackPayload, id, playCount: 0, createdAt: Date.now(), updatedAt: Date.now() });
    setTab('player');
  };

  const addUploadedTrack = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const title = file.name.replace(/\.[^.]+$/, '');
    const trackPayload = {
      title,
      artist: '本地上传',
      album: '上传 MP3',
      cover: 'linear-gradient(135deg,#050505,#324c4a)',
      audioUrl: url,
      lyrics: `${title}\n本地音频已导入\n暂无内嵌歌词解析`,
      tags: ['本地上传', '可听'],
      source: 'manual' as const,
      liked: false,
    };
    const id = addMusicTrack(trackPayload);
    setMusicStatus('本地 MP3 已加入本次会话曲库并开始播放。');
    void playAudioUrl({ ...trackPayload, id, playCount: 0, createdAt: Date.now(), updatedAt: Date.now() });
    setTab('player');
  };

  const startTogether = () => {
    if (!currentTrack?.audioUrl) {
      setMusicStatus('先在曲库里播放一首能出声的歌，再开始一起听。');
      return;
    }
    setListenStartedAt(Date.now());
    setListenElapsed(0);
    setListenGreeting(listenCharacter ? `${listenCharacter.name}：我进来了，先听这一首。` : '等好友加入中...');
    void playAudioUrl(currentTrack);
  };

  const stopTogether = () => {
    if (!currentTrack || !listenStartedAt) return;
    const durationSeconds = Math.max(1, Math.floor((Date.now() - listenStartedAt) / 1000));
    addMusicListenRecord({
      trackId: currentTrack.id,
      characterId: listenCharacterId || undefined,
      mood: '一起听',
      note: listenCharacter ? `和 ${listenCharacter.name} 一起听了 ${formatMusicDuration(durationSeconds)}` : `一起听了 ${formatMusicDuration(durationSeconds)}`,
      durationSeconds,
    });
    setListenStartedAt(null);
    setListenElapsed(0);
    setListenGreeting(listenCharacter ? `${listenCharacter.name}：下次继续一起听。` : '一起听已结束。');
    setMusicStatus('一起听记录已保存。');
  };

  const uploadMyMusicAvatar = (file?: File) => {
    if (!file) return;
    setUserAvatar(URL.createObjectURL(file));
  };

  const startNewPlaylist = () => {
    setEditingPlaylistId(null);
    setPlaylistDraft(musicPlaylistDraft());
    setShowCoverPicker(false);
  };

  const startEditPlaylist = (playlist: MusicPlaylist) => {
    setEditingPlaylistId(playlist.id);
    setSelectedPlaylistId(playlist.id);
    setPlaylistDraft(musicPlaylistDraft(playlist));
    setShowCoverPicker(false);
  };

  const savePlaylist = () => {
    const payload = {
      name: playlistDraft.name,
      description: playlistDraft.description,
      cover: playlistDraft.cover,
      trackIds: playlistDraft.trackIds,
      source: 'manual' as const,
      favorite: false,
    };
    const id = editingPlaylistId || addMusicPlaylist(payload);
    if (editingPlaylistId) updateMusicPlaylist(editingPlaylistId, payload);
    setSelectedPlaylistId(id);
    setEditingPlaylistId(null);
    setPlaylistDraft(musicPlaylistDraft());
    setShowCoverPicker(false);
  };

  const saveCharSongTrack = (payload: { title: string; mood: string; melody: string; arrangement: string; lyrics: string; character: Character; audioUrl?: string }) => {
    const lyrics = cleanLyricsText(payload.lyrics) || fallbackSongLyrics(payload.title, payload.character);
    return addMusicTrack({
      title: payload.title,
      artist: payload.character.name,
      album: 'char 创作',
      cover: payload.character.avatar || 'linear-gradient(135deg,#050505,#7e1114)',
      audioUrl: payload.audioUrl || '',
      lyrics,
      melody: payload.melody,
      arrangement: payload.arrangement,
      characterId: payload.character.id,
      tags: ['char创作', ...payload.mood.split(/[，,、\s]+/).filter(Boolean).slice(0, 4)],
      source: 'char',
      liked: true,
    });
  };

  const readSongSection = (text: string, label: string) => {
    const bracketPattern = new RegExp(`【${label}】([\\s\\S]*?)(?=\\n【|$)`);
    const bracket = text.match(bracketPattern)?.[1]?.trim();
    if (bracket) return bracket;
    const loosePattern = new RegExp(`(?:^|\\n)\\s*(?:#+\\s*)?${label}\\s*[:：]\\s*([\\s\\S]*?)(?=\\n\\s*(?:#+\\s*)?(?:歌名|风格|旋律|编曲|歌词)\\s*[:：]|$)`);
    return text.match(loosePattern)?.[1]?.trim() || '';
  };

  const cleanLyricsText = (text?: string) => {
    if (!text) return '';
    const section = readSongSection(text, '歌词') || text
      .replace(/【歌名】[\s\S]*?(?=\n【|$)/g, '')
      .replace(/【风格】[\s\S]*?(?=\n【|$)/g, '')
      .replace(/【旋律】[\s\S]*?(?=\n【|$)/g, '')
      .replace(/【编曲】[\s\S]*?(?=\n【|$)/g, '')
      .replace(/【歌词】/g, '')
      .trim();
    return section
      .split('\n')
      .filter((line) => !/^\s*(旋律|编曲|风格|说明|歌名)[:：]/.test(line))
      .join('\n')
      .trim();
  };

  const fallbackSongLyrics = (songTitle: string, character: Character) => [
    `《${songTitle}》`,
    '把灯关小一点，让心事慢慢靠近',
    `${character.name} 在耳机另一边，轻轻喊你的姓名`,
    '主歌像雨落在窗沿，副歌把夜色唱明',
    '如果世界忽然安静，我就用这首歌回应',
    '',
    '你听见了吗，风也放慢了呼吸',
    '我把想念写成旋律，绕过人群奔向你',
    '就算明天隔着很远很远的距离',
    '这句副歌还会替我，停在你掌心',
  ].join('\n');

  const getMiniMaxMusicApiKey = () => (
    musicSourceConfig.minimaxApiKey.trim() ||
    (ttsConfig.provider === 'minimax' ? ttsConfig.apiKey.trim() : '')
  );

  const buildCharMusicPrompt = (payload: { character: Character; mood: string; melody: string; arrangement: string }) => [
    payload.mood,
    `${payload.character.name} character song, emotional vocal performance`,
    payload.melody && `Melody: ${payload.melody}`,
    payload.arrangement && `Arrangement: ${payload.arrangement}`,
    'Full song, polished pop production, clear vocal, no narration',
  ].filter(Boolean).join('. ');

  const requestMiniMaxMusicAudio = async (payload: { title: string; mood: string; melody: string; arrangement: string; lyrics: string; character: Character }) => {
    const minimaxApiKey = getMiniMaxMusicApiKey();
    if (!minimaxApiKey) {
      throw new Error('先填写 MiniMax 音乐 API Key。');
    }

    const lyrics = formatMiniMaxLyrics(cleanLyricsText(payload.lyrics) || fallbackSongLyrics(payload.title, payload.character));
    const request = buildMiniMaxMusicGenerationRequest({
      apiKey: minimaxApiKey,
      baseUrl: musicSourceConfig.minimaxBaseUrl,
      model: musicSourceConfig.minimaxModel,
      prompt: buildCharMusicPrompt(payload),
      lyrics,
    });

    addAppLog({
      type: 'music',
      title: '发送 MiniMax 音乐生成请求',
      detail: JSON.stringify({
        endpoint: request.url,
        model: musicSourceConfig.minimaxModel || 'music-2.6',
        title: payload.title,
        prompt: buildCharMusicPrompt(payload),
        lyrics,
      }, null, 2),
    });

    const response = await fetch(request.url, request.init);
    const text = await response.text();
    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error('MiniMax 音乐返回的不是 JSON。');
    }
    if (!response.ok) {
      throw new Error(`MiniMax 音乐生成失败：${response.status}`);
    }

    const audio = extractMiniMaxMusicAudio(data);
    addAppLog({ type: 'music', title: 'MiniMax 音乐生成返回', detail: JSON.stringify({ kind: audio.kind, durationMs: audio.durationMs }, null, 2) });
    return {
      audioUrl: audio.kind === 'url' ? audio.audio : hexToAudioBlobUrl(audio.audio),
      durationSeconds: audio.durationMs ? Math.max(1, Math.round(audio.durationMs / 1000)) : 0,
    };
  };

  const generateMusicAudioForSong = async (track?: MusicTrack) => {
    const character = track?.characterId
      ? characters.find((item) => item.id === track.characterId) || charWriter
      : charWriter;
    if (!character) {
      setCharSongStatus('先导入或选择一个 char。');
      return;
    }
    if (!getMiniMaxMusicApiKey()) {
      setCharSongStatus('先在这里填写 MiniMax 音乐 API Key，或在设置里选 MiniMax TTS 并填 key。');
      return;
    }

    const title = track?.title || charSongDraft.title.trim() || `${character.name} 写给你的歌`;
    const mood = track?.tags.filter((tag) => tag !== 'char创作').join('、') || charSongDraft.mood.trim() || '想念、夜晚、耳机共享';
    const melody = track?.melody || charSongDraft.melody.trim() || '主歌低声，副歌上扬，hook 重复歌名。';
    const arrangement = track?.arrangement || charSongDraft.arrangement.trim() || '电钢、轻鼓、合成器 pad，副歌加入和声。';
    const lyrics = cleanLyricsText(track?.lyrics || charSongDraft.lyrics) || fallbackSongLyrics(title, character);

    setGeneratingCharSong(true);
    setCharSongStatus('正在生成音乐音频...');
    try {
      const musicAudio = await requestMiniMaxMusicAudio({ title, mood, melody, arrangement, lyrics, character });
      if (track) {
        updateMusicTrack(track.id, { audioUrl: musicAudio.audioUrl });
        setMusicPlayer({ trackId: track.id, playing: true, progress: 0, duration: musicAudio.durationSeconds });
      } else {
        const id = saveCharSongTrack({ title, mood, melody, arrangement, lyrics, character, audioUrl: musicAudio.audioUrl });
        setMusicPlayer({ trackId: id, playing: true, progress: 0, duration: musicAudio.durationSeconds });
        setCharSongDraft({ characterId: character.id, title, mood, melody, arrangement, lyrics });
      }
      setCharSongStatus('音乐已生成，并保存到这个 char 名下。');
    } catch (error) {
      setCharSongStatus(error instanceof Error ? error.message : 'MiniMax 音乐生成失败。');
    } finally {
      setGeneratingCharSong(false);
    }
  };

  const generateCharSong = async () => {
    const character = charWriter;
    if (!character) {
      setCharSongStatus('先导入或选择一个 char。');
      return;
    }
    const title = charSongDraft.title.trim() || `${character.name} 写给你的歌`;
    const mood = charSongDraft.mood.trim() || '想念、夜晚、耳机共享';
    const manualMelody = charSongDraft.melody.trim();
    const manualArrangement = charSongDraft.arrangement.trim();
    const manualLyrics = charSongDraft.lyrics.trim();
    const pastSongs = musicTracks
      .filter((track) => track.source === 'char' && (track.characterId === character.id || track.artist === character.name))
      .slice(0, 6)
      .map((track) => `- ${track.title}：${track.tags.join('、')}${track.melody ? `；旋律：${track.melody}` : ''}`)
      .join('\n') || '暂无';
    const recentTalk = Object.values(chatSessions)
      .filter((session) => session.characterId === character.id)
      .flatMap((session) => session.messages.slice(-8).map((message) => `${message.role === 'user' ? '用户' : character.name}：${describeChatMessage(message)}`))
      .slice(-16)
      .join('\n') || '暂无';

    if (apiBaseUrl && selectedModel) {
      setGeneratingCharSong(true);
      setCharSongStatus('正在创作歌曲...');
      try {
        const songMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
          {
            role: 'system',
            content: [
              '你是手机音乐 App 里的歌曲创作助手，要根据角色人设和历史创作真正写一首歌。',
              '不要写解释，不要写教学。只输出以下五个栏目，栏目名必须完整保留：',
              '【歌名】',
              '【风格】',
              '【旋律】',
              '【编曲】',
              '【歌词】',
              '旋律要能让人想象怎么唱，例如主歌/副歌走向、音域、节奏、重复 hook。',
              '编曲要包含乐器、速度、段落结构和情绪推进。',
              '【歌词】里必须至少写两段主歌和一段副歌，只能写真正会唱出来的歌词，不许混入旋律、编曲、解释、旁白或小标题。',
              musicPresetPrompt,
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              `角色人设：\n${getCharacterPrompt(character)}`,
              `世界书/浏览器世界书：\n${browserWorldBook || '暂无'}`,
              `最近聊天：\n${recentTalk}`,
              `过去这个 char 创作过的歌曲：\n${pastSongs}`,
              `这次想写的歌名：${title}`,
              `情绪/关键词：${mood}`,
              `用户已有旋律想法：${manualMelody || '可由你创作'}`,
              `用户已有编曲想法：${manualArrangement || '可由你创作'}`,
              `用户已有歌词方向：\n${manualLyrics || '可由你创作完整歌词'}`,
            ].join('\n\n'),
          },
        ];
        addAppLog({ type: 'ai', title: '发送 char 写歌请求', detail: JSON.stringify({ model: selectedModel, messages: songMessages }, null, 2) });
        const content = await requestChatCompletion({
          baseUrl: apiBaseUrl,
          apiKey,
          model: selectedModel,
          temperature: chatTemperature || 0.85,
          maxTokens: 1100,
          messages: songMessages,
        });
        addAppLog({ type: 'ai', title: 'char 写歌返回', detail: content });
        const nextTitle = readSongSection(content, '歌名') || title;
        const style = readSongSection(content, '风格') || mood;
        const melody = readSongSection(content, '旋律') || manualMelody || '主歌低声靠近，副歌抬高半个八度，结尾用一句重复 hook 收住。';
        const arrangement = readSongSection(content, '编曲') || manualArrangement || '中速鼓组、干净电钢、低频合成器，副歌加入和声铺底。';
        const lyrics = cleanLyricsText(readSongSection(content, '歌词') || manualLyrics || content.trim()) || fallbackSongLyrics(nextTitle, character);
        let audioUrl = '';
        let durationSeconds = 0;
        let audioError = '';
        if (getMiniMaxMusicApiKey()) {
          setCharSongStatus('歌词写好了，正在生成音乐音频...');
          try {
            const musicAudio = await requestMiniMaxMusicAudio({ title: nextTitle, mood: style, melody, arrangement, lyrics, character });
            audioUrl = musicAudio.audioUrl;
            durationSeconds = musicAudio.durationSeconds;
          } catch (error) {
            audioError = error instanceof Error ? error.message : 'MiniMax 音乐生成失败。';
          }
        }
        const trackId = saveCharSongTrack({ title: nextTitle, mood: style, melody, arrangement, lyrics, character, audioUrl });
        if (audioUrl) setMusicPlayer({ trackId, playing: true, progress: 0, duration: durationSeconds });
        setCharSongDraft({ characterId: character.id, title: nextTitle, mood: style, melody, arrangement, lyrics });
        setCharSongStatus(audioUrl ? '已创作、生成音乐，并保存到这个 char 名下。' : audioError ? `已写歌并保存；音乐生成失败：${audioError}` : '已创作并保存到这个 char 名下。');
      } catch {
        setCharSongStatus('AI 创作失败，已用当前填写内容保存一版。');
        const lyrics = manualLyrics || [
          `${title}`,
          `你把今天藏进耳机里`,
          `${character.name} 在另一端轻轻回应`,
          `如果世界忽然安静`,
          `这首歌就替我靠近你`,
        ].join('\n');
        saveCharSongTrack({
          title,
          mood,
          melody: manualMelody || '主歌轻声，副歌旋律上扬，最后一句回到低音区。',
          arrangement: manualArrangement || '慢速鼓点、木吉他、电钢和轻微环境音。',
          lyrics,
          character,
        });
      } finally {
        setGeneratingCharSong(false);
      }
      return;
    }

    const lyrics = manualLyrics || [
      `${title}`,
      `你把今天藏进耳机里`,
      `${character.name} 在另一端轻轻回应`,
      `如果世界忽然安静`,
      `这首歌就替我靠近你`,
    ].join('\n');
    const melody = manualMelody || '主歌低声、短句，副歌上扬并重复歌名，结尾把最后一句放慢。';
    const arrangement = manualArrangement || '72 BPM，电钢和轻鼓开场，副歌加入合成器 pad 与低声和声。';
    const shouldGenerateAudio = Boolean(getMiniMaxMusicApiKey());
    let audioUrl = '';
    let durationSeconds = 0;
    let audioError = '';
    if (shouldGenerateAudio) {
      setGeneratingCharSong(true);
      setCharSongStatus('正在生成音乐音频...');
      try {
        const musicAudio = await requestMiniMaxMusicAudio({ title, mood, melody, arrangement, lyrics, character });
        audioUrl = musicAudio.audioUrl;
        durationSeconds = musicAudio.durationSeconds;
      } catch (error) {
        audioError = error instanceof Error ? error.message : 'MiniMax 音乐生成失败。';
      } finally {
        setGeneratingCharSong(false);
      }
    }
    const trackId = saveCharSongTrack({
      title,
      mood,
      melody,
      arrangement,
      lyrics,
      character,
      audioUrl,
    });
    if (audioUrl) setMusicPlayer({ trackId, playing: true, progress: 0, duration: durationSeconds });
    setCharSongDraft({ characterId: character.id, title, mood, melody, arrangement, lyrics });
    setCharSongStatus(audioUrl ? '已生成音乐，并保存到这个 char 名下。' : audioError ? `已保存歌词；音乐生成失败：${audioError}` : '已保存到这个 char 名下。配置 AI 后可以按人设和历史创作更完整版本。');
  };

  const singWithTts = async (track?: MusicTrack) => {
    const title = track?.title || charSongDraft.title || 'char 创作歌曲';
    const text = cleanLyricsText(track?.lyrics || charSongDraft.lyrics);
    const melody = track?.melody || charSongDraft.melody;
    const arrangement = track?.arrangement || charSongDraft.arrangement;
    if (!ttsEnabled) {
      setCharSongStatus('先接 TTS/歌声模型。');
      return;
    }
    if (!text) {
      setCharSongStatus('先写几句歌词，再接 TTS/歌声模型。');
      return;
    }
    const endpoint = ttsConfig.baseUrl.trim();
    if (!endpoint) {
      setCharSongStatus('先在设置里填写 TTS/歌声模型接口。');
      return;
    }
    setCharSongStatus('正在发送给 TTS/歌声模型...');
    addAppLog({ type: 'tts', title: '发送唱歌请求', detail: JSON.stringify({ endpoint, title, voice: ttsConfig.voiceId, melody, arrangement, lyrics: text }, null, 2) });
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          lyrics: text,
          title,
          melody,
          arrangement,
          voice: ttsConfig.voiceId,
          voiceId: ttsConfig.voiceId,
          mode: 'sing',
        }),
      });
      if (!response.ok) throw new Error(`TTS 失败：${response.status}`);
      const contentType = response.headers.get('content-type') || '';
      let audioUrl = '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        audioUrl = musicText(data?.audioUrl) || musicText(data?.url) || musicText(data?.data?.audioUrl) || musicText(data?.data?.url);
      } else {
        audioUrl = URL.createObjectURL(await response.blob());
      }
      if (!audioUrl) throw new Error('TTS 没有返回音频地址');
      const targetId = track?.id || activeCharSong?.id;
      if (targetId) updateMusicTrack(targetId, { audioUrl });
      setCharSongStatus('唱歌音频已生成，正在播放。');
      addAppLog({ type: 'success', title: '唱歌音频生成成功', detail: audioUrl });
      const targetTrack = track || activeCharSong;
      if (targetTrack) {
        await playAudioUrl({ ...targetTrack, audioUrl }, audioUrl);
        setTab('player');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'TTS/歌声模型调用失败';
      setCharSongStatus(message);
      addAppLog({ type: 'error', title: '唱歌失败', detail: message });
    }
  };

  const renderPlayer = () => (
    <div
      className="mx-4 mt-4 overflow-hidden rounded-[30px] border-[3px] border-[#111] bg-cover bg-center shadow-[3px_4px_0_rgba(0,0,0,0.16)]"
      style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.42), rgba(0,0,0,.72))${playerBackgroundImage ? `, url(${playerBackgroundImage})` : ''}` }}
    >
      <div className="p-5 text-white">
        <div className="grid place-items-center">
          <button onClick={() => setShowPlayerLyrics(!showPlayerLyrics)} className={cn('relative w-full max-w-[260px] overflow-hidden shadow-[0_12px_26px_rgba(0,0,0,.35)]', showPlayerLyrics ? 'min-h-56 rounded-[28px] bg-black/35 p-4' : 'h-48 w-48 rounded-full border-[8px] border-[#050505] bg-[radial-gradient(circle,#f6f1e8_0_15%,#111_16%_22%,#050505_23%_100%)]')} title="点击切换唱片/歌词">
            {showPlayerLyrics ? (
              <div className="max-h-52 overflow-y-auto text-center text-sm font-bold leading-7">
                {currentTrack?.lyrics ? currentTrack.lyrics.split('\n').map((line, index) => <p key={`${line}-${index}`}>{line}</p>) : <p className="opacity-70">暂无歌词</p>}
              </div>
            ) : (
              <div className={cn('absolute inset-7 overflow-hidden rounded-full border-[4px] border-[#111] bg-cover bg-center', musicPlayer.playing && 'animate-spin')} style={{ animationDuration: '9s' }}>
                <MusicCover track={currentTrack} className="h-full w-full rounded-full border-0 shadow-none" />
              </div>
            )}
          </button>
          <h2 className="mt-5 line-clamp-2 text-center text-2xl font-black leading-tight">{currentTrack?.title || '先点一首歌'}</h2>
          <p className="mt-1 line-clamp-1 text-center text-sm font-bold opacity-80">{currentTrack?.artist || '曲库测试音源可直接播放'}</p>
        </div>
        <select value={playerBackground} onChange={(event) => setPlayerBackground(event.target.value)} className="hand-input mt-4 w-full text-sm text-[#111]">
          <option value="">背景图：跟随歌曲封面</option>
          {galleryPhotos.map((photo) => <option key={photo.id} value={photo.url}>背景图：{photo.title}</option>)}
        </select>
        <div className="mt-4">
          <input
            type="range"
            min="0"
            max="100"
            value={musicPlayer.progress}
            onChange={(event) => {
              const progress = Number(event.target.value);
              const audio = (document.getElementById('global-music-audio') as HTMLAudioElement | null) || audioRef.current;
              if (audio && musicPlayer.duration > 0) audio.currentTime = (progress / 100) * musicPlayer.duration;
              setMusicPlayer({ progress });
            }}
            className="w-full accent-[var(--accent)]"
          />
          <div className="mt-1 flex justify-between text-xs font-black opacity-60">
            <span>{formatMusicTime(((musicPlayer.progress || 0) / 100) * (musicPlayer.duration || 0))}</span>
            <span>{formatMusicTime(musicPlayer.duration || 0)}</span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => setMusicPlayer({ shuffle: !musicPlayer.shuffle })} className={cn('flex h-12 w-12 items-center justify-center rounded-full border-[2px] border-white/35 bg-black/65 text-white', musicPlayer.shuffle && 'bg-[#d64545]')} title="随机"><Shuffle className="h-5 w-5" /></button>
          <button onClick={() => moveTrack(-1)} className="flex h-12 w-12 items-center justify-center rounded-full border-[2px] border-white/35 bg-black/65 text-white" title="上一首"><SkipBack className="h-5 w-5" /></button>
          <button onClick={togglePlay} className="rounded-full border-[2px] border-white/60 bg-[#d64545] px-5 py-3 text-sm font-black text-white shadow-[0_10px_22px_rgba(0,0,0,.35)]" title={musicPlayer.playing ? '暂停' : '继续'}>
            {musicPlayer.playing ? <Pause className="mr-1 inline h-5 w-5" /> : <Play className="mr-1 inline h-5 w-5 fill-current" />}
            {musicPlayer.playing ? '暂停' : '播放'}
          </button>
          <button onClick={() => moveTrack(1)} className="flex h-12 w-12 items-center justify-center rounded-full border-[2px] border-white/35 bg-black/65 text-white" title="下一首"><SkipForward className="h-5 w-5" /></button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => setMusicPlayer({ repeat: !musicPlayer.repeat })} className={cn('rounded-2xl border-[2px] border-white/35 bg-black/55 px-3 py-2 text-xs font-black text-white', musicPlayer.repeat && 'bg-[#d64545]')}><RefreshCw className="mr-1 inline h-4 w-4" />单曲循环</button>
          <button onClick={() => setShowQueue(!showQueue)} className={cn('rounded-2xl border-[2px] border-white/35 bg-black/55 px-3 py-2 text-xs font-black text-white', showQueue && 'bg-[#d64545]')}><MoreHorizontal className="mr-1 inline h-4 w-4" />播放队列</button>
        </div>
        {showQueue && (
          <div className="mt-3 max-h-56 overflow-y-auto rounded-3xl bg-black/25 p-2">
            {musicPlaylists.length > 0 && (
              <div className="mb-2 border-b border-white/15 pb-2">
                <p className="px-3 pb-1 text-[10px] font-black opacity-70">歌单</p>
                {musicPlaylists.map((playlist) => (
                  <button key={playlist.id} onClick={() => { setSelectedPlaylistId(playlist.id); setLibraryView('playlist-detail'); setTab('library'); }} className="grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-black">
                    <span className="truncate">{playlist.name}</span>
                    <span className="opacity-65">{playlist.trackIds.length} 首</span>
                  </button>
                ))}
              </div>
            )}
            <p className="px-3 pb-1 text-[10px] font-black opacity-70">当前可播放列表</p>
            {playableTracks.map((track) => (
              <button key={track.id} onClick={() => play(track.id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-black">
                <span className="truncate">{track.title}</span>
                {track.id === currentTrack?.id && <Headphones className="h-4 w-4" />}
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 rounded-[28px] border-[2px] border-white/25 bg-black/30 p-3">
          <div className="mb-3 flex items-center justify-center gap-4">
            <label className="grid cursor-pointer place-items-center gap-1">
              <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-white/80 text-[#111]">
                {userAvatar ? <img src={userAvatar} className="h-full w-full object-cover" /> : <Headphones className="h-6 w-6" />}
              </span>
              <span className="text-[10px] font-black opacity-80">我</span>
              <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadMyMusicAvatar(event.target.files?.[0])} />
            </label>
            <div className="max-w-[108px] text-center text-xs font-black opacity-85">{listenStartedAt ? listenGreeting : '等待好友加入'}</div>
            <div className="grid place-items-center gap-1">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-white/80 text-[#111]">
                {listenCharacter?.avatar ? <img src={listenCharacter.avatar} className="h-full w-full object-cover" /> : <CircleUserRound className="h-7 w-7" />}
              </div>
              <span className="max-w-[70px] truncate text-[10px] font-black opacity-80">{listenCharacter?.name || 'char'}</span>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <select value={listenCharacterId} onChange={(event) => setListenCharacterId(event.target.value)} className="hand-input min-w-0 text-sm text-[#111]">
              <option value="">选择一起听的 char</option>
              {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
            </select>
            <span className="rounded-2xl border-[2px] border-white/30 bg-black/60 px-3 py-2 text-xs font-black text-white">{listenStartedAt ? formatMusicDuration(listenElapsed) : '未开始'}</span>
          </div>
          <button onClick={listenStartedAt ? stopTogether : startTogether} className="mt-2 w-full rounded-2xl border-[2px] border-white/40 bg-black/70 px-3 py-2 text-sm font-black text-white">
            {listenStartedAt ? '结束一起听并记录' : '开始一起听'}
          </button>
          <p className="mt-2 text-center text-[10px] font-black opacity-70">{listenStartedAt ? '一起听中' : listenCharacter ? '已加入，等你开始' : '等待好友加入'}</p>
        </div>
      </div>
    </div>
  );

  return (
    <section className="music-screen no-scrollbar h-full overflow-y-auto overflow-x-hidden overscroll-contain pb-5">
      <Header
        title="音乐"
        subtitle={currentTrack ? `${currentTrack.title} · ${musicPlayer.playing ? '播放中' : '暂停'}` : '搜索后点击即可播放'}
        onBack={
          activeCharSongId
            ? () => setActiveCharSongId(null)
            : tab !== 'library'
              ? () => setTab('library')
              : libraryView !== 'index'
                ? () => setLibraryView('index')
                : undefined
        }
        tabs={
          <>
            <Pill icon={<Search />} label="曲库" active={tab === 'library'} onClick={() => setTab('library')} />
            <Pill icon={<Headphones />} label="听歌" active={tab === 'player'} onClick={() => setTab('player')} />
            <Pill icon={<Sparkles />} label="char创作" active={tab === 'char'} onClick={() => setTab('char')} />
            <Pill icon={<CircleUserRound />} label="我的" active={tab === 'me'} onClick={() => setTab('me')} />
          </>
        }
      />

      {tab === 'player' && renderPlayer()}

      {tab === 'library' && libraryView !== 'index' && (
        <div className="mx-4 mt-4">
          <button onClick={() => setLibraryView('index')} className="circle-button small" title="返回曲库"><ChevronLeft className="h-4 w-4" /></button>
        </div>
      )}

      {tab === 'library' && libraryView === 'index' && (
        <>
          <Panel>
            <h3 className="mb-3 text-xl font-black">曲库</h3>
            <button onClick={() => setLibraryView('liked')} className="flex w-full items-center gap-3 border-b-[2px] border-[#111]/15 py-4 text-left">
              <span className="app-chip"><Heart className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-lg font-black">我喜欢</span><span className="block truncate text-xs font-bold opacity-60">{likedTracks.length} 首</span></span>
              <ChevronRight className="h-5 w-5" />
            </button>
            <button onClick={() => setLibraryView('playlists')} className="flex w-full items-center gap-3 border-b-[2px] border-[#111]/15 py-4 text-left">
              <span className="app-chip"><Star className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-lg font-black">歌单</span><span className="block truncate text-xs font-bold opacity-60">{musicPlaylists.length} 张</span></span>
              <ChevronRight className="h-5 w-5" />
            </button>
            <button onClick={() => setLibraryView('history')} className="flex w-full items-center gap-3 py-4 text-left">
              <span className="app-chip"><Clock className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-lg font-black">历史</span><span className="block truncate text-xs font-bold opacity-60">{musicListenRecords.length} 条记录</span></span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </Panel>
          <Panel>
            <h3 className="mb-3 text-xl font-black">搜索音乐</h3>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input value={externalQuery} onChange={(event) => setExternalQuery(event.target.value)} className="hand-input min-w-0 text-sm" placeholder="搜歌名 / 歌手" />
              <button onClick={searchExternalMusic} disabled={searchingMusic} className="circle-button" title="搜索"><Search className="h-5 w-5" /></button>
            </div>
            <div className="mt-3 grid gap-2">
              <input
                value={musicSourceConfig.neteaseBaseUrl}
                onChange={(event) => setMusicSourceConfig({ neteaseBaseUrl: event.target.value })}
                className="hand-input w-full text-xs"
                placeholder="网易云 API Base URL，例如 http://localhost:3002"
              />
              <input
                value={musicSourceConfig.qqBaseUrl}
                onChange={(event) => setMusicSourceConfig({ qqBaseUrl: event.target.value })}
                className="hand-input w-full text-xs"
                placeholder="QQ 音乐 API Base URL，例如 http://localhost:3300"
              />
            </div>
            {musicStatus && <p className="mt-2 text-xs font-black opacity-60">{musicStatus}</p>}
            <div className="mt-3 rounded-3xl border-[2px] border-[#111]/15">
              <button onClick={() => setShowSearchResults(!showSearchResults)} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left">
                <span className="min-w-0">
                  <span className="block text-sm font-black">搜索结果</span>
                  <span className="block truncate text-xs font-bold opacity-55">{musicSearchResults.length > 0 ? '点开选歌' : '搜索后出现'}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="app-chip justify-center text-xs">{sortedMusicSearchResults.length}</span>
                  <ChevronRight className={cn('h-5 w-5 transition-transform', showSearchResults && 'rotate-90')} />
                </span>
              </button>
              {showSearchResults && (
                <div className="grid gap-2 border-t-[2px] border-[#111]/15 p-3">
                  {musicPlaylists.length > 0 && (
                    <select value={quickPlaylistId} onChange={(event) => setQuickPlaylistId(event.target.value)} className="hand-input w-full text-sm">
                      <option value="">加入曲库时不放入歌单</option>
                      {musicPlaylists.map((playlist) => <option key={playlist.id} value={playlist.id}>同时加入：{playlist.name}</option>)}
                    </select>
                  )}
                  {sortedMusicSearchResults.map((result) => (
                    <div key={result.id} className="grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-2xl border-[2px] border-[#111]/15 p-2">
                      <button onClick={() => void playSearchResult(result)} className={cn('contents', result.access === 'unplayable' && 'cursor-not-allowed')} title={result.access === 'unplayable' ? '不可播放' : '播放并加入曲库'}>
                        <MusicCover track={{ ...result, audioUrl: result.audioUrl || '', tags: [], playCount: 0, createdAt: 0, updatedAt: 0 }} className="h-12 w-12 rounded-2xl" />
                        <span className="min-w-0 text-left">
                          <span className="block truncate text-sm font-black">{result.title}</span>
                          <span className="block truncate text-xs font-bold opacity-60">{result.artist}{result.album ? ` · ${result.album}` : ''}</span>
                          <span className="mt-1 flex flex-wrap gap-1">
                            <span className="inline-flex rounded-full border-[2px] border-[#111]/15 bg-white/70 px-2 py-0.5 text-[10px] font-black">{searchSourceLabel(result)}</span>
                            <span className={cn('inline-flex rounded-full border-[2px] border-[#111]/15 px-2 py-0.5 text-[10px] font-black', searchAccessClass(result))}>{searchAccessLabel(result)}</span>
                          </span>
                        </span>
                      </button>
                      <span className="flex gap-1">
                        <button onClick={() => void likeSearchResult(result)} className="circle-button small" title="加入我喜欢"><Heart className="h-4 w-4" /></button>
                        <button onClick={() => void addSearchResultToLibrary(result)} className="circle-button small" title="加入曲库/歌单"><Plus className="h-4 w-4" /></button>
                      </span>
                    </div>
                  ))}
                  {sortedMusicSearchResults.length === 0 && <Empty text="还没有搜索结果。" />}
                </div>
              )}
            </div>
          </Panel>
          <Panel>
            <h3 className="mb-3 text-xl font-black">我的音乐</h3>
            <div className="grid gap-2 rounded-3xl border-[2px] border-[#111]/15 p-3">
              <input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} className="hand-input w-full text-sm" placeholder="歌名（可选）" />
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input value={customUrl} onChange={(event) => setCustomUrl(event.target.value)} className="hand-input min-w-0 text-sm" placeholder="音频 URL" />
                <button onClick={addCustomUrlTrack} className="circle-button" title="加入 URL"><Link className="h-5 w-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="fetch-button justify-center">
                  <Import className="h-5 w-5" />
                  上传 MP3
                  <input type="file" accept="audio/*,.mp3" className="hidden" onChange={(event) => addUploadedTrack(event.target.files?.[0])} />
                </label>
                <button onClick={playDemoSound} className="fetch-button justify-center">
                  <Volume2 className="h-5 w-5" />
                  测试声音
                </button>
              </div>
            </div>
          </Panel>
          <Panel>
            <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="hand-input min-w-0 text-sm" placeholder="筛选已加入歌曲" />
              <span className="app-chip justify-center text-xs">{filteredTracks.length}</span>
            </div>
            {filteredTracks.length > 0 ? filteredTracks.map((track) => (
              <MusicTrackRow key={track.id} track={track} active={track.id === currentTrack?.id} onPlay={() => play(track.id)} onLike={() => toggleMusicTrackLiked(track.id)} onDelete={() => deleteMusicTrack(track.id)} />
            )) : <Empty text="还没有可播放歌曲。先搜索并点击一首歌。" />}
          </Panel>
        </>
      )}

      {tab === 'library' && libraryView === 'liked' && (
        <Panel>
          <h3 className="mb-3 text-xl font-black">我喜欢</h3>
          {likedTracks.length > 0 ? likedTracks.map((track) => (
            <MusicTrackRow key={track.id} track={track} active={track.id === currentTrack?.id} onPlay={() => play(track.id)} onLike={() => toggleMusicTrackLiked(track.id)} />
          )) : <Empty text="喜欢的歌会出现在这里。" />}
        </Panel>
      )}

      {tab === 'library' && libraryView === 'playlists' && (
        <>
          <Panel>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-xl font-black">歌单</h3>
              <button onClick={startNewPlaylist} className="circle-button small" title="新建歌单"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-2">
              {musicPlaylists.length > 0 ? musicPlaylists.map((playlist) => {
                const count = playlist.trackIds.length;
                const coverTrack = musicTracks.find((track) => track.id === playlist.trackIds[0]);
                return (
                  <button key={playlist.id} onClick={() => { setSelectedPlaylistId(playlist.id); setLibraryView('playlist-detail'); }} className="grid w-full grid-cols-[56px_1fr_auto] items-center gap-3 rounded-2xl border-[2px] border-[#111]/15 p-2 text-left">
                    <MusicCover track={coverTrack} playlist={playlist} className="h-14 w-14 rounded-2xl" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{playlist.favorite ? '♥ ' : ''}{playlist.name}</span>
                      <span className="block truncate text-xs font-bold opacity-60">{count} 首 · {playlist.description || '点开查看详情'}</span>
                    </span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                );
              }) : (
                <Empty text="还没有歌单。下面可以新建一张。" />
              )}
            </div>
          </Panel>
          <Panel>
            <h3 className="mb-3 text-xl font-black">{editingPlaylistId ? '编辑歌单' : '新建歌单'}</h3>
            <Field icon={<Star />} label="歌单名"><input value={playlistDraft.name} onChange={(event) => setPlaylistDraft({ ...playlistDraft, name: event.target.value })} className="hand-input w-full text-sm" placeholder="今晚一起听" /></Field>
            <Field icon={<Quote />} label="描述"><textarea value={playlistDraft.description} onChange={(event) => setPlaylistDraft({ ...playlistDraft, description: event.target.value })} className="hand-input min-h-20 w-full resize-none text-sm" /></Field>
            <Field icon={<ImageIcon />} label="封面">
              <button onClick={() => setShowCoverPicker(!showCoverPicker)} className="fetch-button w-full justify-center"><ImageIcon className="h-5 w-5" />从相册选择</button>
              {showCoverPicker && (
                <div className="no-scrollbar mt-3 grid max-h-44 grid-cols-4 gap-2 overflow-y-auto">
                  {galleryPhotos.map((photo) => (
                    <button key={photo.id} onClick={() => setPlaylistDraft({ ...playlistDraft, cover: photo.url })} className={cn('h-16 overflow-hidden rounded-2xl border-[3px] border-[#111]', playlistDraft.cover === photo.url && 'ring-4 ring-[#111]/20')} title={photo.title}>
                      <img src={photo.url} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {galleryPhotos.length === 0 && <p className="mt-2 text-xs font-black opacity-55">相册还没有照片。</p>}
            </Field>
            <div className="mb-4 grid gap-2">
              {playlistTrackOptions.map((track) => {
                const checked = playlistDraft.trackIds.includes(track.id);
                return (
                  <button key={track.id} onClick={() => setPlaylistDraft({ ...playlistDraft, trackIds: checked ? playlistDraft.trackIds.filter((id) => id !== track.id) : [...playlistDraft.trackIds, track.id] })} className={cn('grid grid-cols-[1fr_20px] items-center rounded-2xl border-[2px] border-[#111]/20 px-3 py-2 text-left text-sm font-black', checked && 'bg-[#dceecd]')}>
                    <span className="min-w-0 truncate pr-2">{track.liked ? '♥ ' : ''}{track.title} · {track.artist}</span>
                    {checked && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
            <button onClick={savePlaylist} className="save-button w-full">保存</button>
          </Panel>
        </>
      )}

      {tab === 'library' && libraryView === 'playlist-detail' && selectedPlaylist && (
        <>
          <Panel>
            <div className="grid grid-cols-[88px_1fr] gap-4">
              <button onClick={() => { startEditPlaylist(selectedPlaylist); setShowCoverPicker(true); setLibraryView('playlists'); }} title="从相册换封面">
                <MusicCover playlist={selectedPlaylist} className="h-24 w-24 rounded-[22px]" />
              </button>
              <div className="min-w-0">
                <h2 className="line-clamp-2 text-xl font-black leading-tight">{selectedPlaylist.name}</h2>
                <p className="mt-1 line-clamp-2 text-xs font-bold opacity-65">{selectedPlaylist.description || '还没有描述。'}</p>
                <div className="mt-3 flex gap-2">
                  <MusicIconButton icon={<Heart />} label="收藏" active={selectedPlaylist.favorite} onClick={() => toggleMusicPlaylistFavorite(selectedPlaylist.id)} />
                  <MusicIconButton icon={<FileText />} label="编辑" onClick={() => { startEditPlaylist(selectedPlaylist); setLibraryView('playlists'); }} />
                  <MusicIconButton icon={<Trash2 />} label="删除" onClick={() => { deleteMusicPlaylist(selectedPlaylist.id); setLibraryView('playlists'); }} />
                </div>
              </div>
            </div>
          </Panel>
          <Panel>
            {playlistTracks.length > 0 ? playlistTracks.map((track) => (
              <MusicTrackRow key={track.id} track={track} active={track.id === currentTrack?.id} onPlay={() => play(track.id)} onLike={() => toggleMusicTrackLiked(track.id)} onDelete={() => removeTrackFromMusicPlaylist(selectedPlaylist.id, track.id)} />
            )) : <Empty text="这张歌单还没有可听歌曲。" />}
          </Panel>
        </>
      )}

      {tab === 'library' && libraryView === 'history' && (
        <>
          <Panel>
            <h3 className="mb-3 text-xl font-black">一起听排行</h3>
            {togetherRanking.length > 0 ? togetherRanking.map((item, index) => (
              <div key={item.character.id} className="grid grid-cols-[40px_1fr_auto] items-center gap-3 border-b-[2px] border-[#111]/15 py-3 last:border-b-0">
                <span className="text-lg font-black">#{index + 1}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-[2px] border-[#111] bg-white">
                    {item.character.avatar ? <img src={item.character.avatar} className="h-full w-full object-cover" /> : <CircleUserRound className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{item.character.name}</span>
                    <span className="block truncate text-xs font-bold opacity-55">{item.records.length} 次一起听</span>
                  </span>
                </span>
                <span className="app-chip justify-center text-xs">{formatMusicDuration(item.seconds)}</span>
              </div>
            )) : <Empty text="结束一次一起听后会生成排行。" />}
          </Panel>
          <Panel>
            <h3 className="mb-3 text-xl font-black">历史</h3>
            {musicListenRecords.length > 0 ? musicListenRecords.map((record) => {
              const track = musicTracks.find((item) => item.id === record.trackId);
              const character = characters.find((item) => item.id === record.characterId);
              if (!track) return null;
              return (
                <div key={record.id} className="border-b-[2px] border-[#111]/15 py-3 last:border-b-0">
                  <MusicTrackRow track={track} active={track.id === currentTrack?.id} onPlay={() => play(track.id)} onLike={() => toggleMusicTrackLiked(track.id)} />
                  <p className="mt-1 truncate text-xs font-bold opacity-55">{new Date(record.createdAt).toLocaleString()} {character ? `· ${character.name}` : ''} {record.durationSeconds ? `· ${formatMusicDuration(record.durationSeconds)}` : ''}</p>
                  {record.note && <p className="mt-1 line-clamp-2 text-sm font-bold opacity-70">{record.note}</p>}
                </div>
              );
            }) : <Empty text="播放或一起听后会留下记录。" />}
          </Panel>
        </>
      )}

      {tab === 'me' && (
        <>
          <Panel>
            <div className="flex items-center gap-4">
              <label className="block cursor-pointer">
                <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] border-[3px] border-[#111] bg-white">
                  {userAvatar ? <img src={userAvatar} className="h-full w-full object-cover" /> : <CircleUserRound className="h-12 w-12 opacity-60" />}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadMyMusicAvatar(event.target.files?.[0])} />
              </label>
              <div className="min-w-0">
                <h3 className="truncate text-2xl font-black">{userName || '我'}</h3>
                <p className="mt-1 text-sm font-bold opacity-60">听歌资料</p>
                <p className="mt-3 rounded-2xl bg-white/60 px-3 py-2 text-xs font-black">一起听 {formatMusicDuration(togetherSeconds)} · 播放 {myPlayCount} 次</p>
              </div>
            </div>
            <Field icon={<CircleUserRound />} label="我的名字">
              <input value={userName} onChange={(event) => setUserName(event.target.value)} className="hand-input w-full text-sm" />
            </Field>
          </Panel>
          <Panel>
            <h3 className="mb-3 text-xl font-black">我的听歌排行</h3>
            {[...playableTracks].sort((a, b) => b.playCount - a.playCount).slice(0, 8).map((track, index) => (
              <div key={track.id} className="grid grid-cols-[32px_48px_1fr_auto] items-center gap-3 border-b-[2px] border-[#111]/15 py-3 last:border-b-0">
                <span className="font-black">#{index + 1}</span>
                <MusicCover track={track} className="h-12 w-12 rounded-2xl" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{track.title}</span>
                  <span className="block truncate text-xs font-bold opacity-55">{track.artist}</span>
                </span>
                <span className="app-chip justify-center text-xs">{track.playCount} 次</span>
              </div>
            ))}
            {playableTracks.length === 0 && <Empty text="播放歌曲后会出现排行。" />}
          </Panel>
          <Panel>
            <h3 className="mb-3 text-xl font-black">一起听排行</h3>
            {togetherRanking.length > 0 ? togetherRanking.map((item, index) => (
              <div key={item.character.id} className="grid grid-cols-[32px_44px_1fr_auto] items-center gap-3 border-b-[2px] border-[#111]/15 py-3 last:border-b-0">
                <span className="font-black">#{index + 1}</span>
                <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-[2px] border-[#111] bg-white">
                  {item.character.avatar ? <img src={item.character.avatar} className="h-full w-full object-cover" /> : <CircleUserRound className="h-5 w-5" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{item.character.name}</span>
                  <span className="block truncate text-xs font-bold opacity-55">{item.records.length} 次一起听</span>
                </span>
                <span className="app-chip justify-center text-xs">{formatMusicDuration(item.seconds)}</span>
              </div>
            )) : <Empty text="还没有一起听记录。" />}
          </Panel>
        </>
      )}

      {tab === 'char' && activeCharSong && (
        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#111] bg-white">
              {characters.find((character) => character.id === activeCharSong.characterId)?.avatar ? (
                <img src={characters.find((character) => character.id === activeCharSong.characterId)?.avatar} className="h-full w-full object-cover" />
              ) : <CircleUserRound className="h-7 w-7" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xl font-black">{activeCharSong.title}</span>
              <span className="block truncate text-xs font-bold opacity-60">{activeCharSong.artist} 名下</span>
            </span>
          </div>
          <Field icon={<Music />} label="修改歌名">
            <input
              value={activeCharSong.title}
              onChange={(event) => updateMusicTrack(activeCharSong.id, { title: event.target.value })}
              className="hand-input w-full text-sm"
            />
          </Field>
          <Field icon={<Volume2 />} label="旋律"><p className="rounded-2xl bg-white/55 p-3 text-sm font-bold leading-6">{activeCharSong.melody || '暂无旋律记录'}</p></Field>
          <Field icon={<Headphones />} label="编曲"><p className="rounded-2xl bg-white/55 p-3 text-sm font-bold leading-6">{activeCharSong.arrangement || '暂无编曲记录'}</p></Field>
          <Field icon={<Quote />} label="歌词"><p className="whitespace-pre-wrap rounded-2xl bg-white/55 p-3 text-sm font-bold leading-7">{cleanLyricsText(activeCharSong.lyrics) || '暂无歌词'}</p></Field>
          <button onClick={() => void generateMusicAudioForSong(activeCharSong)} disabled={generatingCharSong} className="save-button mb-2 w-full">{generatingCharSong ? '生成中' : activeCharSong.audioUrl ? '重新生成音乐' : '生成音乐'}</button>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => toggleMusicTrackLiked(activeCharSong.id)} className="fetch-button justify-center">{activeCharSong.liked ? '已收藏' : '收藏'}</button>
            <button onClick={() => {
              setCharSongDraft({
                characterId: activeCharSong.characterId || '',
                title: activeCharSong.title,
                mood: activeCharSong.tags.filter((tag) => tag !== 'char创作').join('、'),
                melody: activeCharSong.melody || '',
                arrangement: activeCharSong.arrangement || '',
                lyrics: activeCharSong.lyrics || '',
              });
              setActiveCharSongId(null);
            }} className="fetch-button justify-center">继续改</button>
            <button onClick={() => { deleteMusicTrack(activeCharSong.id); setActiveCharSongId(null); }} className="fetch-button justify-center bg-[#ffd6d6]">删除</button>
          </div>
        </Panel>
      )}

      {tab === 'char' && !activeCharSong && (
        <Panel>
          <h3 className="mb-3 text-xl font-black">char 创作</h3>
          <Field icon={<CircleUserRound />} label="选择 char">
            <select value={charSongDraft.characterId} onChange={(event) => setCharSongDraft({ ...charSongDraft, characterId: event.target.value })} className="hand-input w-full text-sm">
              <option value="">默认角色</option>
              {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
            </select>
          </Field>
          <Field icon={<Sparkles />} label="MiniMax 音乐">
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                {minimaxMusicModelPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setMusicSourceConfig({ minimaxModel: preset.value })}
                    className={cn('pill text-xs', (musicSourceConfig.minimaxModel || 'music-2.6') === preset.value && 'active')}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                value={musicSourceConfig.minimaxModel}
                onChange={(event) => setMusicSourceConfig({ minimaxModel: event.target.value })}
                className="hand-input w-full text-xs"
                placeholder="music-2.6"
              />
              <input
                value={musicSourceConfig.minimaxApiKey}
                onChange={(event) => setMusicSourceConfig({ minimaxApiKey: event.target.value })}
                className="hand-input w-full text-xs"
                placeholder="MiniMax 音乐 API Key；也可复用设置里的 MiniMax TTS Key"
                type="password"
              />
              <input
                value={musicSourceConfig.minimaxBaseUrl}
                onChange={(event) => setMusicSourceConfig({ minimaxBaseUrl: event.target.value })}
                className="hand-input w-full text-xs"
                placeholder="https://api.minimax.io/v1/music_generation"
              />
            </div>
          </Field>
          <Field icon={<Music />} label="歌名"><input value={charSongDraft.title} onChange={(event) => setCharSongDraft({ ...charSongDraft, title: event.target.value })} className="hand-input w-full text-sm" placeholder="让 char 写一首歌" /></Field>
          <Field icon={<Tag />} label="情绪"><input value={charSongDraft.mood} onChange={(event) => setCharSongDraft({ ...charSongDraft, mood: event.target.value })} className="hand-input w-full text-sm" /></Field>
          <Field icon={<Volume2 />} label="旋律"><textarea value={charSongDraft.melody} onChange={(event) => setCharSongDraft({ ...charSongDraft, melody: event.target.value })} className="hand-input min-h-20 w-full resize-none text-sm" placeholder="比如：主歌低声，副歌上扬，hook 重复歌名" /></Field>
          <Field icon={<Headphones />} label="编曲"><textarea value={charSongDraft.arrangement} onChange={(event) => setCharSongDraft({ ...charSongDraft, arrangement: event.target.value })} className="hand-input min-h-20 w-full resize-none text-sm" placeholder="比如：电钢、鼓组、合成器 pad，副歌加和声" /></Field>
          <Field icon={<Quote />} label="歌词"><textarea value={charSongDraft.lyrics} onChange={(event) => setCharSongDraft({ ...charSongDraft, lyrics: event.target.value })} className="hand-input min-h-32 w-full resize-none text-sm" placeholder="可留空，让 AI 按人设和过去创作写完整歌曲" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => void generateCharSong()} disabled={generatingCharSong} className="save-button w-full">{generatingCharSong ? '创作中' : getMiniMaxMusicApiKey() ? '写歌+生成' : '创作'}</button>
            <button onClick={() => void generateMusicAudioForSong()} disabled={generatingCharSong} className="save-button w-full">{generatingCharSong ? '生成中' : '生成音乐'}</button>
          </div>
          <p className="mt-2 text-xs font-black opacity-55">MiniMax 音乐使用独立接口，和 TTS 音色试听分开。</p>
          {charSongStatus && <p className="mt-3 rounded-2xl bg-white/55 px-3 py-2 text-xs font-black leading-5 opacity-70">{charSongStatus}</p>}
          <div className="mt-4 grid gap-2">
            {charSongs.slice(0, 8).map((track) => (
              <button key={track.id} onClick={() => setActiveCharSongId(track.id)} className="grid grid-cols-[44px_1fr_auto_auto] items-center gap-2 rounded-2xl border-[2px] border-[#111]/15 px-3 py-2 text-left">
                <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-[2px] border-[#111] bg-white">
                  {characters.find((character) => character.id === track.characterId)?.avatar ? (
                    <img src={characters.find((character) => character.id === track.characterId)?.avatar} className="h-full w-full object-cover" />
                  ) : <CircleUserRound className="h-5 w-5" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{track.title}</span>
                  <span className="block truncate text-xs font-bold opacity-55">{track.artist} · {track.melody || '已保存到 char 名下'}</span>
                </span>
                <button onClick={(event) => { event.stopPropagation(); toggleMusicTrackLiked(track.id); }} className="circle-button small" title="收藏"><Heart className={cn('h-4 w-4', track.liked && 'fill-current')} /></button>
                <button onClick={(event) => { event.stopPropagation(); deleteMusicTrack(track.id); }} className="circle-button small" title="删除"><Trash2 className="h-4 w-4" /></button>
              </button>
            ))}
          </div>
        </Panel>
      )}
    </section>
  );
}

