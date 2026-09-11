export type ContextBudgetInfo = {
  label: string;
  min: number;
  max: number;
};

export type ContextBudgetStatus = 'ok' | 'over-budget' | 'over-hard-limit';

export type ContextBudgetStats = {
  chars: number;
  estimatedTokens: number;
  percentOfBudget: number;
  remainingChars: number;
  overBudgetChars: number;
  overHardLimitChars: number;
  status: ContextBudgetStatus;
  summary: string;
};

export type PreviewRowIdentity = {
  sectionId?: string;
  app: string;
  content: string;
  range: string;
};

export function estimateContextTokens(text: string) {
  let tokens = 0;
  let asciiRun = '';

  const flushAscii = () => {
    if (!asciiRun) return;
    tokens += Math.max(1, Math.ceil(asciiRun.length / 4));
    asciiRun = '';
  };

  for (const char of text) {
    if (/\s/.test(char)) {
      flushAscii();
      continue;
    }
    if (/[\x00-\x7F]/.test(char) && /[A-Za-z0-9_./:-]/.test(char)) {
      asciiRun += char;
      continue;
    }
    flushAscii();
    tokens += 1;
  }
  flushAscii();

  return tokens;
}

export function buildContextBudgetStats(text: string, budget: ContextBudgetInfo, hardLimit = 60000): ContextBudgetStats {
  const chars = text.length;
  const estimatedTokens = estimateContextTokens(text);
  const percentOfBudget = budget.max > 0 ? Math.ceil((chars / budget.max) * 100) : 0;
  const overHardLimitChars = Math.max(0, chars - hardLimit);
  const overBudgetChars = Math.max(0, chars - budget.max);
  const remainingChars = Math.max(0, budget.max - chars);
  const status: ContextBudgetStatus = overHardLimitChars > 0 ? 'over-hard-limit' : overBudgetChars > 0 ? 'over-budget' : 'ok';

  return {
    chars,
    estimatedTokens,
    percentOfBudget,
    remainingChars,
    overBudgetChars,
    overHardLimitChars,
    status,
    summary: `${chars} 字 · 约 ${estimatedTokens} tokens · ${percentOfBudget}% / ${budget.label}`,
  };
}

export function buildPreviewRowKey(row: PreviewRowIdentity) {
  return row.sectionId || `${row.app}::${row.content}::${row.range}`;
}

export function getPreviewRowExcerpt(detail: string, maxLength = 80) {
  const clean = detail.replace(/\s+/g, ' ').trim();
  if (!clean) return '暂无详情';
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
}
