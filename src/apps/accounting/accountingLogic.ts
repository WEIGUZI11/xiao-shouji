import type { PurchaseRecord } from '../../store';

export type AccountingDirection = 'income' | 'expense';

export function normalizeAccountingDirection(value: unknown): AccountingDirection {
  return value === 'income' ? 'income' : 'expense';
}

export function parseAccountingAmount(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, value) : 0;
  if (typeof value !== 'string') return 0;
  const normalized = value.replace(/[,，￥¥\s]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function summarizeAccountingRecords(records: PurchaseRecord[]) {
  return records.reduce((summary, record) => {
    const amount = parseAccountingAmount(record.amount);
    if (normalizeAccountingDirection(record.direction) === 'income') summary.income += amount;
    else summary.expense += amount;
    summary.balance = summary.income - summary.expense;
    return summary;
  }, { income: 0, expense: 0, balance: 0 });
}

export function formatAccountingAmount(value: number) {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

