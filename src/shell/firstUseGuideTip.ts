export const FIRST_USE_GUIDE_TIP_STORAGE_KEY = 'xiaophone.firstUseGuideTip.v1';

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export function shouldShowFirstUseGuideTip(storage: ReadableStorage | undefined = globalThis.localStorage) {
  try {
    return storage?.getItem(FIRST_USE_GUIDE_TIP_STORAGE_KEY) !== 'seen';
  } catch {
    return false;
  }
}

export function markFirstUseGuideTipSeen(storage: WritableStorage | undefined = globalThis.localStorage) {
  try {
    storage?.setItem(FIRST_USE_GUIDE_TIP_STORAGE_KEY, 'seen');
  } catch {
    // Storage failures should never block the desktop.
  }
}
