import assert from 'node:assert/strict';

import {
  buildContextBudgetStats,
  buildPreviewRowKey,
  getPreviewRowExcerpt,
} from './aiContextPreview';

const budget = { label: '标准', min: 15000, max: 25000 };

const shortStats = buildContextBudgetStats('你好'.repeat(1000), budget);
assert.equal(shortStats.chars, 2000);
assert.equal(shortStats.percentOfBudget, 8);
assert.equal(shortStats.remainingChars, 23000);
assert.equal(shortStats.overBudgetChars, 0);
assert.equal(shortStats.status, 'ok');
assert.match(shortStats.summary, /2000 字/);
assert.match(shortStats.summary, /8%/);

const overStats = buildContextBudgetStats('a'.repeat(26000), budget);
assert.equal(overStats.status, 'over-budget');
assert.equal(overStats.remainingChars, 0);
assert.equal(overStats.overBudgetChars, 1000);

const hardStats = buildContextBudgetStats('a'.repeat(61000), budget);
assert.equal(hardStats.status, 'over-hard-limit');
assert.equal(hardStats.overHardLimitChars, 1000);

assert.equal(
  buildPreviewRowKey({ app: '微信', content: '林秋私聊', range: '06/20 00:00 - 06/20 12:00' }),
  '微信::林秋私聊::06/20 00:00 - 06/20 12:00',
);

assert.equal(getPreviewRowExcerpt('abcdef ghijkl', 6), 'abcdef...');
assert.equal(getPreviewRowExcerpt('第一行\n\n第二行', 20), '第一行 第二行');
assert.equal(getPreviewRowExcerpt('   ', 14), '暂无详情');

console.log('aiContextPreview tests passed');
