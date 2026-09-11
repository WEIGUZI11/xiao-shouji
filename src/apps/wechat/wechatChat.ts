export type WeChatReplyStyle = 'auto' | 'single' | 'burst';
export type ChatBubbleChannel = 'wechat' | 'qq';

const narrationPrefix = /^(?:\u65c1\u767d|\u7cfb\u7edf|\u8bf4\u660e|\u52a8\u4f5c|\u53d9\u8ff0|\u5185\u5fc3|\u6ce8\u91ca)\s*[\uff1a:]/;
const listPrefix = /^(?:[-*]|\u2022|\d+[\).\u3001\uff0e]|[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341]+[\).\u3001\uff0e])\s*/;
const edgeQuotes = /^[\"'\u201c\u201d\u2018\u2019`]+|[\"'\u201c\u201d\u2018\u2019`]+$/g;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function trimBubbleLine(line: string, speakerName?: string) {
  let next = line.replace(listPrefix, '').replace(edgeQuotes, '').trim();
  if (!next || narrationPrefix.test(next)) return '';

  if (speakerName) {
    next = next.replace(new RegExp(`^${escapeRegExp(speakerName)}\\s*[\\uff1a:]\\s*`), '').trim();
  }

  return next
    .replace(/^(AI|\u52a9\u624b|assistant|\u5fae\u4fe1|\u5bf9\u65b9|\u6211)\s*[\uff1a:]\s*/i, '')
    .trim();
}

function splitBubbleByLength(text: string, maxLength: number) {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= maxLength) return [clean];
  // 只在完整句号处拆气泡。旧实现会在 maxLength 位置硬切，造成“后半句像被截断”的视觉错误。
  const sentences = clean.match(/[^。！？!?]+[。！？!?]+|[^。！？!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
  if (sentences.length <= 1) return [clean];
  const chunks: string[] = [];
  let current = '';
  sentences.forEach((sentence) => {
    if (current && current.length + sentence.length > maxLength) {
      chunks.push(current);
      current = sentence;
      return;
    }
    current += sentence;
  });
  if (current) chunks.push(current);
  return chunks;
}

function getBubbleMaxLength(style: WeChatReplyStyle, channel: ChatBubbleChannel) {
  if (channel === 'qq') return style === 'burst' ? 96 : 120;
  return style === 'burst' ? 56 : 72;
}

export function splitAssistantBubbles(reply: string, style: WeChatReplyStyle, speakerName?: string, channel: ChatBubbleChannel = 'wechat') {
  const maxLength = getBubbleMaxLength(style, channel);
  const cleanedLines = reply
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => trimBubbleLine(line, speakerName))
    .filter(Boolean);

  if (style === 'single') return [cleanedLines.join('\n') || reply.trim() || '...'];
  const cleaned = cleanedLines.flatMap((line) => splitBubbleByLength(line, maxLength));
  if (cleaned.length > 1) return cleaned;
  if (cleaned.length === 1) return cleaned;

  const text = trimBubbleLine(reply.trim(), speakerName);
  if (!text) return ['...'];
  if (style === 'burst' && /[\u3002\uff01\uff1f!?]/.test(text) && text.length > 28) {
    return text
      .split(/(?<=[\u3002\uff01\uff1f!?])/)
      .map((line) => trimBubbleLine(line, speakerName))
      .filter(Boolean)
      .flatMap((line) => splitBubbleByLength(line, maxLength));
  }
  return splitBubbleByLength(text, maxLength);
}
