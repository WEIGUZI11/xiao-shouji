import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const srcDir = dirname(dirname(fileURLToPath(import.meta.url)));
const appsDir = join(srcDir, 'apps');
const requiredApps = [
  'wechat',
  'accounting',
  'bilibili',
  'xiaohongshu',
  'phone',
  'gallery',
  'music',
  'theater',
  'calendar',
  'diary',
  'peek',
  'memo',
  'browser',
  'qq',
  'video',
  'settings',
  'themes',
  'presets',
  'logs',
  'ai-context',
  'active-events',
  'contacts',
  'user-info',
  'backup',
];

assert(existsSync(appsDir), 'src/apps directory must exist');

for (const appName of requiredApps) {
  assert(existsSync(join(appsDir, appName)), `src/apps/${appName} must exist`);
}

assert(existsSync(join(appsDir, 'wechat', 'ai', 'wechatAi.ts')), 'WeChat AI module must live under src/apps/wechat');
assert(existsSync(join(appsDir, 'accounting', 'AccountingScreen.tsx')), 'Accounting screen must live under src/apps/accounting');
assert(existsSync(join(appsDir, 'wechat', 'WeChatApp.tsx')), 'WeChat app shell must live under src/apps/wechat');
assert(existsSync(join(appsDir, 'wechat', 'chat', 'ChatList.tsx')), 'Shared chat list must live under src/apps/wechat/chat');
assert(existsSync(join(appsDir, 'wechat', 'chat', 'ChatScreen.tsx')), 'Shared chat screen must live under src/apps/wechat/chat');
assert(existsSync(join(appsDir, 'bilibili', 'BilibiliScreen.tsx')), 'Bilibili screen must live under src/apps/bilibili');
assert(existsSync(join(appsDir, 'xiaohongshu', 'XiaohongshuApp.tsx')), 'Xiaohongshu screen must live under src/apps/xiaohongshu');
assert(existsSync(join(appsDir, 'phone', 'PhoneScreen.tsx')), 'Phone screen must live under src/apps/phone');
assert(existsSync(join(appsDir, 'gallery', 'GalleryScreen.tsx')), 'Gallery screen must live under src/apps/gallery');
assert(existsSync(join(appsDir, 'music', 'MusicScreen.tsx')), 'Music screen must live under src/apps/music');
assert(existsSync(join(appsDir, 'theater', 'TheaterScreen.tsx')), 'Theater screen must live under src/apps/theater');
assert(existsSync(join(appsDir, 'calendar', 'CalendarScreen.tsx')), 'Calendar screen must live under src/apps/calendar');
assert(existsSync(join(appsDir, 'diary', 'DiaryScreen.tsx')), 'Diary screen must live under src/apps/diary');
assert(existsSync(join(appsDir, 'diary', 'PeekScreen.tsx')), 'Peek screen must live under src/apps/diary');
assert(existsSync(join(appsDir, 'peek', 'peekLogic.ts')), 'Peek readable summary logic must live under src/apps/peek');
assert(existsSync(join(appsDir, 'peek', 'peekLogic.test.ts')), 'Peek readable summary tests must live under src/apps/peek');
assert(existsSync(join(appsDir, 'memo', 'MemoScreen.tsx')), 'Memo screen must live under src/apps/memo');
assert(existsSync(join(appsDir, 'browser', 'BrowserScreen.tsx')), 'Browser screen must live under src/apps/browser');
assert(existsSync(join(appsDir, 'qq', 'QQScreen.tsx')), 'QQ screen must live under src/apps/qq');
assert(existsSync(join(appsDir, 'qq', 'messages', 'QQMessages.tsx')), 'QQ messages must live under src/apps/qq/messages');
assert(existsSync(join(appsDir, 'qq', 'channels', 'QQChannels.tsx')), 'QQ channels must live under src/apps/qq/channels');
assert(existsSync(join(appsDir, 'qq', 'contacts', 'QQContacts.tsx')), 'QQ contacts must live under src/apps/qq/contacts');
assert(existsSync(join(appsDir, 'qq', 'dynamic', 'QQDynamic.tsx')), 'QQ dynamic must live under src/apps/qq/dynamic');
assert(existsSync(join(appsDir, 'video', 'VideoCallScreen.tsx')), 'Video call screen must live under src/apps/video');
assert(existsSync(join(appsDir, 'settings', 'SettingsScreen.tsx')), 'Settings screen must live under src/apps/settings');
assert(existsSync(join(appsDir, 'themes', 'ThemesScreen.tsx')), 'Themes screen must live under src/apps/themes');
assert(existsSync(join(appsDir, 'presets', 'PresetsScreen.tsx')), 'Presets screen must live under src/apps/presets');
assert(existsSync(join(appsDir, 'logs', 'LogsScreen.tsx')), 'Logs screen must live under src/apps/logs');
assert(existsSync(join(appsDir, 'ai-context', 'AIContextScreen.tsx')), 'AI context screen must live under src/apps/ai-context');
assert(existsSync(join(appsDir, 'active-events', 'ActiveEventsScreen.tsx')), 'Active events screen must live under src/apps/active-events');
assert(existsSync(join(appsDir, 'active-events', 'activeEventsLogic.ts')), 'Active event logic must live under src/apps/active-events');
assert(existsSync(join(appsDir, 'contacts', 'ContactsScreen.tsx')), 'Contacts screen must live under src/apps/contacts');
assert(existsSync(join(appsDir, 'user-info', 'UserInfoScreen.tsx')), 'User info screen must live under src/apps/user-info');
assert(existsSync(join(appsDir, 'user-info', 'userProfilePrompt.ts')), 'User profile prompt logic must live under src/apps/user-info');
assert(existsSync(join(appsDir, 'backup', 'BackupScreen.tsx')), 'Backup screen must live under src/apps/backup');
assert(existsSync(join(srcDir, 'shell', 'FeatureRouter.tsx')), 'Feature router must live under src/shell');
assert(existsSync(join(srcDir, 'shell', 'Desktop.tsx')), 'Desktop shell must live under src/shell');
assert(existsSync(join(srcDir, 'shell', 'GlobalMusicAudio.tsx')), 'Global music audio must live under src/shell');
assert(existsSync(join(srcDir, 'shell', 'LockScreen.tsx')), 'Lock screen must live under src/shell');
assert(existsSync(join(srcDir, 'shell', 'NotificationCenter.tsx')), 'Notification center must live under src/shell');

console.log('apps folder structure ok');
