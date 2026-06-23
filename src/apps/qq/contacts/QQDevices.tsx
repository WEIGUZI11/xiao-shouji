import { Laptop, Mail, Folder } from 'lucide-react';

import { buildQqDeviceRows } from '../qqLogic';

const DEVICE_ICONS = [Laptop, Folder, Mail];

export function QQDevices() {
  const rows = buildQqDeviceRows();
  return (
    <div className="qq-contact-info-list">
      <div className="qq-section-heading">
        <span>设备</span>
        <small>{rows.length} 个入口</small>
      </div>
      {rows.map((row, index) => {
        const Icon = DEVICE_ICONS[index] || Laptop;
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
