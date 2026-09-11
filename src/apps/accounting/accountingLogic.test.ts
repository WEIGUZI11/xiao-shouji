import assert from 'node:assert/strict';

import { formatAccountingAmount, normalizeAccountingDirection, parseAccountingAmount, summarizeAccountingRecords } from './accountingLogic';

assert.equal(normalizeAccountingDirection('income'), 'income');
assert.equal(normalizeAccountingDirection('expense'), 'expense');
assert.equal(normalizeAccountingDirection(undefined), 'expense');
assert.equal(parseAccountingAmount('￥1,288.50'), 1288.5);
assert.equal(parseAccountingAmount('-12'), 0);
assert.equal(parseAccountingAmount('不是金额'), 0);

const summary = summarizeAccountingRecords([
  { id: '1', characterId: '', itemName: '工资', amount: '5000', note: '', direction: 'income', createdAt: 1 },
  { id: '2', characterId: '', itemName: '奶茶', amount: '18.5', note: '', direction: 'expense', createdAt: 2 },
  { id: '3', characterId: '', itemName: '旧订单', amount: '20', note: '', createdAt: 3 },
]);
assert.deepEqual(summary, { income: 5000, expense: 38.5, balance: 4961.5 });
assert.equal(formatAccountingAmount(18), '18.00');

console.log('accounting logic ok');

