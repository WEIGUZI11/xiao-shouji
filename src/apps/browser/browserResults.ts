import type { BrowserSearchResult } from '../../store';

export function parseBrowserResults(reply: string): { summary: string; results: BrowserSearchResult[] } {
  const value = JSON.parse(reply.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  if (!value || typeof value.summary !== 'string' || !value.summary.trim() || !Array.isArray(value.results)) {
    throw new Error('搜索结果格式无效');
  }
  const results = value.results.filter((item: unknown): item is BrowserSearchResult => {
    if (!item || typeof item !== 'object') return false;
    const row = item as Record<string, unknown>;
    if (![row.title, row.url, row.snippet].every((field) => typeof field === 'string' && field.trim())) return false;
    try {
      return ['http:', 'https:'].includes(new URL(row.url as string).protocol);
    } catch {
      return false;
    }
  }).slice(0, 5).map(({ title, url, snippet }: BrowserSearchResult) => ({ title, url, snippet }));
  if (!results.length) throw new Error('搜索结果为空');
  return { summary: value.summary.trim(), results };
}
