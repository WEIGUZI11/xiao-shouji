export const BACKUP_STORAGE_KEY = 'char-phone-framework';

export type SmallPhoneBackupPayload = {
  app: 'small-phone';
  exportedAt: string;
  storageKey: typeof BACKUP_STORAGE_KEY;
  data: unknown;
  imageAssets?: Record<string, string>;
  auxiliaryStorage?: Record<string, string>;
};

function parseJsonValue(value: unknown) {
  let current = value;
  for (let attempt = 0; attempt < 2 && typeof current === 'string'; attempt += 1) {
    current = JSON.parse(current.replace(/^\uFEFF/, ''));
  }
  return current;
}

export function parseBackupDocument(value: unknown) {
  const parsed = parseJsonValue(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('备份格式不正确');
  }
  return parsed as Record<string, unknown>;
}

export function parseBackupStorageData(value: unknown) {
  const envelope = parseBackupDocument(value);
  const candidate = envelope.storageKey === BACKUP_STORAGE_KEY || envelope.app === 'small-phone'
    ? parseJsonValue(envelope.data)
    : Object.hasOwn(envelope, BACKUP_STORAGE_KEY) ? parseJsonValue(envelope[BACKUP_STORAGE_KEY]) : envelope;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || !('state' in candidate)) {
    throw new Error('备份格式不正确');
  }
  if (!candidate.state || typeof candidate.state !== 'object' || Array.isArray(candidate.state)) {
    throw new Error('备份中的 state 数据无效，未修改当前数据');
  }
  return candidate as Record<string, unknown>;
}

export function buildBackupFileName(date = new Date()) {
  return `small-phone-backup-${date.toISOString().slice(0, 10)}.json`;
}

export function buildBackupPayload(
  rawStorage: string,
  exportedAt = new Date(),
  imageAssets?: Record<string, string>,
  auxiliaryStorage?: Record<string, string>,
): SmallPhoneBackupPayload {
  return {
    app: 'small-phone',
    exportedAt: exportedAt.toISOString(),
    storageKey: BACKUP_STORAGE_KEY,
    data: JSON.parse(rawStorage),
    ...(imageAssets && Object.keys(imageAssets).length > 0 ? { imageAssets } : {}),
    ...(auxiliaryStorage && Object.keys(auxiliaryStorage).length > 0 ? { auxiliaryStorage } : {}),
  };
}

export function buildBackupJson(
  rawStorage: string,
  exportedAt = new Date(),
  imageAssets?: Record<string, string>,
  auxiliaryStorage?: Record<string, string>,
) {
  return JSON.stringify(buildBackupPayload(rawStorage, exportedAt, imageAssets, auxiliaryStorage), null, 2);
}

export function buildNativeBackupMessage(filename: string, content: string) {
  return JSON.stringify({
    type: 'small-phone-backup-export',
    filename,
    mimeType: 'application/json',
    content,
  });
}
