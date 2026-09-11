const defaultTrustedImageHosts = ['api.openai.com', 'image.novelai.net'];

export function isTrustedImageProxyUrl(value: string, extraHosts: string[] = []) {
  try {
    const target = new URL(value);
    const hostname = target.hostname.toLowerCase();
    const trustedHosts = [...defaultTrustedImageHosts, ...extraHosts]
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    return target.protocol === 'https:'
      && !target.username
      && !target.password
      && trustedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export function shouldUseSameOriginImageProxy(value: string) {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const extraHosts = String(env?.VITE_IMAGE_PROXY_ALLOWED_HOSTS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return isTrustedImageProxyUrl(value, extraHosts);
}
