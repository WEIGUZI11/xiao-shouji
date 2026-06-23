import type { AppLogEntry } from '../store';

export function serializeRuntimeError(error: unknown) {
  if (error instanceof Error) {
    return [error.name && `${error.name}: ${error.message}`, error.stack].filter(Boolean).join('\n');
  }
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

export function buildRuntimeErrorLog({
  title,
  error,
  componentStack,
  url,
  source,
}: {
  title: string;
  error: unknown;
  componentStack?: string;
  url?: string;
  source?: string;
}): Omit<AppLogEntry, 'id' | 'createdAt'> {
  return {
    type: 'error',
    title,
    detail: [
      source && `source: ${source}`,
      url && `url: ${url}`,
      serializeRuntimeError(error),
      componentStack && `componentStack:\n${componentStack}`,
    ].filter(Boolean).join('\n\n'),
  };
}
