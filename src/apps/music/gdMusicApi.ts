export const defaultGdMusicApiBaseUrl = 'https://music-api.gdstudio.xyz/api.php';
export const defaultGdMusicSources = 'netease,bilibili,joox';
export const defaultGdMusicQuality = '320';
export const gdMusicQualityFallbacks = ['999', '740', '320', '192', '128'] as const;
export const gdMusicQualityOptions = [
  { value: '320', label: '\u6807\u51C6 320kbps\uFF08\u63A8\u8350\uFF09' },
  { value: '999', label: '\u65E0\u635F\u4F18\u5148' },
  { value: '740', label: '16bit \u4F18\u5148' },
  { value: '192', label: '192kbps \u4F18\u5148' },
  { value: '128', label: '128kbps' },
] as const;
export const defaultGdMusicAdvancedSettings = {
  gdBaseUrl: defaultGdMusicApiBaseUrl,
  gdSources: defaultGdMusicSources,
  gdQuality: defaultGdMusicQuality,
  neteaseBaseUrl: '',
  qqBaseUrl: '',
} as const;

export type GdMusicSearchResult = {
  id: string;
  sourceId: string;
  title: string;
  artist: string;
  album?: string;
  coverId?: string;
  lyricId?: string;
  gdSource: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function appendParams(baseUrl: string, params: Record<string, string | number>) {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
  ).toString()}`;
}

export function normalizeGdMusicBaseUrl(value = '') {
  const trimmed = value.trim();
  return trimmed || defaultGdMusicApiBaseUrl;
}

export function normalizeGdMusicSources(value = '') {
  const sources = value.split(/[,\s\uFF0C\u3001]+/).map((item) => item.trim()).filter(Boolean);
  return sources.length > 0 ? Array.from(new Set(sources)) : defaultGdMusicSources.split(',');
}

export function normalizeGdMusicQuality(value = '') {
  const cleanQuality = value.trim();
  return gdMusicQualityFallbacks.includes(cleanQuality as typeof gdMusicQualityFallbacks[number])
    ? cleanQuality
    : defaultGdMusicQuality;
}

export function getGdMusicQualityFallbacks(value = '') {
  const quality = normalizeGdMusicQuality(value);
  const index = gdMusicQualityFallbacks.indexOf(quality as typeof gdMusicQualityFallbacks[number]);
  return gdMusicQualityFallbacks.slice(index);
}

export function buildGdMusicSearchUrl({
  baseUrl,
  source,
  keyword,
  count = 20,
  page = 1,
}: {
  baseUrl: string;
  source: string;
  keyword: string;
  count?: number;
  page?: number;
}) {
  return appendParams(normalizeGdMusicBaseUrl(baseUrl), {
    types: 'search',
    source,
    name: keyword,
    count,
    pages: page,
  });
}

export function normalizeGdMusicSearchResults(value: unknown): GdMusicSearchResult[] {
  const root = asRecord(value);
  const list = Array.isArray(root.value)
    ? root.value
    : Array.isArray(value)
      ? value
      : [];

  return list.map((raw) => {
    const item = asRecord(raw);
    const gdSource = cleanText(item.source) || 'netease';
    const id = cleanText(item.url_id) || cleanText(item.id);
    const title = cleanText(item.name) || cleanText(item.title);
    const artistValue = item.artist;
    const artist = Array.isArray(artistValue)
      ? artistValue.map(cleanText).filter(Boolean).join(' / ')
      : cleanText(artistValue);
    return {
      id: `gd-${gdSource}-${id}`,
      sourceId: id,
      title,
      artist: artist || 'Unknown artist',
      album: cleanText(item.album) || undefined,
      coverId: cleanText(item.pic_id) || undefined,
      lyricId: cleanText(item.lyric_id) || id,
      gdSource,
    };
  }).filter((item) => item.sourceId && item.title);
}

export function buildGdMusicUrlCandidates({
  baseUrl,
  source,
  id,
  qualities,
}: {
  baseUrl: string;
  source: string;
  id: string;
  qualities: readonly string[];
}) {
  return qualities.map((quality) => appendParams(normalizeGdMusicBaseUrl(baseUrl), {
    types: 'url',
    source,
    id,
    br: quality,
  }));
}

export function buildGdMusicPicUrl({
  baseUrl,
  source,
  id,
  size = 300,
}: {
  baseUrl: string;
  source: string;
  id: string;
  size?: number;
}) {
  const cleanId = id.trim();
  if (!cleanId) return '';
  if (cleanId.startsWith('//')) return `https:${cleanId}`;
  if (/^https?:\/\//i.test(cleanId)) return cleanId;
  return appendParams(normalizeGdMusicBaseUrl(baseUrl), {
    types: 'pic',
    source,
    id: cleanId,
    size,
  });
}

export function buildGdMusicLyricUrl({
  baseUrl,
  source,
  id,
}: {
  baseUrl: string;
  source: string;
  id: string;
}) {
  return appendParams(normalizeGdMusicBaseUrl(baseUrl), {
    types: 'lyric',
    source,
    id,
  });
}

export function extractGdMusicPlayUrl(value: unknown) {
  const root = asRecord(value);
  const audioUrl = cleanText(root.url);
  if (!audioUrl) return null;
  return {
    audioUrl,
    quality: cleanText(root.br) || String(cleanNumber(root.br) || ''),
    size: cleanNumber(root.size),
  };
}

export function extractGdMusicPic(value: unknown) {
  return cleanText(asRecord(value).url);
}

export function extractGdMusicLyrics(value: unknown) {
  const root = asRecord(value);
  const lyric = cleanText(root.lyric);
  const translatedLyric = cleanText(root.tlyric);
  return [lyric, translatedLyric && `[translation]\n${translatedLyric}`].filter(Boolean).join('\n');
}
