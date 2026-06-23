import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const themeDir = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(themeDir, 'index.css'), 'utf8');

const requiredSnippets = [
  '.theme-alcheris-pixel',
  '--theme-bg: #050505',
  '--theme-accent: #a855f7',
  '--theme-alert: #ff79c6',
  '--phone-font-family: "Courier New"',
  'SimHei',
  'image-rendering: pixelated',
  'box-shadow:',
  'inset 2px 2px 0 0 var(--theme-accent)',
  '@keyframes alcherisPixelDrift',
  '@keyframes alcherisScanline',
  '.theme-alcheris-pixel .phone-shell::before',
  '.theme-alcheris-pixel .app-icon',
  '.theme-alcheris-pixel .dock',
  'left: 50%',
  '.theme-alcheris-pixel .wechat-shell',
  '.theme-alcheris-pixel .qq-home-screen',
  '.theme-alcheris-pixel .ai-context-app',
  '.theme-alcheris-pixel .logs-app',
];

for (const snippet of requiredSnippets) {
  assert(css.includes(snippet), `alcheris-pixel CSS must include ${snippet}`);
}

console.log('alcheris-pixel theme css ok');
