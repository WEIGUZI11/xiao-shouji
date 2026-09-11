export const DEFAULT_TTS_PROXY_HOSTS = [
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'api.minimax.io',
  'api.minimaxi.com',
  'openspeech.bytedance.com',
  'voice.ap-southeast-1.bytepluses.com',
] as const;

export function isTrustedTtsProxyUrl(value: string, extraHosts: string[] = []) {
  try {
    const target = new URL(value);
    if (target.protocol !== 'https:' || target.username || target.password) return false;
    const allowedHosts = [...DEFAULT_TTS_PROXY_HOSTS, ...extraHosts]
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    const hostname = target.hostname.toLowerCase();
    return allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}
