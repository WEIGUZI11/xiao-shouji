/**
 * Tavern/character card parser.
 * Main functions: parseCharacterCard, readAvatar, readPngCharacterJson, decodePngTextChunk,
 * stripBom, repairMojibake, normalizeCardText, extractCharaData.
 * Inputs: .json chara cards and .png cards containing chara tEXt/iTXt chunks.
 * Outputs: Character-like object consumed by useAppStore.addCharacter.
 * Dependencies: createId from src/lib/utils.ts; browser FileReader/Image/canvas/TextDecoder APIs.
 */
import { createId } from './utils';

export async function parseCharacterCard(file: File) {
  const avatarUrl = await readAvatar(file);

  if (file.name.toLowerCase().endsWith('.json')) {
    const json = await readJsonCharacterCard(file);
    return extractCharaData(json, avatarUrl);
  }

  if (file.name.toLowerCase().endsWith('.png')) {
    const json = await readPngCharacterJson(file);
    return extractCharaData(json, avatarUrl);
  }

  throw new Error('不支持的文件类型，请导入 PNG 或 JSON 角色卡');
}

async function readJsonCharacterCard(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const candidates = decodeTextCandidates(arrayBuffer);
  const parsed = candidates
    .map((text) => {
      try {
        return { text, json: JSON.parse(stripBom(text)), score: mojibakeScore(text) };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Array<{ text: string; json: unknown; score: number }>;

  if (parsed.length === 0) {
    throw new Error('角色卡 JSON 解析失败，请确认文件编码和格式');
  }
  parsed.sort((a, b) => a.score - b.score);
  return parsed[0].json;
}

function decodeTextCandidates(arrayBuffer: ArrayBuffer) {
  const labels = ['utf-8', 'gb18030', 'gbk', 'big5'];
  const seen = new Set<string>();
  return labels.flatMap((label) => {
    try {
      const text = stripBom(new TextDecoder(label, { fatal: label === 'utf-8' }).decode(arrayBuffer));
      if (seen.has(text)) return [];
      seen.add(text);
      return [text];
    } catch {
      return [];
    }
  });
}

function mojibakeScore(text: string) {
  const replacementMarks = (text.match(/\uFFFD/g) || []).length * 20;
  const latinMojibake = (text.match(/[ÃÂâäåæçèé]/g) || []).length * 3;
  const cjkMojibakePhrases = (text.match(/[涓绋妯犲彧璇棩竴杞]/g) || []).length;
  return replacementMarks + latinMojibake + cjkMojibakePhrases;
}

async function readAvatar(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 400;
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        } else if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve('');
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

async function readPngCharacterJson(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const dataView = new DataView(arrayBuffer);

  if (dataView.getUint32(0) !== 0x89504e47) {
    throw new Error('不是有效的 PNG 文件');
  }

  let offset = 8;
  while (offset < dataView.byteLength) {
    const length = dataView.getUint32(offset);
    const type = String.fromCharCode(
      dataView.getUint8(offset + 4),
      dataView.getUint8(offset + 5),
      dataView.getUint8(offset + 6),
      dataView.getUint8(offset + 7),
    );
    const chunk = new Uint8Array(arrayBuffer, offset + 8, length);

    if (type === 'tEXt' || type === 'iTXt') {
      const chara = decodePngTextChunk(type, chunk);
      if (chara) return JSON.parse(chara);
    }

    offset += 8 + length + 4;
  }

  throw new Error('没有在 PNG 中找到角色卡数据');
}

function decodePngTextChunk(type: string, chunk: Uint8Array) {
  const zero = chunk.indexOf(0);
  if (zero < 0) return null;
  const keyword = new TextDecoder('latin1').decode(chunk.slice(0, zero));
  if (keyword !== 'chara') return null;

  let payload: Uint8Array;
  if (type === 'iTXt') {
    // keyword\0 compressionFlag\0 compressionMethod\0 languageTag\0 translatedKeyword\0 text
    let cursor = zero + 3;
    const langEnd = chunk.indexOf(0, cursor);
    if (langEnd < 0) return null;
    const translatedEnd = chunk.indexOf(0, langEnd + 1);
    if (translatedEnd < 0) return null;
    payload = chunk.slice(translatedEnd + 1);
  } else {
    payload = chunk.slice(zero + 1);
  }

  const base64 = new TextDecoder('latin1').decode(payload).replace(/\s/g, '');
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return stripBom(new TextDecoder('utf-8').decode(bytes));
}

function stripBom(text: string) {
  return text.replace(/^\uFEFF/, '');
}

function extractCharaData(json: any, avatarUrl: string) {
  const data = json?.spec === 'chara_card_v2' || json?.spec === 'chara_card_v3' ? json.data : json;
  const description = normalizeCardText(data.description || data.desc || '');
  const personality = normalizeCardText(data.personality || '');
  const scenario = normalizeCardText(data.scenario || '');
  const messageExamples = normalizeCardText(data.mes_example || data.message_examples || data.messageExamples || '');
  const firstMessage = normalizeCardText(data.first_mes || data.firstMessage || '');
  const worldBook = normalizeCardText(data.character_book || data.worldBook || data.world_book || undefined);
  const systemPrompt = normalizeCardText(data.system_prompt || data.systemPrompt || data.post_history_instructions || '');

  return {
    id: createId('char'),
    name: normalizeCardText(data.name || '未知角色'),
    avatar: avatarUrl,
    description,
    personality,
    scenario,
    messageExamples,
    firstMessage,
    systemPrompt,
    worldBook,
  };
}

function normalizeCardText<T>(value: T): T {
  if (typeof value === 'string') return repairMojibake(value) as T;
  if (Array.isArray(value)) return value.map((item) => normalizeCardText(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalizeCardText(item)]),
    ) as T;
  }
  return value;
}

function repairMojibake(text: string) {
  if (!/[ÃÂâäåæçèé]/.test(text)) return text;
  try {
    const bytes = Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const originalCjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const decodedCjk = (decoded.match(/[\u4e00-\u9fff]/g) || []).length;
    return decodedCjk > originalCjk ? decoded : text;
  } catch {
    return text;
  }
}
