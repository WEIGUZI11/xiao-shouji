import assert from 'node:assert/strict';

import {
  buildUserProfileDeleteMessage,
  buildUserProfileDeleteTitle,
  getUserProfileDisplayName,
  normalizeAvatarCrop,
  normalizeUserAvatarReaderResult,
} from './userProfileUi';

assert.equal(getUserProfileDisplayName('林秋'), '林秋');
assert.equal(getUserProfileDisplayName('   '), '未命名玩家');

assert.equal(buildUserProfileDeleteTitle('林秋'), '删除玩家档案');
assert.equal(
  buildUserProfileDeleteMessage('林秋'),
  '确定删除「林秋」吗？删除后不能恢复。',
);
assert.equal(
  buildUserProfileDeleteMessage('   '),
  '确定删除「未命名玩家」吗？删除后不能恢复。',
);

assert.equal(normalizeUserAvatarReaderResult('data:image/png;base64,abc'), 'data:image/png;base64,abc');
assert.equal(normalizeUserAvatarReaderResult('   '), '');
assert.equal(normalizeUserAvatarReaderResult(null), '');
assert.equal(normalizeUserAvatarReaderResult(new ArrayBuffer(2)), '');

assert.deepEqual(normalizeAvatarCrop({ scale: 0.5, x: -90, y: 95 }), { scale: 1, x: -50, y: 50 });
assert.deepEqual(normalizeAvatarCrop({ scale: 2.2, x: 12, y: -8 }), { scale: 2.2, x: 12, y: -8 });
assert.deepEqual(normalizeAvatarCrop({ scale: Number.NaN, x: Number.NaN, y: Number.NaN }), { scale: 1, x: 0, y: 0 });

console.log('userProfileUi tests passed');
