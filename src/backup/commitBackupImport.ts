import { BACKUP_STORAGE_KEY, parseBackupStorageData } from './backupPayload';
import { mergeBackupPreservingCurrent } from './safeMerge';

/** Call after image import, with no asynchronous gap between reading and committing state. */
export function commitBackupImport(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  incoming: unknown,
  hydrate: () => void,
) {
  const data = parseBackupStorageData(incoming);
  const previous = storage.getItem(BACKUP_STORAGE_KEY);
  const current = previous ? parseBackupStorageData(previous) : undefined;
  const merged = mergeBackupPreservingCurrent(current, data);
  // Strict write: quota failures must not fall through to lossy persistence compaction.
  storage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(merged));
  try {
    // Synchronous localStorage hydration prevents background saves using stale in-memory data.
    hydrate();
  } catch (error) {
    if (previous === null) storage.removeItem(BACKUP_STORAGE_KEY);
    else storage.setItem(BACKUP_STORAGE_KEY, previous);
    hydrate();
    throw error;
  }
}
