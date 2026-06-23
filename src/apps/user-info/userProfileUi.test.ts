import assert from 'node:assert/strict';

import {
  buildUserProfileDeleteMessage,
  buildUserProfileDeleteTitle,
  getUserProfileDisplayName,
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

console.log('userProfileUi tests passed');
