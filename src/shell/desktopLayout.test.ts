import assert from 'node:assert/strict';

import { getDesktopAppPage, getDesktopDefaultPosition, getDesktopItemStyle, getDesktopLayoutStorageId, redmiDesktopSafeTop } from './desktopLayout';

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
  { x: 28, y: 123 },
);
assert.deepEqual(
  getDesktopDefaultPosition('gothic', 'accounting', { x: 20, y: 352 }),
  { x: 12, y: 442 },
);
assert.deepEqual(
  getDesktopDefaultPosition('gothic', 'xiaohongshu', { x: 24, y: 24 }),
  { x: 12, y: 160 },
);
assert.deepEqual(
  getDesktopDefaultPosition('guofeng', 'wechat', { x: 22, y: 22 }),
  { x: 30, y: 118 },
);
assert.deepEqual(getDesktopDefaultPosition('concept-20', 'image-bed', { x: 188, y: 24 }), { x: 12, y: 364 });
assert.deepEqual(getDesktopDefaultPosition('concept-33', 'image-bed', { x: 188, y: 24 }), { x: 12, y: 360 });
assert.deepEqual(getDesktopDefaultPosition('concept-57', 'wechat', { x: 22, y: 22 }), { x: 22, y: 274 });
assert.deepEqual(getDesktopDefaultPosition('concept-57', 'image-bed', { x: 188, y: 24 }), { x: 12, y: 462 });
assert.deepEqual(getDesktopDefaultPosition('concept-58', 'wechat', { x: 22, y: 22 }), { x: 22, y: 204 });
assert.deepEqual(getDesktopDefaultPosition('concept-58', 'image-bed', { x: 188, y: 24 }), { x: 12, y: 402 });
assert.deepEqual(getDesktopDefaultPosition('concept-58', 'xiaohongshu', { x: 24, y: 24 }), { x: 22, y: 170 });

assert.equal(getDesktopItemStyle({ x: 12, y: 20 }).top, redmiDesktopSafeTop);
assert.equal(getDesktopItemStyle({ x: 12, y: 120 }).top, 120);
assert.equal(getDesktopLayoutStorageId('pastel', 'wechat'), 'wechat');
assert.equal(getDesktopLayoutStorageId('gothic', 'wechat'), 'gothic-p5-v3:wechat');
assert.equal(getDesktopLayoutStorageId('concept-58', 'wechat'), 'concept-58-v2:wechat');
assert.equal(getDesktopLayoutStorageId('concept-33', 'wechat'), 'concept-33:wechat');
assert.notEqual(getDesktopLayoutStorageId('guofeng', 'wechat'), getDesktopLayoutStorageId('gothic', 'wechat'));
assert.equal(getDesktopAppPage('gothic', 'accounting', 0), 1);
assert.equal(getDesktopAppPage('gothic', 'diary', 0), 0);
assert.equal(getDesktopAppPage('pastel', 'accounting', 0), 0);

console.log('desktop layout ok');
