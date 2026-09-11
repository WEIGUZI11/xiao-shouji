/**
 * Diary review generation limits.
 *
 * A review is a fresh AI request for one diary entry, so it must receive the
 * current configured output allowance in full. It must never accumulate the
 * lengths of earlier diary reviews or fall back to the old hard-coded 600.
 */
export const defaultDiaryReviewMaxTokens = 1800;
export const minDiaryReviewMaxTokens = 120;
export const maxDiaryReviewMaxTokens = 4000;

export function getDiaryReviewMaxTokens(configuredMaxTokens: unknown) {
  const parsed = typeof configuredMaxTokens === 'number'
    ? configuredMaxTokens
    : Number(configuredMaxTokens);
  const safeValue = Number.isFinite(parsed) ? Math.round(parsed) : defaultDiaryReviewMaxTokens;
  return Math.min(maxDiaryReviewMaxTokens, Math.max(minDiaryReviewMaxTokens, safeValue));
}

export function buildDiaryReviewUserMessage(entry: { title: string; content: string }) {
  return `标题：${entry.title}\n正文：${entry.content}`;
}
