import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

assert.match(css, /\.theme-gothic \.phone-shell\.screen-presets header \{/);
assert.match(css, /background: #070708 !important/);
assert.match(css, /\.theme-gothic \.phone-shell\.screen-presets \.hand-panel \{[\s\S]*?background: #070708 !important/);
assert.match(css, /\.theme-gothic \.phone-shell\.screen-presets \.preset-entry-card \{[\s\S]*?background: #0b0b0c !important/);
assert.match(css, /\.theme-gothic \.phone-shell\.screen-presets \.hand-input::placeholder \{[\s\S]*?color: rgba\(255, 248, 238, 0\.52\)/);
assert.match(css, /:is\(\.preset-slot-notice, \.preset-mode-notice\) \{[\s\S]*?background: #09090a !important;[\s\S]*?color: #fff8ee !important/);
assert.match(css, /\.preset-entry-toggle\.is-enabled \{[\s\S]*?background: #d80f1f/);

console.log('gothic preset utility screen contrast ok');
