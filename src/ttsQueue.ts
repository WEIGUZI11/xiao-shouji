export type TtsQueueEntryStatus = 'waiting' | 'synthesizing' | 'playing';

export interface TtsQueueEntryView {
  id: string;
  dedupeKey: string;
  text: string;
  source: string;
  provider: string;
  status: TtsQueueEntryStatus;
  createdAt: number;
}

export interface TtsQueueSnapshot {
  current: TtsQueueEntryView | null;
  waiting: TtsQueueEntryView[];
}

export class TtsQueueDuplicateError extends Error {
  constructor() {
    super('相同语音已经在播放或等待队列中。');
    this.name = 'TtsQueueDuplicateError';
  }
}

export class TtsQueueStoppedError extends Error {
  constructor() {
    super('TTS 播放已停止。');
    this.name = 'TtsQueueStoppedError';
  }
}

type QueueEntry = TtsQueueEntryView & {
  run: (signal: AbortSignal, setStatus: (status: TtsQueueEntryStatus) => void) => Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
};

let queue: QueueEntry[] = [];
let current: QueueEntry | null = null;
let currentController: AbortController | null = null;
let processing = false;
let snapshot: TtsQueueSnapshot = { current: null, waiting: [] };
const listeners = new Set<() => void>();

function entryView(entry: QueueEntry): TtsQueueEntryView {
  const { run: _run, resolve: _resolve, reject: _reject, ...view } = entry;
  return view;
}

function emit() {
  snapshot = {
    current: current ? entryView(current) : null,
    waiting: queue.map(entryView),
  };
  listeners.forEach((listener) => listener());
}

export function getTtsQueueSnapshot() {
  return snapshot;
}

export function subscribeTtsQueue(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function processQueue() {
  if (processing) return;
  processing = true;
  try {
    while (queue.length > 0) {
      current = queue.shift() || null;
      if (!current) break;
      currentController = new AbortController();
      current.status = 'synthesizing';
      emit();
      try {
        await current.run(currentController.signal, (status) => {
          if (!current) return;
          current.status = status;
          emit();
        });
        current.resolve();
      } catch (error) {
        current.reject(error);
      } finally {
        current = null;
        currentController = null;
        emit();
      }
    }
  } finally {
    processing = false;
  }
}

export function enqueueTtsPlayback({
  id,
  dedupeKey,
  text,
  source,
  provider,
  run,
}: {
  id: string;
  dedupeKey: string;
  text: string;
  source: string;
  provider: string;
  run: QueueEntry['run'];
}) {
  if (current?.dedupeKey === dedupeKey || queue.some((entry) => entry.dedupeKey === dedupeKey)) {
    return Promise.reject(new TtsQueueDuplicateError());
  }
  const promise = new Promise<void>((resolve, reject) => {
    queue.push({
      id,
      dedupeKey,
      text,
      source,
      provider,
      status: 'waiting',
      createdAt: Date.now(),
      run,
      resolve,
      reject,
    });
  });
  emit();
  void processQueue();
  return promise;
}

export function stopAllTtsQueue() {
  const error = new TtsQueueStoppedError();
  const waiting = queue;
  queue = [];
  waiting.forEach((entry) => entry.reject(error));
  currentController?.abort(error);
  emit();
}

export function resetTtsQueueForTests() {
  stopAllTtsQueue();
  queue = [];
  current = null;
  currentController = null;
  processing = false;
  listeners.clear();
  snapshot = { current: null, waiting: [] };
}
