import type { StateStorage } from 'zustand/middleware';

export const PERSISTED_CHAT_IMAGE_PLACEHOLDER = 'xiaophone://chat-image/cleared-for-storage';

const DATA_IMAGE_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;
const INLINE_DATA_IMAGE_PATTERN = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g;

type RecordLike = Record<string, any>;
type CompactOptions = {
  aggressive?: boolean;
};

const NORMAL_MAX_LOGS = 80;
const QUOTA_MAX_LOGS = 20;
const QUOTA_MAX_SESSION_MESSAGES = 180;
const QUOTA_MAX_PURCHASE_RECORDS = 160;
const QUOTA_MAX_DIARIES = 140;
const QUOTA_MAX_GALLERY_PHOTOS = 220;
const QUOTA_MAX_GENERATED_IMAGE_RECORDS = 160;

export function isDataImageUrl(value: unknown) {
  return typeof value === 'string' && DATA_IMAGE_PATTERN.test(value);
}

export function isPersistedImagePlaceholder(value: unknown) {
  return value === PERSISTED_CHAT_IMAGE_PLACEHOLDER;
}

function stripInlineImageData(value: unknown) {
  if (typeof value !== 'string') return value;
  return value.replace(INLINE_DATA_IMAGE_PATTERN, '[image data omitted]');
}

function compactText(value: unknown, maxLength?: number) {
  if (typeof value !== 'string') return value;
  const clean = String(stripInlineImageData(value));
  return maxLength && clean.length > maxLength ? clean.slice(0, maxLength) : clean;
}

function compactReview(review: unknown, options: CompactOptions) {
  if (!review || typeof review !== 'object' || Array.isArray(review)) return review;
  const item = review as RecordLike;
  return {
    ...item,
    content: compactText(item.content, options.aggressive ? 1200 : 4000),
  };
}

function compactReviews(reviews: unknown, options: CompactOptions) {
  if (!Array.isArray(reviews)) return reviews;
  const scoped = options.aggressive ? reviews.slice(0, 6) : reviews;
  return scoped.map((review) => compactReview(review, options));
}

function compactMessage(message: unknown, options: CompactOptions) {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return message;
  const item = message as RecordLike;
  const content = item.kind === 'image' && isDataImageUrl(item.content)
    ? options.aggressive ? PERSISTED_CHAT_IMAGE_PLACEHOLDER : item.content
    : compactText(item.content, options.aggressive ? 2400 : undefined);
  const next: RecordLike = {
    ...item,
    content,
    transcript: compactText(item.transcript, options.aggressive ? 1200 : undefined),
    note: compactText(item.note, options.aggressive ? 600 : undefined),
    itemName: compactText(item.itemName, 240),
    amount: compactText(item.amount, 120),
  };
  if (options.aggressive && item.kind === 'image' && isDataImageUrl(item.content)) {
    next.stickerLabel = item.stickerLabel ? `${item.stickerLabel}` : 'image';
  }
  return next;
}

function compactChatSessions(chatSessions: unknown, options: CompactOptions) {
  if (!chatSessions || typeof chatSessions !== 'object' || Array.isArray(chatSessions)) return chatSessions;
  return Object.fromEntries(
    Object.entries(chatSessions as Record<string, RecordLike>).map(([key, session]) => {
      const messages = Array.isArray(session?.messages)
        ? compactSessionMessages(session.messages, options).map((message) => compactMessage(message, options))
        : session?.messages;
      return [key, { ...session, messages }];
    }),
  );
}

function compactSessionMessages(messages: unknown[], options: CompactOptions) {
  if (!options.aggressive || messages.length <= QUOTA_MAX_SESSION_MESSAGES) return messages;
  const recent = messages.slice(-QUOTA_MAX_SESSION_MESSAGES);
  const keepIds = new Set(recent.map((message) => (message as RecordLike)?.id).filter(Boolean));
  for (const message of messages) {
    const item = message as RecordLike;
    if (item?.favorite && item.id) keepIds.add(item.id);
  }
  return messages.filter((message) => {
    const id = (message as RecordLike)?.id;
    return id ? keepIds.has(id) : recent.includes(message);
  });
}

function compactGalleryPhotos(galleryPhotos: unknown, options: CompactOptions) {
  if (!Array.isArray(galleryPhotos)) return galleryPhotos;
  const scoped = options.aggressive ? galleryPhotos.slice(0, QUOTA_MAX_GALLERY_PHOTOS) : galleryPhotos;
  return scoped.map((photo) => {
    if (!photo || typeof photo !== 'object') return photo;
    const item = photo as RecordLike;
    return {
      ...item,
      url: options.aggressive && isDataImageUrl(item.url) ? PERSISTED_CHAT_IMAGE_PLACEHOLDER : item.url,
      description: compactText(item.description, options.aggressive ? 1000 : 3000),
      note: compactText(item.note, options.aggressive ? 1000 : 3000),
      reviews: compactReviews(item.reviews, options),
    };
  });
}

