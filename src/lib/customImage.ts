const supportedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export const defaultCustomImageMaxBytes = 12 * 1024 * 1024;

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('图片读取失败。'));
    reader.readAsDataURL(file);
  });
}

function verifyBrowserCanDecode(dataUrl: string) {
  if (typeof Image === 'undefined') return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('这张图片无法显示，请改用 PNG、JPG、WebP 或 GIF。'));
    image.src = dataUrl;
  });
}

export async function readCustomImageFile(file: File, maxBytes = defaultCustomImageMaxBytes) {
  if (!supportedImageTypes.has(file.type.toLowerCase())) {
    throw new Error('请选择 PNG、JPG、WebP 或 GIF 图片。');
  }
  if (file.size > maxBytes) {
    throw new Error(`图片不能超过 ${Math.floor(maxBytes / 1024 / 1024)} MiB。`);
  }
  const dataUrl = await readAsDataUrl(file);
  await verifyBrowserCanDecode(dataUrl);
  return dataUrl;
}

export const customImageAccept = 'image/png,image/jpeg,image/webp,image/gif';
