export type OpenMojiEmotionText = {
  title: string;
  body: string;
};

export function parseOpenMojiEmotionText(content: string): OpenMojiEmotionText | null {
  const text = content.trim();
  const match = text.match(/^(?:\[emotion\]|\[表情\])\s*OpenMoji\s*(?:pack|情绪包)?[:：]\s*(.+)$/i);
  if (!match) return null;
  return {
    title: 'OpenMoji emotion',
    body: match[1].trim(),
  };
}
