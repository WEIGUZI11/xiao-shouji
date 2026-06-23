import assert from 'node:assert/strict';

import {
  FIRST_USE_GUIDE_TIP_STORAGE_KEY,
  markFirstUseGuideTipSeen,
  shouldShowFirstUseGuideTip,
} from './firstUseGuideTip';

function createMemoryStorage(seed: Record<string, string> = {}) {
  const data = { ...seed };

  return {
    getItem: (key: string) => (Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null),
    setItem: (key: string, value: string) => { data[key] = String(value); },
    removeItem: (key: string) => { delete data[key]; },
    clear: () => { Object.keys(data).forEach((key) => delete data[key]); },
    key: (index: number) => Object.keys(data)[index] || null,
    get length() {
      return Object.keys(data).length;
    },
  } as Storage;
}

const emptyStorage = createMemoryStorage();
assert.equal(shouldShowFirstUseGuideTip(emptyStorage), true);

markFirstUseGuideTipSeen(emptyStorage);
assert.equal(emptyStorage.getItem(FIRST_USE_GUIDE_TIP_STORAGE_KEY), 'seen');
assert.equal(shouldShowFirstUseGuideTip(emptyStorage), false);

const seenStorage = createMemoryStorage({ [FIRST_USE_GUIDE_TIP_STORAGE_KEY]: 'seen' });
assert.equal(shouldShowFirstUseGuideTip(seenStorage), false);

console.log('first use guide tip ok');
