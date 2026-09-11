export type PaidTaskKind = 'image-generation' | 'tts-synthesis' | 'music-generation' | 'text-generation' | 'provider-test';

export type PaidTaskSnapshot = Partial<Record<PaidTaskKind, { key: string; startedAt: number }>>;

export class PaidTaskBusyError extends Error {
  kind: PaidTaskKind;
  activeKey: string;

  constructor(kind: PaidTaskKind, activeKey: string) {
    super('该功能已有任务正在进行，请等待完成后再试。');
    this.name = 'PaidTaskBusyError';
    this.kind = kind;
    this.activeKey = activeKey;
  }
}

type ActivePaidTask = {
  key: string;
  startedAt: number;
  controller: AbortController;
};

const activeTasks = new Map<PaidTaskKind, ActivePaidTask>();
const listeners = new Set<() => void>();
let currentSnapshot: PaidTaskSnapshot = {};

function emitChange() {
  currentSnapshot = Object.fromEntries(
    Array.from(activeTasks.entries()).map(([kind, task]) => [kind, { key: task.key, startedAt: task.startedAt }]),
  );
  listeners.forEach((listener) => listener());
}

export function getPaidTaskSnapshot(): PaidTaskSnapshot {
  return currentSnapshot;
}

export function subscribePaidTasks(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isPaidTaskActive(kind: PaidTaskKind) {
  return activeTasks.has(kind);
}

export function cancelPaidTask(kind: PaidTaskKind) {
  const active = activeTasks.get(kind);
  if (!active) return false;
  active.controller.abort();
  return true;
}

export async function runPaidTask<T>({
  kind,
  key,
  signal,
  run,
}: {
  kind: PaidTaskKind;
  key: string;
  signal?: AbortSignal;
  run: (signal: AbortSignal) => Promise<T>;
}) {
  const active = activeTasks.get(kind);
  if (active) throw new PaidTaskBusyError(kind, active.key);

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) controller.abort(signal.reason);
  else signal?.addEventListener('abort', abortFromCaller, { once: true });

  activeTasks.set(kind, { key, startedAt: Date.now(), controller });
  emitChange();
  try {
    return await run(controller.signal);
  } finally {
    signal?.removeEventListener('abort', abortFromCaller);
    if (activeTasks.get(kind)?.controller === controller) {
      activeTasks.delete(kind);
      emitChange();
    }
  }
}

export function resetPaidTaskManagerForTests() {
  activeTasks.forEach((task) => task.controller.abort());
  activeTasks.clear();
  currentSnapshot = {};
  listeners.clear();
}
