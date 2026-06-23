import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const themeDir = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(themeDir, 'index.css'), 'utf8');

const requiredSnippets = [
  '.theme-status-terminal',
  '--theme-accent: #8a90c7',
  '--theme-text: #4a4a5a',
  '--theme-muted: #7a7a8c',
  '--theme-accent-soft: #e8eaf6',
  'backdrop-filter: blur(12px)',
  '.theme-status-terminal .phone-shell',
  '.theme-status-terminal .cream-screen',
  '.theme-status-terminal .app-icon',
  '.theme-status-terminal .dock',
  '.theme-status-terminal .wechat-shell',
  '.theme-status-terminal .qq-home-screen',
  '.theme-status-terminal .browser-app',
  '.theme-status-terminal .ai-context-app',
  '.theme-status-terminal .logs-app',
];

for (const snippet of requiredSnippets) {
  assert(css.includes(snippet), `status-terminal CSS must include ${snippet}`);
}

const forbiddenColorSnippets = [
  '#dff3eb',
  '#fff4d8',
  '#537ce8',
  '#6390ff',
  '#dde7ff',
  'repeating-linear-gradient',
];

for (const snippet of forbiddenColorSnippets) {
  assert(!css.includes(snippet), `status-terminal CSS must avoid non-reference color ${snippet}`);
}

console.log('status-terminal theme css ok');
