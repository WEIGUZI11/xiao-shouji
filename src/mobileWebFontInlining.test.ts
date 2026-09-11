import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../mobile-export/refresh-web.ps1', import.meta.url), 'utf8');
assert.match(script, /\.woff2/, 'offline export should discover built WOFF2 assets');
assert.match(script, /android-local-backup\\app\\src\\main\\assets\\fonts/, 'offline export should copy fonts into Android assets');
assert.match(script, /file:\/\/\/android_asset\/fonts\//, 'offline export should reference fonts from Android assets');
assert.doesNotMatch(script, /data:font\/woff2;base64/, 'offline export must not place large font base64 strings in the React Native bundle');
assert.match(script, /Join-Path \$assets/, 'offline export should resolve fonts from Vite assets');

console.log('mobile WebView font asset guard ok');
