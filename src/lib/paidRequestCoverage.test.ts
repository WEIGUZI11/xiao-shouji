import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const sharedAi = read('src/apps/shared/aiText.ts');
const imageEntry = read('src/lib/appImageGeneration.ts');
const tts = read('src/tts.ts');
const music = read('src/apps/music/MusicScreen.tsx');
const app = read('src/App.tsx');

assert.match(sharedAi, /kind: 'text-generation'/);
assert.match(sharedAi, /signal,/);
assert.match(imageEntry, /kind: 'image-generation'/);
assert.match(imageEntry, /requestNaiImage\(\{ config, prompt, signal: paidSignal/);
assert.match(tts, /kind: 'tts-synthesis'/);
assert.match(music, /kind: 'music-generation'/);
assert.match(music, /kind: 'tts-synthesis'/);
assert.match(app, /import \{ requestChatCompletion, requestChatCompletionStream \} from '\.\/apps\/shared\/aiText'/);
assert.doesNotMatch(app, /\/chat\/completions/);

console.log('paid request coverage ok');
