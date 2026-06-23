import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const globalCss = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
const themeCssFiles = [
  '../themes/alcheris-pixel/index.css',
  '../themes/gothic/index.css',
  '../themes/guofeng/index.css',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));

assert.match(globalCss, /\.page-dots button\s*{[^}]*min-width:\s*32px/s, 'page dot buttons need a 32px touch width');
assert.match(globalCss, /\.page-dots button\s*{[^}]*min-height:\s*28px/s, 'page dot buttons need a 28px touch height');
assert.match(globalCss, /\.page-dots button::before\s*{[^}]*width:\s*9px/s, 'page dot visual dot should be drawn separately');
assert.match(globalCss, /\.page-dots button\.active::before\s*{[^}]*width:\s*22px/s, 'active page dot visual width should stay compact');

for (const css of themeCssFiles) {
  assert.doesNotMatch(css, /\.page-dots button(?:\.active|:not\(\.active\))?\s*{[^}]*\b(?:width|height):/s, 'theme page-dot overrides must not shrink the button hit area');
}

console.log('desktop page dots ok');
