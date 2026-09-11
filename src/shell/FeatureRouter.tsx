/**
 * Feature screen router for the phone shell.
 * Main component: FeatureRouter.
 * Dependencies: Screen type from store.ts and app screen components from src/apps/.
 * Maintenance note: keep this as a thin mapping layer; feature UI should stay in its app folder.
 */
import { Sparkles } from 'lucide-react';

import { ActiveEventsScreen } from '../apps/active-events/ActiveEventsScreen';
import { AccountingScreen } from '../apps/accounting/AccountingScreen';
import { AIContextScreen } from '../apps/ai-context/AIContextScreen';
import { BackupScreen } from '../apps/backup/BackupScreen';
import { BilibiliScreen } from '../apps/bilibili/BilibiliScreen';
import { BrowserScreen } from '../apps/browser/BrowserScreen';
import { CalendarScreen } from '../apps/calendar/CalendarScreen';
import { ContactsScreen } from '../apps/contacts/ContactsScreen';
import { DiaryScreen } from '../apps/diary/DiaryScreen';
import { PeekScreen } from '../apps/diary/PeekScreen';
import { GalleryScreen } from '../apps/gallery/GalleryScreen';
import { ImageTasksScreen } from '../apps/image-tasks/ImageTasksScreen';
import { LogsScreen } from '../apps/logs/LogsScreen';
import { MemoScreen } from '../apps/memo/MemoScreen';
import { MusicScreen } from '../apps/music/MusicScreen';
import { PhoneScreen } from '../apps/phone/PhoneScreen';
import { PresetsScreen } from '../apps/presets/PresetsScreen';
import { QQScreen } from '../apps/qq/QQScreen';
import { Header, Panel, Row } from '../apps/shared/AppPrimitives';
import { SettingsScreen } from '../apps/settings/SettingsScreen';
import { TheaterScreen } from '../apps/theater/TheaterScreen';
import { ThemesScreen } from '../apps/themes/ThemesScreen';
import { UserInfoScreen } from '../apps/user-info/UserInfoScreen';
import { VideoCallScreen } from '../apps/video/VideoCallScreen';
import { VoiceCallScreen } from '../apps/voice/VoiceCallScreen';
import { WeChatApp } from '../apps/wechat/WeChatApp';
import { XiaohongshuApp } from '../apps/xiaohongshu/XiaohongshuApp';
import type { Screen } from '../store';

export function FeatureRouter({ screen }: { screen: Screen }) {
  if (screen === 'wechat') return <WeChatApp />;
  if (screen === 'qq') return <QQScreen />;
  if (screen === 'phone') return <PhoneScreen />;
  if (screen === 'voice-call') return <VoiceCallScreen />;
  if (screen === 'video') return <VideoCallScreen />;
  if (screen === 'diary') return <DiaryScreen />;
  if (screen === 'calendar') return <CalendarScreen />;
  if (screen === 'accounting') return <AccountingScreen />;
  if (screen === 'gallery') return <GalleryScreen />;
  if (screen === 'image-tasks') return <ImageTasksScreen />;
  if (screen === 'peek') return <PeekScreen />;
  if (screen === 'settings') return <SettingsScreen />;
  if (screen === 'themes') return <ThemesScreen />;
  if (screen === 'presets') return <PresetsScreen />;
  if (screen === 'backup') return <BackupScreen />;
  if (screen === 'logs') return <LogsScreen />;
  if (screen === 'ai-context') return <AIContextScreen />;
  if (screen === 'active-events' || screen === 'char-active') return <ActiveEventsScreen />;
  if (screen === 'import' || screen === 'contacts') return <ContactsScreen />;
  if (screen === 'user-info') return <UserInfoScreen />;
  if (screen === 'memo') return <MemoScreen />;
  if (screen === 'browser') return <BrowserScreen />;
  if (screen === 'bilibili') return <BilibiliScreen />;
  if (screen === 'xiaohongshu') return <XiaohongshuApp />;
  if (screen === 'music') return <MusicScreen />;
  if (screen === 'theater') return <TheaterScreen />;

  const copy: Record<string, [string, string, string[]]> = {
    moments: ['朋友圈', '动态、评论、可见范围。', ['char 发动态', 'NPC 评论区', '仅你可见 / 不让你看见']],
  };
  const [title, subtitle, bullets] = copy[screen] || ['功能', '先占位，后面继续填。', []];

  return (
    <section className="h-full overflow-y-auto pb-8">
      <Header title={title} subtitle={subtitle} />
      <Panel>
        {bullets.map((item) => (
          <Row key={item} icon={<Sparkles />} title={item} desc="保留入口和数据结构，下一步接 AI 生成逻辑。" />
        ))}
      </Panel>
    </section>
  );
}
