const IMAGE_ASSET_DB = 'xiaophone-image-assets';
const IMAGE_ASSET_STORE = 'images';
const IMAGE_ASSET_VERSION = 1;
export const IMAGE_ASSET_SCHEME = 'xiaophone://image/';

export type ImageAssetBackup = Record<string, string>;
export type ImageAssetInfo = {
  id: string;
  reference: string;
  byteSize: number;
  referenced: boolean;
};

function createAssetId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function openImageAssetDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前环境不支持 IndexedDB 图片存储。'));
      return;
    }
    const request = indexedDB.open(IMAGE_ASSET_DB, IMAGE_ASSET_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_ASSET_STORE)) db.createObjectStore(IMAGE_ASSET_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('图片存储打开失败。'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openImageAssetDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(IMAGE_ASSET_STORE, mode);
      const request = work(transaction.objectStore(IMAGE_ASSET_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('图片存储操作失败。'));
      transaction.onerror = () => reject(transaction.error || new Error('图片存储事务失败。'));
    });
  } finally {
    db.close();
  }
}

export function isImageAssetReference(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(IMAGE_ASSET_SCHEME);
}

function idFromReference(reference: string) {
  return reference.slice(IMAGE_ASSET_SCHEME.length);
}

export async function saveImageAsset(source: string) {
  if (!source || source.startsWith(IMAGE_ASSET_SCHEME) || !source.startsWith('data:image/')) return source;
  const id = createAssetId();
  await withStore('readwrite', (store) => store.put(source, id));
  return `${IMAGE_ASSET_SCHEME}${id}`;
}

export async function resolveImageAsset(source: string) {
  if (!isImageAssetReference(source)) return source;
  const stored = await withStore<string | undefined>('readonly', (store) => store.get(idFromReference(source)));
  return stored || '';
}

export async function exportImageAssets(): Promise<ImageAssetBackup> {
  const db = await openImageAssetDb();
  try {
    return await new Promise((resolve, reject) => {
      const result: ImageAssetBackup = {};
      const request = db.transaction(IMAGE_ASSET_STORE, 'readonly').objectStore(IMAGE_ASSET_STORE).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(result);
          return;
        }
        if (typeof cursor.key === 'string' && typeof cursor.value === 'string') result[cursor.key] = cursor.value;
        cursor.continue();
      };
      request.onerror = () => reject(request.error || new Error('图片资产导出失败。'));
    });
  } finally {
    db.close();
  }
}

export async function importImageAssets(assets: unknown) {
  if (!assets || typeof assets !== 'object' || Array.isArray(assets)) return 0;
  const entries = Object.entries(assets as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string' && entry[1].startsWith('data:image/'),
  );
  if (entries.length === 0) return 0;
  const db = await openImageAssetDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(IMAGE_ASSET_STORE, 'readwrite');
      const store = transaction.objectStore(IMAGE_ASSET_STORE);
      entries.forEach(([id, value]) => store.put(value, id));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('图片资产导入失败。'));
    });
  } finally {
    db.close();
  }
  return entries.length;
}

export async function importImageAssetsPreservingExisting(assets: unknown) {
  if (!assets || typeof assets !== 'object' || Array.isArray(assets)) return 0;
  const entries = Object.entries(assets as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string' && entry[1].startsWith('data:image/'),
  );
  if (entries.length === 0) return 0;
  const db = await openImageAssetDb();
  try {
    let imported = 0;
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(IMAGE_ASSET_STORE, 'readwrite');
      const store = transaction.objectStore(IMAGE_ASSET_STORE);
      entries.forEach(([id, value]) => {
        const request = store.get(id);
        request.onsuccess = () => {
          if (request.result === undefined) {
            store.put(value, id);
            imported += 1;
          }
        };
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('图片资产安全导入失败。'));
      transaction.onabort = () => reject(transaction.error || new Error('图片导入已中断，原有图片未修改，请重试。'));
    });
    return imported;
  } finally {
    db.close();
  }
}

export async function clearImageAssets() {
  await withStore('readwrite', (store) => store.clear());
}

export function collectImageAssetReferences(value: unknown, result = new Set<string>()): Set<string> {
  if (isImageAssetReference(value)) {
    result.add(value);
    return result;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectImageAssetReferences(item, result));
    return result;
  }
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => collectImageAssetReferences(item, result));
  }
  return result;
}

export async function listImageAssets(references: ReadonlySet<string> = new Set()): Promise<ImageAssetInfo[]> {
  const assets = await exportImageAssets();
  return Object.entries(assets).map(([id, value]) => {
    const reference = `${IMAGE_ASSET_SCHEME}${id}`;
    return {
      id,
      reference,
      byteSize: new Blob([value]).size,
      referenced: references.has(reference),
    };
  });
}

export async function deleteImageAssets(references: string[]) {
  const ids = Array.from(new Set(references.filter(isImageAssetReference).map(idFromReference)));
  if (ids.length === 0) return 0;
  const db = await openImageAssetDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(IMAGE_ASSET_STORE, 'readwrite');
      const store = transaction.objectStore(IMAGE_ASSET_STORE);
      ids.forEach((id) => store.delete(id));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('图片资产删除失败。'));
    });
  } finally {
    db.close();
  }
  return ids.length;
}
