import type { CSSProperties } from 'react';

import type { ThemeType } from '../themes/themeOptions';

export type DesktopPoint = { x: number; y: number };

export const redmiDesktopSafeTop = 64;
const defaultDesktopYOffset = 50;

const gothicDesktopPositions: Record<string, DesktopPoint> = {
  wechat: { x: 24, y: 72 },
  qq: { x: 108, y: 72 },
  gallery: { x: 24, y: 172 },
  calendar: { x: 108, y: 172 },
  diary: { x: 38, y: 382 },
  memo: { x: 132, y: 382 },
  peek: { x: 226, y: 382 },
  'image-bed': { x: 198, y: 86 },
  'time-card': { x: 12, y: 270 },
};

const guofengDesktopPositions: Record<string, DesktopPoint> = {
  wechat: { x: 30, y: 118 },
  qq: { x: 118, y: 118 },
  gallery: { x: 30, y: 224 },
  calendar: { x: 118, y: 224 },
  diary: { x: 48, y: 428 },
  memo: { x: 142, y: 428 },
  peek: { x: 236, y: 428 },
  xiaohongshu: { x: 10, y: 112 },
  bilibili: { x: 90, y: 112 },
  theater: { x: 170, y: 112 },
  music: { x: 250, y: 112 },
  browser: { x: 10, y: 222 },
  presets: { x: 90, y: 222 },
  'ai-context': { x: 170, y: 222 },
  logs: { x: 250, y: 222 },
  'char-active': { x: 50, y: 332 },
  backup: { x: 130, y: 332 },
  'user-info': { x: 210, y: 332 },
  'image-bed': { x: 214, y: 118 },
  'time-card': { x: 10, y: 318 },
};

const alcherisPixelDesktopPositions: Record<string, DesktopPoint> = {
  wechat: { x: 28, y: 116 },
  qq: { x: 112, y: 116 },
  gallery: { x: 28, y: 218 },
  calendar: { x: 112, y: 218 },
  diary: { x: 52, y: 410 },
  memo: { x: 148, y: 410 },
  peek: { x: 244, y: 410 },
  'image-bed': { x: 214, y: 118 },
  'time-card': { x: 16, y: 300 },
};

export function getDesktopDefaultPosition(theme: ThemeType, id: string, fallback: DesktopPoint): DesktopPoint {
  if (theme === 'gothic') return gothicDesktopPositions[id] || fallback;
  if (theme === 'guofeng') return guofengDesktopPositions[id] || fallback;
  if (theme === 'alcheris-pixel') return alcherisPixelDesktopPositions[id] || fallback;
  return { x: fallback.x, y: fallback.y + defaultDesktopYOffset };
}

export function getDesktopItemStyle(position: DesktopPoint): CSSProperties {
  return {
    left: position.x,
    top: Math.max(redmiDesktopSafeTop, position.y),
  };
}
