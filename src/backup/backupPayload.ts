export const BACKUP_STORAGE_KEY = 'char-phone-framework';

export type SmallPhoneBackupPayload = {
  app: 'small-phone';
  exportedAt: string;
  storageKey: typeof BACKUP_STORAGE_KEY;
  data: unknown;
};

export function buildBackupFileName(date = new Date()) {
  return `small-phone-backup-${date.toISOString().slice(0, 10)}.json`;
}

export function buildBackupPayload(rawStorage: string, exportedAt = new Date()): SmallPhoneBackupPayload {
  return {
    app: 'small-phone',
    exportedAt: exportedAt.toISOString(),
    storageKey: BACKUP_STORAGE_KEY,
    data: JSON.parse(rawStorage),
  };
}

export function buildBackupJson(rawStorage: string, exportedAt = new Date()) {
  return JSON.stringify(buildBackupPayload(rawStorage, exportedAt), null, 2);
}

export function buildNativeBackupMessage(filename: string, content: string) {
  return JSON.stringify({
    type: 'small-phone-backup-export',
    filename,
    mimeType: 'application/json',
    content,
  });
}
