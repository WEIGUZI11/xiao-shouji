import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8');

assert.match(mainSource, /themes\/polish\/index\.css/);
assert.match(css, /\.theme-celtic-paladin \.app-icon svg,[\s\S]*?opacity:\s*1\s*!important/);
assert.match(css, /\.theme-guofeng \.dock button > span:last-child\s*\{[^}]*display:\s*block\s*!important/s);
assert.match(css, /@media \(max-height:\s*760px\)/);

console.log('theme polish rules ok');
