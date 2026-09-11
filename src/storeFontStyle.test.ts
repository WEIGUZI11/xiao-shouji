import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { normalizePhoneFontStyle, phoneFontStyleIds } from './store';

assert.equal(phoneFontStyleIds.length, 11, 'system font plus ten bundled choices should be registered');
for (const id of phoneFontStyleIds) {
  assert.equal(normalizePhoneFontStyle(id), id, `${id} should survive persistence migration`);
}
assert.equal(normalizePhoneFontStyle('removed-font'), 'rounded');
assert.equal(normalizePhoneFontStyle(null), 'rounded');

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const storeSource = readFileSync(new URL('./store.ts', import.meta.url), 'utf8');
assert.match(appSource, /const fontClass = `font-\$\{fontStyle\}`/, 'App should apply every registered font class');
const persistedSchemaVersion = Number(storeSource.match(/version:\s*(\d+)/)?.[1] || 0);
assert.ok(persistedSchemaVersion >= 76, 'per-character appearance migration should remain included in the persisted schema version');

console.log('phone font style catalog ok');
