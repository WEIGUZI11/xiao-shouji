import assert from 'node:assert/strict';

import { getDesktopDefaultPosition, getDesktopItemStyle, redmiDesktopSafeTop } from './desktopLayout';

assert.deepEqual(
  getDesktopDefaultPosition('pastel', 'wechat', { x: 22, y: 22 }),
  { x: 22, y: 72 },
);
assert.deepEqual(
  getDesktopDefaultPosition('pastel', 'time-card', { x: 12, y: 242 }),
  { x: 12, y: 292 },
);
assert.deepEqual(
  getDesktopDefaultPosition('gothic', 'wechat', { x: 22, y: 22 }),
  { x: 24, y: 72 },
);
assert.deepEqual(
  getDesktopDefaultPosition('guofeng', 'wechat', { x: 22, y: 22 }),
  { x: 30, y: 118 },
);
assert.deepEqual(
  getDesktopDefaultPosition('alcheris-pixel', 'time-card', { x: 12, y: 242 }),
  { x: 16, y: 300 },
);

assert.equal(getDesktopItemStyle({ x: 12, y: 20 }).top, redmiDesktopSafeTop);
assert.equal(getDesktopItemStyle({ x: 12, y: 120 }).top, 120);

console.log('desktop layout ok');
