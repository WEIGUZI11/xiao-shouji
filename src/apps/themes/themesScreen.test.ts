import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screenSource = readFileSync(new URL('./ThemesScreen.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

for (const label of ['圆润手写', '系统清爽', '书卷宋楷', '像素终端']) {
  assert.match(screenSource, new RegExp(label), `font selector should expose ${label}`);
}

for (const sampleClass of [
  '.font-choice-sample-rounded',
  '.font-choice-sample-system',
  '.font-choice-sample-serif',
  '.font-choice-sample-pixel',
]) {
  assert.match(cssSource, new RegExp(sampleClass.replace('.', '\\.')), `CSS should style ${sampleClass}`);
}

assert.match(cssSource, /Comic Sans MS/, 'rounded font should use a visibly different playful fallback');
assert.match(cssSource, /STKaiti/, 'serif font should use a visibly different Chinese serif/kaiti fallback');
assert.match(cssSource, /Consolas/, 'pixel font should use a visibly different monospace fallback');
assert.match(screenSource, /softwareIconsExpanded,\s*setSoftwareIconsExpanded\]\s*=\s*useState\(false\)/, 'software icon list should stay collapsed by default');
