import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildDiaryReviewUserMessage,
  defaultDiaryReviewMaxTokens,
  getDiaryReviewMaxTokens,
} from './diaryReview';

assert.equal(getDiaryReviewMaxTokens(4000), 4000);
assert.equal(getDiaryReviewMaxTokens(2500), 2500);
assert.equal(getDiaryReviewMaxTokens(1200), 1200);
assert.equal(getDiaryReviewMaxTokens(600), 600);
assert.equal(getDiaryReviewMaxTokens(1800), 1800);
assert.equal(getDiaryReviewMaxTokens(80), 120);
assert.equal(getDiaryReviewMaxTokens(9000), 4000);
assert.equal(getDiaryReviewMaxTokens(undefined), defaultDiaryReviewMaxTokens);

// Each review receives the same full configured allowance. Earlier entries do
// not consume a shared output budget.
assert.deepEqual(
  Array.from({ length: 4 }, () => getDiaryReviewMaxTokens(4000)),
  [4000, 4000, 4000, 4000],
);

const longDiaryBody = '这是一篇完整日记。'.repeat(1200);
const reviewUserMessage = buildDiaryReviewUserMessage({ title: '没有截断', content: longDiaryBody });
assert.equal(reviewUserMessage, `标题：没有截断\n正文：${longDiaryBody}`);
assert.ok(reviewUserMessage.endsWith(longDiaryBody));

const screenSource = readFileSync(new URL('./DiaryScreen.tsx', import.meta.url), 'utf8');
assert.match(screenSource, /maxTokens:\s*getDiaryReviewMaxTokens\(chatMaxTokens\)/);
assert.doesNotMatch(screenSource, /maxTokens:\s*600\b/);

console.log('diary review token allowance ok');
