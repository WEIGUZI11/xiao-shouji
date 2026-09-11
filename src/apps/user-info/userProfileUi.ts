export function getUserProfileDisplayName(profileName: string) {
  return profileName.trim() || '未命名玩家';
}

export function buildUserProfileDeleteTitle(_profileName: string) {
  return '删除玩家档案';
}

export function buildUserProfileDeleteMessage(profileName: string) {
  return `确定删除「${getUserProfileDisplayName(profileName)}」吗？删除后不能恢复。`;
}

export function normalizeUserAvatarReaderResult(result: FileReader['result']) {
  if (typeof result !== 'string') return '';
  return result.trim() ? result : '';
}

export type AvatarCrop = {
  scale: number;
  x: number;
  y: number;
};

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function normalizeAvatarCrop(crop: Partial<AvatarCrop>): AvatarCrop {
  return {
    scale: clampNumber(Number(crop.scale), 1, 3, 1),
    x: clampNumber(Number(crop.x), -50, 50, 0),
    y: clampNumber(Number(crop.y), -50, 50, 0),
  };
}

export function cropAvatarDataUrl(source: string, crop: AvatarCrop): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('头像裁剪失败：浏览器不支持 canvas。'));
        return;
      }
      const normalized = normalizeAvatarCrop(crop);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size, size);
      const coverScale = Math.max(size / image.naturalWidth, size / image.naturalHeight) * normalized.scale;
      const drawWidth = image.naturalWidth * coverScale;
      const drawHeight = image.naturalHeight * coverScale;
      const drawX = (size - drawWidth) / 2 + (normalized.x / 100) * size;
      const drawY = (size - drawHeight) / 2 + (normalized.y / 100) * size;
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    image.onerror = () => reject(new Error('头像读取失败，换一张本地图片再试'));
    image.src = source;
  });
}
