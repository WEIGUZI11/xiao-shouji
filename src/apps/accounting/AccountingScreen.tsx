import { ArrowDownLeft, ArrowUpRight, Plus, Trash2, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { Empty, Header, Panel } from '../shared/AppPrimitives';
import {
  formatAccountingAmount,
  normalizeAccountingDirection,
  parseAccountingAmount,
  summarizeAccountingRecords,
  type AccountingDirection,
} from './accountingLogic';

const categories = ['餐饮', '购物', '交通', '娱乐', '住房', '礼物', '工资', '转账', '其他'];

export function AccountingScreen() {
  const { characters, purchaseRecords, addPurchaseRecord, deletePurchaseRecord } = useAppStore(useShallow((state) => ({
    characters: state.characters,
    purchaseRecords: state.purchaseRecords,
    addPurchaseRecord: state.addPurchaseRecord,
    deletePurchaseRecord: state.deletePurchaseRecord,
  })));
  const [filter, setFilter] = useState<'all' | AccountingDirection>('all');
  const [showComposer, setShowComposer] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({
    direction: 'expense' as AccountingDirection,
    itemName: '',
    amount: '',
    category: '餐饮',
    characterId: '',
    note: '',
  });
  const summary = useMemo(() => summarizeAccountingRecords(purchaseRecords), [purchaseRecords]);
  const visibleRecords = filter === 'all'
    ? purchaseRecords
    : purchaseRecords.filter((record) => normalizeAccountingDirection(record.direction) === filter);

  const saveRecord = () => {
    const amount = parseAccountingAmount(draft.amount);
    const itemName = draft.itemName.trim();
    if (!itemName) {
      setError('请填写用途或来源。');
      return;
    }
    if (amount <= 0) {
      setError('请输入大于 0 的金额。');
      return;
    }
    addPurchaseRecord({
      characterId: draft.characterId,
      itemName,
      amount: amount.toFixed(2),
      note: draft.note.trim(),
      direction: draft.direction,
      category: draft.category,
    });
    setDraft((current) => ({ ...current, itemName: '', amount: '', note: '' }));
    setError('');
    setShowComposer(false);
  };

  return (
    <section className="accounting-screen h-full overflow-y-auto pb-8">
      <Header title="记账" subtitle="收入、支出和旧订单共用同一本账" />

      <Panel className="accounting-summary-panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black opacity-55">当前结余</p>
            <p className={cn('mt-1 text-3xl font-black', summary.balance < 0 && 'text-[#b42318]')}>¥ {formatAccountingAmount(summary.balance)}</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f4edbd] text-[#111]"><WalletCards className="h-6 w-6" /></span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#dceecd] p-3">
            <p className="flex items-center gap-1 text-xs font-black opacity-60"><ArrowDownLeft className="h-4 w-4" />收入</p>
            <strong className="mt-1 block text-lg">¥ {formatAccountingAmount(summary.income)}</strong>
          </div>
          <div className="rounded-2xl bg-[#ffd9d9] p-3">
            <p className="flex items-center gap-1 text-xs font-black opacity-60"><ArrowUpRight className="h-4 w-4" />支出</p>
            <strong className="mt-1 block text-lg">¥ {formatAccountingAmount(summary.expense)}</strong>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">账目</h2>
            <p className="text-xs font-bold opacity-55">微信里的旧订单会自动显示在这里。</p>
          </div>
          <button type="button" onClick={() => setShowComposer((current) => !current)} className="fetch-button !w-auto min-w-[104px] whitespace-nowrap px-3">
            <Plus className="h-4 w-4" />{showComposer ? '收起' : '记一笔'}
          </button>
        </div>

        {showComposer && (
          <div className="accounting-composer mt-4 rounded-2xl border-[2px] border-[#111]/20 bg-white/55 p-3">
            <div className="grid grid-cols-2 gap-2">
              {(['expense', 'income'] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  aria-pressed={draft.direction === direction}
                  onClick={() => setDraft((current) => ({ ...current, direction }))}
                  className={cn('rounded-xl border-[2px] border-[#111] px-3 py-2 text-sm font-black', draft.direction === direction ? 'bg-[#111] text-white' : 'bg-white')}
                >
                  {direction === 'expense' ? '支出' : '收入'}
                </button>
              ))}
            </div>
            <input value={draft.itemName} onChange={(event) => setDraft((current) => ({ ...current, itemName: event.target.value }))} placeholder={draft.direction === 'expense' ? '花在什么地方' : '收入来源'} className="hand-input mt-3 w-full" />
            <input value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} inputMode="decimal" placeholder="金额" className="hand-input mt-2 w-full" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} className="hand-input w-full">
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <select value={draft.characterId} onChange={(event) => setDraft((current) => ({ ...current, characterId: event.target.value }))} className="hand-input w-full">
                <option value="">不关联角色</option>
                {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
              </select>
            </div>
            <input value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} placeholder="备注（可不填）" className="hand-input mt-2 w-full" />
            {error && <p className="mt-2 text-xs font-black text-[#b42318]">{error}</p>}
            <button type="button" onClick={saveRecord} className="fetch-button mt-3"><Plus className="h-4 w-4" />保存账目</button>
          </div>
        )}

        <div className="mt-4 flex gap-2" role="group" aria-label="账目筛选">
          {([['all', '全部'], ['expense', '支出'], ['income', '收入']] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={cn('rounded-full border-[2px] border-[#111] px-3 py-1.5 text-xs font-black', filter === value ? 'bg-[#111] text-white' : 'bg-white')}>{label}</button>
          ))}
        </div>

        {visibleRecords.length === 0 ? <Empty text="这里还没有账目。" /> : (
          <div className="mt-3 grid gap-2">
            {visibleRecords.map((record) => {
              const direction = normalizeAccountingDirection(record.direction);
              const character = characters.find((item) => item.id === record.characterId);
              return (
                <article key={record.id} className="accounting-record-card rounded-2xl border-[2px] border-[#111]/15 bg-white/70 p-3">
                  <div className="flex items-start gap-3">
                    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', direction === 'income' ? 'bg-[#dceecd]' : 'bg-[#ffd9d9]')}>
                      {direction === 'income' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate font-black">{record.itemName}</h3>
                          <p className="text-xs font-bold opacity-55">{record.category || '旧订单'}{character ? ` · ${character.name}` : ''}</p>
                        </div>
                        <strong className={direction === 'income' ? 'text-[#287a42]' : 'text-[#b42318]'}>{direction === 'income' ? '+' : '-'}¥{formatAccountingAmount(parseAccountingAmount(record.amount))}</strong>
                      </div>
                      {record.note && <p className="mt-2 text-sm font-bold opacity-70">{record.note}</p>}
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-bold opacity-55">
                        <time>{new Date(record.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                        <button type="button" onClick={() => deletePurchaseRecord(record.id)} className="flex items-center gap-1 text-[#b42318]" aria-label={`删除账目${record.itemName}`}><Trash2 className="h-3.5 w-3.5" />删除</button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </section>
  );
}
