/**
 * Desktop and dock app catalog for the phone shell.
 * Main exports: pageApps, dockApps, getAllCatalogScreens.
 * Dependencies: lucide-react icons and Screen type from src/store.ts.
 * Maintenance note: keep this module pure; UI components render these records in App.tsx for now.
 */
import {
  BookOpen,
  CalendarDays,
  CircleUserRound,
  Clapperboard,
  FileText,
  Image as ImageIcon,
  Import,
  LockKeyhole,
  Mail,
  MessageCircle,
  Music,
  Palette,
  Phone,
  Play,
  Search,
  Settings,
  Shield,
  Sparkles,
  Wand2,
} from 'lucide-react';
import React from 'react';
import type { Screen } from '../store';

export interface DesktopCatalogApp {
  id: string;
  page: 0 | 1;
  screen: Screen;
  label: string;
  icon: React.ReactNode;
  color: string;
  x: number;
  y: number;
}

export interface DockCatalogApp {
  screen: Screen;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export const pageApps: DesktopCatalogApp[] = [
  { id: 'wechat', page: 0, screen: 'wechat', label: '微信', icon: <MessageCircle />, color: 'bg-[#dceecd]', x: 22, y: 22 },
  { id: 'qq', page: 0, screen: 'qq', label: 'QQ', icon: <Mail />, color: 'bg-[#cfe5ef]', x: 106, y: 22 },
  { id: 'gallery', page: 0, screen: 'gallery', label: '相册', icon: <ImageIcon />, color: 'bg-[#f4edbd]', x: 22, y: 126 },
  { id: 'calendar', page: 0, screen: 'calendar', label: '日历', icon: <CalendarDays />, color: 'bg-white', x: 106, y: 126 },
  { id: 'diary', page: 0, screen: 'diary', label: '日记', icon: <BookOpen />, color: 'bg-[#e9c4d5]', x: 44, y: 352 },
  { id: 'memo', page: 0, screen: 'memo', label: '备忘录', icon: <FileText />, color: 'bg-[#efe7a9]', x: 134, y: 352 },
  { id: 'peek', page: 0, screen: 'peek', label: '查手机', icon: <LockKeyhole />, color: 'bg-[#dceecd]', x: 224, y: 352 },
  { id: 'xiaohongshu', page: 1, screen: 'xiaohongshu', label: '小红书', icon: <Wand2 />, color: 'bg-[#e9c4d5]', x: 24, y: 24 },
  { id: 'bilibili', page: 1, screen: 'bilibili', label: 'B站', icon: <Play />, color: 'bg-[#cfe5ef]', x: 104, y: 24 },
  { id: 'theater', page: 1, screen: 'theater', label: '小剧场', icon: <Clapperboard />, color: 'bg-[#efe7a9]', x: 184, y: 24 },
  { id: 'music', page: 1, screen: 'music', label: '音乐', icon: <Music />, color: 'bg-[#dceecd]', x: 264, y: 24 },
  { id: 'browser', page: 1, screen: 'browser', label: '浏览器', icon: <Search />, color: 'bg-[#cfe5ef]', x: 24, y: 132 },
  { id: 'presets', page: 1, screen: 'presets', label: '预设', icon: <Shield />, color: 'bg-[#f4edbd]', x: 104, y: 132 },
  { id: 'ai-context', page: 1, screen: 'ai-context', label: 'AI上下文', icon: <Sparkles />, color: 'bg-[#dceecd]', x: 184, y: 132 },
  { id: 'logs', page: 1, screen: 'logs', label: '报错', icon: <FileText />, color: 'bg-[#ffd6d6]', x: 264, y: 132 },
  { id: 'char-active', page: 1, screen: 'char-active', label: 'char主动', icon: <Sparkles />, color: 'bg-[#efe7a9]', x: 24, y: 240 },
  { id: 'backup', page: 1, screen: 'backup', label: '数据备份', icon: <Import />, color: 'bg-[#dceecd]', x: 104, y: 240 },
  { id: 'user-info', page: 1, screen: 'user-info', label: 'User信息', icon: <CircleUserRound />, color: 'bg-[#f4edbd]', x: 184, y: 240 },
];

export const dockApps: DockCatalogApp[] = [
  { screen: 'phone', label: '电话', icon: <Phone />, color: 'bg-[#dceecd]' },
  { screen: 'settings', label: '设置', icon: <Settings />, color: 'bg-[#cfe5ef]' },
  { screen: 'contacts', label: '通讯录', icon: <CircleUserRound />, color: 'bg-[#f4edbd]' },
  { screen: 'themes', label: '主题', icon: <Palette />, color: 'bg-[#e9c4d5]' },
];

export function getAllCatalogScreens() {
  return [...pageApps.map((app) => app.screen), ...dockApps.map((app) => app.screen)];
}
