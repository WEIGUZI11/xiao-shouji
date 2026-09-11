import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bubbleStyleOptions,
  normalizeBubbleStyle,
  normalizeTheme,
  themeOptions,
} from './themeOptions';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const themeIds = themeOptions.map((theme) => theme.id);
const uniqueThemeIds = new Set(themeIds);
const bubbleStyleIds = bubbleStyleOptions.map((style) => style.id);
const uniqueBubbleStyleIds = new Set(bubbleStyleIds);
const srcDir = dirname(dirname(fileURLToPath(import.meta.url)));
const curatedThemeIds = ['pastel', 'gothic', 'guofeng', 'celtic-paladin', 'status-terminal', 'concept-20', 'concept-33', 'concept-57', 'concept-58'];

assert(themeIds.includes('status-terminal'), 'theme options must include the status-terminal theme');
assert(JSON.stringify(themeIds) === JSON.stringify(curatedThemeIds), 'theme options should expose only the distinct curated themes');
assert(normalizeTheme('alcheris-pixel') === 'pastel', 'a removed theme should migrate to the safe cream fallback');
assert(normalizeTheme('concept-26') === 'pastel', 'a removed duplicate concept should migrate to the safe cream fallback');
assert(!themeIds.includes('frosting-cloud' as never), 'deleted frosting-cloud theme must stay absent');
assert(!themeIds.includes('tidal-post-office' as never), 'deleted tidal-post-office theme must stay absent');
assert(uniqueThemeIds.size === themeIds.length, 'theme option ids must be unique');
assert(bubbleStyleIds.includes('theme'), 'bubble options must include the follow-theme fallback');
assert(bubbleStyleIds.length === 19, 'bubble options must expose follow-theme plus 18 readable numbered skins');
assert(bubbleStyleIds.includes('lunar-halo'), 'bubble options must include 01 lunar-halo');
assert(bubbleStyleIds.includes('tidal-stamp'), 'bubble options must include 20 tidal-stamp');
assert(!bubbleStyleOptions.some((style) => style.number === '10'), 'deleted number 10 must stay absent');
assert(uniqueBubbleStyleIds.size === bubbleStyleIds.length, 'bubble style ids must be unique');
assert(normalizeBubbleStyle('holographic-jelly') === 'holographic-jelly', 'known bubble styles must survive normalization');
assert(normalizeBubbleStyle('glass') === 'holographic-jelly', 'legacy bubble styles should migrate to their closest numbered skin');
assert(normalizeBubbleStyle('legacy-value') === 'theme', 'unknown bubble styles must fall back to the current theme');
assert(
  existsSync(join(srcDir, 'themes', 'status-terminal', 'index.css')),
  'status-terminal theme CSS must exist under src/themes/status-terminal',
);
assert(
  existsSync(join(srcDir, 'themes', 'bubbles', 'index.css')),
  'selectable bubble skin CSS must exist under src/themes/bubbles',
);
assert(
  existsSync(join(srcDir, 'themes', 'selected-concepts', 'index.css')),
  'selected numbered concept CSS must exist under src/themes/selected-concepts',
);

console.log('theme options ok');
