import type { AppLogEntry } from '../../store';

export type ConsoleLogLevel = 'all' | 'error' | 'ai' | 'generation' | 'system';
export type ConsoleLogTone = 'danger' | 'success' | 'ai' | 'tts' | 'music' | 'image' | 'info';

export type ConsoleLogFilter = {
  level: ConsoleLogLevel;
  query: string;
};

export type LogDiagnostic = {
  label: string;
  value: string;
};

export function getConsoleLogMeta(log: Pick<AppLogEntry, 'type' | 'title' | 'detail'>) {
  const haystack = `${log.title}\n${log.detail || ''}`.toLowerCase();
  const level = log.type === 'error' ? 'ERROR' : log.type.toUpperCase();
  let source = '系统';

  if (/wechat|微信/.test(haystack)) source = '微信';
  else if (/\bqq\b|qq音乐|qq 音乐/.test(haystack)) source = 'QQ';
  else if (/nai|novelai|生图|image/.test(haystack)) source = 'NAI';
  else if (/tts|语音|唱歌/.test(haystack)) source = 'TTS';
  else if (/music|音乐|netease|minimax/.test(haystack)) source = '音乐';
  else if (/\bai\b|模型|chat\/completions|上下文/.test(haystack)) source = 'AI';

  const tone: ConsoleLogTone =
    log.type === 'error' ? 'danger'
      : log.type === 'success' ? 'success'
        : log.type === 'ai' ? 'ai'
          : log.type === 'tts' ? 'tts'
            : log.type === 'music' ? 'music'
              : log.type === 'image' ? 'image'
                : 'info';

  return { level, source, tone };
}

export function getLogDetailExcerpt(detail = '', maxLength = 120) {
  const clean = detail.replace(/\s+/g, ' ').trim();
  if (!clean) return '无详情';
  return clean.length > maxLength ? `${clean.slice(0, maxLength).trimEnd()}...` : clean;
}

export function getLogDiagnostics(log: Pick<AppLogEntry, 'detail'>): LogDiagnostic[] {
  const detail = log.detail || '';
  const diagnostics: LogDiagnostic[] = [];
  const httpMatch = detail.match(/HTTP\s+(\d{3})(?:\s+([^\n\r-]+))?/i);
  if (httpMatch) {
    diagnostics.push({
      label: 'HTTP',
      value: `${httpMatch[1]} ${httpMatch[2]?.trim() || ''}`.trim(),
    });
  }

  const endpointMatch = detail.match(/https?:\/\/[^\s"'`]+|\/api\/[^\s"'`]+|\/v1\/[^\s"'`]+/i);
  if (endpointMatch) {
    diagnostics.push({ label: 'Endpoint', value: endpointMatch[0] });
  }

  const modelMatch = detail.match(/"model"\s*:\s*"([^"]+)"/i) || detail.match(/\bmodel\s*[=:]\s*([^\s;,\n\r]+)/i);
  if (modelMatch) {
    diagnostics.push({ label: 'Model', value: modelMatch[1] });
  }

  if (detail.trim()) {
    diagnostics.push({ label: 'Size', value: `${detail.length} chars` });
  }

  return diagnostics;
}

export function formatConsoleTime(createdAt: number) {
  return new Date(createdAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function matchesLevel(log: AppLogEntry, level: ConsoleLogLevel) {
  if (level === 'all') return true;
  if (level === 'error') return log.type === 'error';
  if (level === 'ai') return log.type === 'ai' || /AI|模型|上下文/i.test(log.title);
  if (level === 'generation') return log.type === 'image' || log.type === 'music' || /生图|生成|NAI|唱歌/.test(log.title);
  return log.type === 'info' || log.type === 'success' || log.type === 'tts';
}

export function filterConsoleLogs(logs: AppLogEntry[], filter: ConsoleLogFilter) {
  const query = filter.query.trim().toLowerCase();
  return logs.filter((log) => {
    if (!matchesLevel(log, filter.level)) return false;
    if (!query) return true;
    return `${log.type}\n${log.title}\n${log.detail || ''}`.toLowerCase().includes(query);
  });
}

export function buildLogCopyText(log: AppLogEntry) {
  const meta = getConsoleLogMeta(log);
  return [
    `[${meta.level}][${meta.source}] ${formatConsoleTime(log.createdAt)} ${log.title}`,
    log.detail || '无详情',
  ].join('\n');
}
