import assert from 'node:assert/strict';

import {
  PERSISTED_CHAT_IMAGE_PLACEHOLDER,
  compactPersistedAppState,
  compactPersistedStorageValue,
  createQuotaSafeStateStorage,
  isPersistedImagePlaceholder,
} from './storePersistence';

const bigDataUrl = `data:image/png;base64,${'a'.repeat(2048)}`;

const compacted = compactPersistedAppState({
  apiKey: 'keep-key',
  characters: [{ id: 'char-a', avatar: bigDataUrl }],
  chatSessions: {
    'wechat:char-a': {
      id: 'char-a',
      channel: 'wechat',
      messages: [
        { id: 'msg-a', kind: 'image', content: bigDataUrl, role: 'user' },
        { id: 'msg-b', kind: 'text', content: bigDataUrl, role: 'user' },
      ],
    },
  },
  galleryPhotos: [{ id: 'photo-a', url: bigDataUrl, title: 'photo' }],
  generatedImageRecords: [{ imageId: 'image-a', storageUrl: bigDataUrl, status: 'success' }],
  appLogs: [{ id: 'log-a', detail: `preview=${bigDataUrl}` }],
});

assert.equal(compacted.apiKey, 'keep-key');
assert.equal(compacted.characters[0].avatar, bigDataUrl);
assert.equal(compacted.chatSessions['wechat:char-a'].messages[0].content, bigDataUrl);
assert.equal(compacted.chatSessions['wechat:char-a'].messages[1].content, '[image data omitted]');
assert.equal(compacted.galleryPhotos[0].url, bigDataUrl);
assert.equal(compacted.generatedImageRecords[0].storageUrl, bigDataUrl);
assert.doesNotMatch(compacted.appLogs[0].detail, /data:image/);
assert.equal(isPersistedImagePlaceholder(PERSISTED_CHAT_IMAGE_PLACEHOLDER), true);

const completeRequestDetail = '完整发送文本'.repeat(2000);
const preservedRequestLogs = compactPersistedAppState({
  appLogs: [
    { id: 'full-1', title: '完整请求', detail: completeRequestDetail, preserveFullDetail: true },
    { id: 'normal-1', title: '普通日志', detail: completeRequestDetail },
  ],
});
assert.equal(preservedRequestLogs.appLogs[0].detail, completeRequestDetail);
assert.ok(preservedRequestLogs.appLogs[1].detail.length <= 2403);
const aggressivelyCompactedRequestLogs = compactPersistedAppState({
  appLogs: [{ id: 'full-1', title: '完整请求', detail: completeRequestDetail, preserveFullDetail: true }],
}, { aggressive: true });
assert.ok(aggressivelyCompactedRequestLogs.appLogs[0].detail.length <= 803);

const envelope = compactPersistedStorageValue(JSON.stringify({
  state: {
    chatSessions: {
      'wechat:char-a': {
        messages: [{ id: 'msg-a', kind: 'image', content: bigDataUrl }],
      },
    },
    galleryPhotos: [],
    generatedImageRecords: [],
    appLogs: [],
  },
  version: 1,
}));
assert.match(envelope, /data:image/);

const hugeText = 'long-content'.repeat(5000);
const hugeEnvelope = JSON.stringify({
  state: {
    chatSessions: {
      'wechat:char-a': {
        messages: Array.from({ length: 260 }, (_, index) => ({
          id: `msg-${index}`,
          kind: 'text',
          content: `${index}-${hugeText}`,
          role: index % 2 ? 'model' : 'user',
          timestamp: index,
          favorite: index === 0,
        })),
      },
    },
    purchaseRecords: Array.from({ length: 220 }, (_, index) => ({
      id: `order-${index}`,
      characterId: 'char-a',
      itemName: `milk-tea-${index}`,
      amount: '18',
      note: hugeText,
      createdAt: index,
    })),
    diaries: Array.from({ length: 180 }, (_, index) => ({
      id: `diary-${index}`,
      owner: 'user',
      title: `diary-${index}`,
      content: hugeText,
      tags: [],
      reviews: [{ characterId: 'char-a', content: hugeText, createdAt: index }],
      createdAt: index,
      updatedAt: index,
    })),
    galleryPhotos: [{ id: 'photo-a', url: bigDataUrl, reviews: [{ content: hugeText, createdAt: 1 }] }],
    generatedImageRecords: [{ imageId: 'image-a', promptText: hugeText, storageUrl: bigDataUrl, status: 'success' }],
    appLogs: Array.from({ length: 100 }, (_, index) => ({ id: `log-${index}`, title: 'log', detail: hugeText, createdAt: index })),
  },
  version: 1,
});

const quotaEnvelope = compactPersistedStorageValue(hugeEnvelope, { aggressive: true });
const normalQuotaEnvelope = compactPersistedStorageValue(hugeEnvelope);
const quotaState = JSON.parse(quotaEnvelope).state;
assert.equal(quotaState.purchaseRecords.length, 160);
assert.equal(quotaState.diaries.length, 140);
assert.equal(quotaState.chatSessions['wechat:char-a'].messages.length, 181);
assert.equal(quotaState.chatSessions['wechat:char-a'].messages[0].id, 'msg-0');
assert.ok(quotaState.purchaseRecords[0].note.length <= 800);
assert.ok(quotaState.diaries[0].content.length <= 6000);
assert.equal(quotaState.galleryPhotos[0].url, PERSISTED_CHAT_IMAGE_PLACEHOLDER);
assert.ok(quotaEnvelope.length < hugeEnvelope.length / 5);
assert.ok(quotaEnvelope.length < normalQuotaEnvelope.length);

class SizeLimitedStorage implements Storage {
  private values = new Map<string, string>();
  constructor(private readonly maxValueLength: number) {}
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  key(index: number) { return Array.from(this.values.keys())[index] || null; }
  getItem(key: string) { return this.values.get(key) || null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) {
    if (value.length > this.maxValueLength) {
      const error = new Error('Setting the value exceeded the quota.');
      error.name = 'QuotaExceededError';
      throw error;
    }
    this.values.set(key, value);
  }
}

const storage = new SizeLimitedStorage(Math.floor((normalQuotaEnvelope.length + quotaEnvelope.length) / 2));
createQuotaSafeStateStorage(() => storage).setItem('char-phone-framework', hugeEnvelope);
assert.equal(storage.getItem('char-phone-framework'), quotaEnvelope);

const preserveStorage = new SizeLimitedStorage(64);
preserveStorage.setItem('char-phone-framework', 'previous-valid-state');
createQuotaSafeStateStorage(() => preserveStorage).setItem('char-phone-framework', hugeEnvelope);
assert.equal(preserveStorage.getItem('char-phone-framework'), 'previous-valid-state');

console.log('store persistence compaction ok');
