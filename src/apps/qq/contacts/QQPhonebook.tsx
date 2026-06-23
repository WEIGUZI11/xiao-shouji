import { ContactRound, RefreshCw, Smartphone } from 'lucide-react';

import { buildQqPhonebookRows } from '../qqLogic';

const PHONEBOOK_ICONS = [Smartphone, RefreshCw, ContactRound];

export function QQPhonebook({
  userName,
  characterCount,
}: {
  userName: string;
  characterCount: number;
}) {
  const rows = buildQqPhonebookRows({ userName, characterCount });
  return (
    <div className="qq-contact-info-list">
      <div className="qq-section-heading">
        <span>通讯录</span>
        <small>{characterCount} 位 QQ 好友</small>
      </div>
      {rows.map((row, index) => {
        const Icon = PHONEBOOK_ICONS[index] || ContactRound;
        return (
          <button key={row.title} type="button" className="qq-contact-info-card">
            <span><Icon className="h-5 w-5" /></span>
            <b>{row.title}</b>
            <p>{row.desc}</p>
          </button>
        );
      })}
    </div>
  );
}
