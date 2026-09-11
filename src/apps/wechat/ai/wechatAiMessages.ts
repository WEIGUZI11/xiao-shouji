export type WeChatAiParsedPart =
  | { kind: 'text'; content: string }
  | { kind: 'sticker'; mood?: string; label?: string }
  | { kind: 'transfer'; amount: string; note?: string }
  | { kind: 'red-packet'; amount?: string; note?: string }
  | { kind: 'shopping'; itemName: string; amount?: string; note?: string }
  | { kind: 'image'; prompt: string; label?: string };

const actionLinePattern = /^\[(sticker|transfer|red-packet|shopping|image)(?:\s+([^\]]+))?\]$/;
const pairPattern = /(\w[\w-]*)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
const thinkingLinePattern = /^(思考|思路|推理|分析|reasoning|thinking)\s*[:：]/i;
const structuralLinePattern = /^[\[\]{}(),;]+$/;

function stripMarkdownFence(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:json|javascript|js|text)?\s*\n?([\s\S]*?)\n?```$/i);
  return (match?.[1] ?? trimmed).trim();
}

function collectReplyStrings(value: unknown): string[] {
  if (typeof value === 'string') return value.trim() ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(collectReplyStrings);
  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  for (const key of ['messages', 'replies', 'content', 'text', 'reply', 'message']) {
    if (!(key in record)) continue;
    const result = collectReplyStrings(record[key]);
    if (result.length > 0) return result;
  }
  return [];
}

function unwrapStructuredReply(reply: string) {
  const clean = stripMarkdownFence(reply);
  if (!/^[\[{]/.test(clean)) return [clean];
  try {
    const extracted = collectReplyStrings(JSON.parse(clean));
    return extracted.length > 0 ? extracted : [clean];
  } catch {
    return [clean];
  }
}

function stripThinkingContent(value: string) {
  return value
    .replace(/<think>[\s\S]*?<\/think>/gi, '\n')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '\n')
    .replace(/<(?:think|thinking)>[\s\S]*$/gi, '\n');
}

function normalizeLooseJsonLine(line: string) {
  if (structuralLinePattern.test(line)) return '';
  const candidate = line.replace(/,$/, '').trim();
  if (!/^"[\s\S]*"$/.test(candidate)) return line;
  try {
    const parsed = JSON.parse(candidate);
    return typeof parsed === 'string' ? parsed.trim() : line;
  } catch {
    return line;
  }
}

function parsePairs(input = '') {
  const pairs: Record<string, string> = {};
  for (const match of input.matchAll(pairPattern)) {
    pairs[match[1]] = (match[2] ?? match[3] ?? match[4] ?? '').trim();
  }
  return pairs;
}

function parseActionLine(line: string): WeChatAiParsedPart | null {
  const match = line.match(actionLinePattern);
  if (!match) return null;
  const [, action, rawPairs] = match;
  const pairs = parsePairs(rawPairs);

  if (action === 'sticker') {
    return {
      kind: 'sticker',
      mood: pairs.mood || pairs.label || undefined,
      label: pairs.label || pairs.mood || undefined,
    };
  }

  if (action === 'transfer') {
    if (!pairs.amount) return null;
    return {
      kind: 'transfer',
      amount: pairs.amount,
      note: pairs.note || undefined,
    };
  }

  if (action === 'red-packet') {
    return {
      kind: 'red-packet',
      amount: pairs.amount || undefined,
      note: pairs.note || undefined,
    };
  }

  if (action === 'shopping') {
    const itemName = pairs.item || pairs.itemName || pairs.name;
    if (!itemName) return null;
    return {
      kind: 'shopping',
      itemName,
      amount: pairs.amount || undefined,
      note: pairs.note || undefined,
    };
  }

  if (action === 'image') {
    const prompt = pairs.prompt || pairs.desc || pairs.description;
    if (!prompt) return null;
    return {
      kind: 'image',
      prompt,
      label: pairs.label || undefined,
    };
  }

  return null;
}

export function parseWeChatAiReply(reply: string): WeChatAiParsedPart[] {
  const lines = unwrapStructuredReply(reply)
    .flatMap((value) => stripThinkingContent(value).replace(/\r/g, '\n').split('\n'))
    .map((line) => normalizeLooseJsonLine(line.trim()))
    .filter((line) => line && !thinkingLinePattern.test(line));

  if (lines.length === 0) return [{ kind: 'text', content: '嗯，我看到了。' }];

  return lines.map((line) => {
    const action = parseActionLine(line);
    return action || { kind: 'text', content: line };
  });
}

export function describeWeChatAiPart(part: WeChatAiParsedPart) {
  if (part.kind === 'sticker') return `表情包：${part.label || part.mood || '表情'}`;
  if (part.kind === 'transfer') return `转账：${part.amount}${part.note ? `，${part.note}` : ''}`;
  if (part.kind === 'red-packet') return `红包：${part.amount || '未填金额'}${part.note ? `，${part.note}` : ''}`;
  if (part.kind === 'shopping') return `购物：${part.itemName}${part.amount ? `，${part.amount}` : ''}${part.note ? `，${part.note}` : ''}`;
  if (part.kind === 'image') return `图片：${part.label || part.prompt}`;
  return part.content;
}
