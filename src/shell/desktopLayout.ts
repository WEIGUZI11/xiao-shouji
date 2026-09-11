/**
 * Theme-scoped desktop defaults and safe positioning helpers.
 * Dedicated maps keep branded themes from inheriting the generic app grid.
 */
import type { CSSProperties } from 'react';

import type { ThemeType } from '../themes/themeOptions';

export type DesktopPoint = { x: number; y: number };

export const redmiDesktopSafeTop = 64;
const defaultDesktopYOffset = 50;

export function getDesktopLayoutStorageId(theme: ThemeType, id: string) {
  if (theme === 'gothic') return `gothic-p5-v3:${id}`;
  if (theme === 'concept-58') return `concept-58-v2:${id}`;
  return theme === 'pastel' ? id : `${theme}:${id}`;
}

const gothicDesktopPositions: Record<string, DesktopPoint> = {
  // P5's first desktop is intentionally asymmetric: a 2 x 2 app block,
  // album artwork, one wide clock card, and a centered three-app row.
  wechat: { x: 28, y: 123 },
  qq: { x: 116, y: 123 },
  gallery: { x: 28, y: 229 },
  calendar: { x: 116, y: 229 },
  diary: { x: 41, y: 453 },
  memo: { x: 146, y: 453 },
  peek: { x: 249, y: 453 },
  // Accounting stays available on P5's second desktop instead of breaking
  // the reference's centered three-app row.
  accounting: { x: 12, y: 442 },
  // Page two is a compact four-column launcher below the P5 layout control.
  xiaohongshu: { x: 12, y: 160 },
  bilibili: { x: 96, y: 160 },
  theater: { x: 180, y: 160 },
  music: { x: 264, y: 160 },
  browser: { x: 12, y: 254 },
  presets: { x: 96, y: 254 },
  'ai-context': { x: 180, y: 254 },
  logs: { x: 264, y: 254 },
  'char-active': { x: 12, y: 348 },
  backup: { x: 96, y: 348 },
  'user-info': { x: 180, y: 348 },
  'image-tasks': { x: 264, y: 348 },
  'image-bed': { x: 215, y: 139 },
  'time-card': { x: 15, y: 335 },
};

const guofengDesktopPositions: Record<string, DesktopPoint> = {
  wechat: { x: 30, y: 118 },
  qq: { x: 118, y: 118 },
  gallery: { x: 30, y: 224 },
  calendar: { x: 118, y: 224 },
  accounting: { x: 12, y: 428 },
  diary: { x: 94, y: 428 },
  memo: { x: 176, y: 428 },
  peek: { x: 258, y: 428 },
  xiaohongshu: { x: 19, y: 112 },
  bilibili: { x: 99, y: 112 },
  theater: { x: 179, y: 112 },
  music: { x: 259, y: 112 },
  browser: { x: 19, y: 222 },
  presets: { x: 99, y: 222 },
  'ai-context': { x: 179, y: 222 },
  logs: { x: 259, y: 222 },
  'char-active': { x: 19, y: 332 },
  backup: { x: 99, y: 332 },
  'user-info': { x: 179, y: 332 },
  'image-tasks': { x: 259, y: 332 },
  'image-bed': { x: 214, y: 118 },
  'time-card': { x: 10, y: 318 },
};

// The desktop canvas starts 20px inside the 390px phone shell.  Shifting the
// four-column launcher by 10px gives the icon union equal left/right breathing
// room instead of leaving every selected concept visibly biased to the left.
const conceptGridX = [22, 106, 190, 274] as const;

function buildConceptDesktopPositions({
  firstRow,
  secondRow,
  time,
  image,
}: {
  firstRow: number;
  secondRow: number;
  time: DesktopPoint;
  image: DesktopPoint;
}): Record<string, DesktopPoint> {
  return {
    wechat: { x: conceptGridX[0], y: firstRow },
    qq: { x: conceptGridX[1], y: firstRow },
    gallery: { x: conceptGridX[2], y: firstRow },
    calendar: { x: conceptGridX[3], y: firstRow },
    accounting: { x: conceptGridX[0], y: secondRow },
    diary: { x: conceptGridX[1], y: secondRow },
    memo: { x: conceptGridX[2], y: secondRow },
    peek: { x: conceptGridX[3], y: secondRow },
    'time-card': time,
    'image-bed': image,
  };
}

const selectedConceptDesktopPositions: Partial<Record<ThemeType, Record<string, DesktopPoint>>> = {
  'concept-20': buildConceptDesktopPositions({ firstRow: 178, secondRow: 270, time: { x: 12, y: 64 }, image: { x: 12, y: 364 } }),
  'concept-33': buildConceptDesktopPositions({ firstRow: 176, secondRow: 268, time: { x: 12, y: 64 }, image: { x: 12, y: 360 } }),
  'concept-57': buildConceptDesktopPositions({ firstRow: 274, secondRow: 364, time: { x: 12, y: 52 }, image: { x: 12, y: 462 } }),
  'concept-58': {
    ...buildConceptDesktopPositions({ firstRow: 204, secondRow: 290, time: { x: 12, y: 52 }, image: { x: 12, y: 402 } }),
    xiaohongshu: { x: 22, y: 170 },
    bilibili: { x: 106, y: 170 },
    theater: { x: 190, y: 170 },
    music: { x: 274, y: 170 },
    browser: { x: 22, y: 260 },
    presets: { x: 106, y: 260 },
    'ai-context': { x: 190, y: 260 },
    logs: { x: 274, y: 260 },
    'char-active': { x: 22, y: 350 },
    backup: { x: 106, y: 350 },
    'user-info': { x: 190, y: 350 },
    'image-tasks': { x: 274, y: 350 },
  },
};

export function getDesktopDefaultPosition(theme: ThemeType, id: string, fallback: DesktopPoint): DesktopPoint {
  if (theme === 'gothic') return gothicDesktopPositions[id] || fallback;
  if (theme === 'guofeng') return guofengDesktopPositions[id] || fallback;
  if (selectedConceptDesktopPositions[theme]) return selectedConceptDesktopPositions[theme]?.[id] || { x: fallback.x, y: fallback.y + defaultDesktopYOffset };
  return { x: fallback.x, y: fallback.y + defaultDesktopYOffset };
}

export function getDesktopAppPage(theme: ThemeType, id: string, defaultPage: 0 | 1): 0 | 1 {
  if (theme === 'gothic' && id === 'accounting') return 1;
  return defaultPage;
}

export function getDesktopItemStyle(position: DesktopPoint): CSSProperties {
  return {
    left: position.x,
    top: Math.max(redmiDesktopSafeTop, position.y),
  };
}
