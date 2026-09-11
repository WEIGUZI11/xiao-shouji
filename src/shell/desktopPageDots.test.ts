import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const globalCss = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
const desktopSource = readFileSync(new URL('./Desktop.tsx', import.meta.url), 'utf8');
const themeCssFiles = [
  '../themes/gothic/index.css',
  '../themes/guofeng/index.css',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));

assert.match(globalCss, /\.page-dots button\s*{[^}]*width:\s*36px[^}]*height:\s*36px/s, 'page dots need a compact but usable hit area');
assert.match(globalCss, /\.page-dot-mark\s*{[^}]*width:\s*7px/s, 'page navigation should render visual dots');
assert.match(globalCss, /\.page-dots button\.active \.page-dot-mark\s*{[^}]*width:\s*20px/s, 'the active page dot should be visibly extended');
assert.match(desktopSource, /startPageSwipe/, 'desktop should start horizontal swipe tracking');
assert.match(desktopSource, /finishPageSwipe/, 'desktop should finish horizontal swipe navigation');
assert.doesNotMatch(desktopSource, />\s*常用\s*</, 'desktop page navigation must not show a 常用 text tab');
assert.doesNotMatch(desktopSource, />\s*更多\s*</, 'desktop page navigation must not show a 更多 text tab');

for (const css of themeCssFiles) {
  assert.doesNotMatch(css, /\.page-dots button(?:\.active|:not\(\.active\))?\s*{[^}]*\b(?:width|height):\s*(?:[0-2]?\d)px/s, 'theme page-dot overrides must not shrink the button hit area below 30px');
}

console.log('desktop page dots ok');
