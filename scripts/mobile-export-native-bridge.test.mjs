import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const app = readFileSync(join(root, 'mobile-export', 'App.js'), 'utf8');
const tts = readFileSync(join(root, 'src', 'tts.ts'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(app.includes('ttsRequestControllersRef'), 'APK must track native TTS requests.');
assert(app.includes("message?.type === 'small-phone-tts-cancel'"), 'APK must accept TTS cancellation.');
assert(app.includes("controller.abort('timeout')"), 'APK TTS requests must time out.');
assert(tts.includes("type: 'small-phone-tts-cancel'"), 'WebView must cancel native TTS on abort or timeout.');

console.log('mobile export native TTS bridge checks passed');