function compactGeneratedImageRecords(records: unknown, options: CompactOptions) {
  if (!Array.isArray(records)) return records;
  const scoped = options.aggressive ? records.slice(0, QUOTA_MAX_GENERATED_IMAGE_RECORDS) : records;
  return scoped.map((record) => {
    if (!record || typeof record !== 'object') return record;
    const item = record as RecordLike;
    return {
      ...item,
      promptText: compactText(item.promptText, options.aggressive ? 1200 : 4000),
      storageUrl: options.aggressive && isDataImageUrl(item.storageUrl) ? PERSISTED_CHAT_IMAGE_PLACEHOLDER : item.storageUrl,
      error: compactText(item.error, 1200),
    };
  });
}

function compactPurchaseRecords(records: unknown, options: CompactOptions) {
  if (!Array.isArray(records)) return records;
  const scoped = options.aggressive ? records.slice(0, QUOTA_MAX_PURCHASE_RECORDS) : records;
  return scoped.map((record) => {
    if (!record || typeof record !== 'object') return record;
    const item = record as RecordLike;
    return {
      ...item,
      itemName: compactText(item.itemName, 240),
      amount: compactText(item.amount, 120),
      note: compactText(item.note, options.aggressive ? 800 : 2400),
    };
  });
}

function compactDiaries(diaries: unknown, options: CompactOptions) {
  if (!Array.isArray(diaries)) return diaries;
  const scoped = options.aggressive ? diaries.slice(0, QUOTA_MAX_DIARIES) : diaries;
  return scoped.map((diary) => {
    if (!diary || typeof diary !== 'object') return diary;
    const item = diary as RecordLike;
    const reviews = compactReviews(item.reviews, options);
    return {
      ...item,
      title: compactText(item.title, 240),
      content: compactText(item.content, options.aggressive ? 6000 : undefined),
      mood: compactText(item.mood, 240),
      review: compactReview(item.review, options),
      reviews,
    };
  });
}

function compactAppLogs(logs: unknown, options: CompactOptions) {
  if (!Array.isArray(logs)) return logs;
  return logs.slice(0, options.aggressive ? QUOTA_MAX_LOGS : NORMAL_MAX_LOGS).map((log, index) => {
    if (!log || typeof log !== 'object') return log;
    const item = log as RecordLike;
    const preserveFullDetail = item.preserveFullDetail === true && !options.aggressive && index < 8;
    return {
      ...item,
      title: compactText(item.title, 240),
      detail: compactText(item.detail, options.aggressive ? 800 : preserveFullDetail ? 120_000 : 2400),
    };
  });
}

export function compactPersistedAppState<T extends RecordLike>(state: T, options: CompactOptions = {}): T {
  return {
    ...state,
    chatSessions: compactChatSessions(state.chatSessions, options),
    purchaseRecords: compactPurchaseRecords(state.purchaseRecords, options),
    diaries: compactDiaries(state.diaries, options),
    galleryPhotos: compactGalleryPhotos(state.galleryPhotos, options),
    generatedImageRecords: compactGeneratedImageRecords(state.generatedImageRecords, options),
    appLogs: compactAppLogs(state.appLogs, options),
  };
}

export function compactPersistedStorageValue(value: string, options: CompactOptions = {}) {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || !('state' in parsed)) return value;
    return JSON.stringify({
      ...parsed,
      state: compactPersistedAppState((parsed as RecordLike).state || {}, options),
    });
  } catch {
    return value;
  }
}

function isQuotaError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.name === 'QuotaExceededError'
    || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || /quota|storage/i.test(error.message);
}

const serverFallbackValues = new Map<string, string>();
const serverFallbackStorage: Storage = {
  get length() { return serverFallbackValues.size; },
  clear: () => serverFallbackValues.clear(),
  key: (index) => Array.from(serverFallbackValues.keys())[index] || null,
  getItem: (key) => serverFallbackValues.get(key) || null,
  removeItem: (key) => { serverFallbackValues.delete(key); },
  setItem: (key, value) => { serverFallbackValues.set(key, value); },
};

export function createQuotaSafeStateStorage(baseStorage = () => typeof localStorage === 'undefined' ? serverFallbackStorage : localStorage): StateStorage {
  return {
    getItem: (name) => baseStorage().getItem(name),
    removeItem: (name) => baseStorage().removeItem(name),
    setItem: (name, value) => {
      const storage = baseStorage();
      const previousValue = storage.getItem(name);
      try {
        storage.setItem(name, value);
      } catch (error) {
        if (!isQuotaError(error)) throw error;
        try {
          storage.setItem(name, compactPersistedStorageValue(value));
        } catch (compactError) {
          if (!isQuotaError(compactError)) throw compactError;
          const emergencyValue = compactPersistedStorageValue(value, { aggressive: true });
          try {
            storage.setItem(name, emergencyValue);
          } catch (emergencyError) {
            if (!isQuotaError(emergencyError)) throw emergencyError;
            if (previousValue !== null && storage.getItem(name) !== previousValue) {
              storage.setItem(name, previousValue);
            }
          }
        }
      }
    },
  };
}
