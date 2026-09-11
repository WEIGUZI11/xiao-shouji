function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function itemKey(value: unknown) {
  if (!isRecord(value)) return '';
  for (const key of ['id', 'messageId', 'key']) {
    const candidate = value[key];
    if (typeof candidate === 'string' || typeof candidate === 'number') return `${key}:${candidate}`;
  }
  return '';
}

function primitiveKey(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Merge an imported backup without removing or replacing data already present
 * on the phone. Existing values win; missing objects and array entries from the
 * backup are added. Matching id-based records are merged recursively.
 */
export function mergeBackupPreservingCurrent(current: unknown, incoming: unknown): unknown {
  if (current === undefined || current === null) return incoming;
  if (incoming === undefined || incoming === null) return current;

  if (Array.isArray(current) && Array.isArray(incoming)) {
    const result = current.map((item) => item);
    const keyedIndexes = new Map<string, number>();
    result.forEach((item, index) => {
      const key = itemKey(item);
      if (key) keyedIndexes.set(key, index);
    });
    const primitiveKeys = new Set(result.map(primitiveKey));

    incoming.forEach((item) => {
      const key = itemKey(item);
      const existingIndex = key ? keyedIndexes.get(key) : undefined;
      if (existingIndex !== undefined) {
        result[existingIndex] = mergeBackupPreservingCurrent(result[existingIndex], item);
        return;
      }
      const serialized = primitiveKey(item);
      if (!primitiveKeys.has(serialized)) {
        result.push(item);
        primitiveKeys.add(serialized);
        if (key) keyedIndexes.set(key, result.length - 1);
      }
    });
    return result;
  }

  if (isRecord(current) && isRecord(incoming)) {
    const result: Record<string, unknown> = { ...current };
    Object.entries(incoming).forEach(([key, value]) => {
      result[key] = key in current
        ? mergeBackupPreservingCurrent(current[key], value)
        : value;
    });
    return result;
  }

  return current;
}
