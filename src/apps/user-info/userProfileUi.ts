export function getUserProfileDisplayName(profileName: string) {
  return profileName.trim() || '未命名玩家';
}

export function buildUserProfileDeleteTitle(_profileName: string) {
  return '删除玩家档案';
}

export function buildUserProfileDeleteMessage(profileName: string) {
  return `确定删除「${getUserProfileDisplayName(profileName)}」吗？删除后不能恢复。`;
}

export function normalizeUserAvatarReaderResult(result: FileReader['result']) {
  if (typeof result !== 'string') return '';
  return result.trim() ? result : '';
}
