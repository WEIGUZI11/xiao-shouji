import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./Desktop.tsx', import.meta.url), 'utf8');

assert.match(source, /saveImageAsset\(await readCustomImageFile\(file\)\)/, 'desktop image uploads must validate and persist image bytes');
assert.match(source, /<PersistentImage src=\{imageBed\}/, 'desktop image bed must resolve persisted image references');
assert.match(source, /accept=\{customImageAccept\}/, 'desktop image picker must restrict files to supported image formats');
assert.match(source, /自定义图片/, 'empty image bed must clearly tell the user that the image is customizable');
assert.match(source, /role="status"/, 'desktop image uploads must show success or failure feedback');

console.log('desktop image upload ok');
