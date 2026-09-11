export const DEFAULT_SOFTWARE_AVATAR_LOGO = '/default-software-avatar-logo.png';

export type AppIconOverrides = Record<string, string>;

function cleanIconUrl(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function isDefaultSoftwareAvatarLogo(value: unknown) {
  return cleanIconUrl(value) === DEFAULT_SOFTWARE_AVATAR_LOGO;
}

export function normalizeAppIconOverrides(value: unknown): AppIconOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([screen, iconUrl]) => [screen, cleanIconUrl(iconUrl)] as const)
      .filter(([screen, iconUrl]) => screen !== '__proto__' && Boolean(iconUrl)),
  );
}

export function updateAppIconOverride(overrides: AppIconOverrides, screen: string, iconUrl: string | null) {
  const next = { ...normalizeAppIconOverrides(overrides) };
  const cleanUrl = cleanIconUrl(iconUrl);
  if (cleanUrl) {
    next[screen] = cleanUrl;
  } else {
    delete next[screen];
  }
  return next;
}

export function resolveAppIconImage(screen: string, overrides: AppIconOverrides) {
  return cleanIconUrl(overrides[screen]) || null;
}

export function hasPersistedAppIconOverride(rawStorage: string | null, screen: string, iconUrl: string) {
  if (!rawStorage) return false;
  try {
    const parsed = JSON.parse(rawStorage) as { state?: { appIconOverrides?: unknown } };
    return resolveAppIconImage(screen, normalizeAppIconOverrides(parsed.state?.appIconOverrides)) === cleanIconUrl(iconUrl);
  } catch {
    return false;
  }
}
