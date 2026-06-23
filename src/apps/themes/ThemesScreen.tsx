import { ChevronDown, Image as ImageIcon, RotateCcw, Smartphone } from 'lucide-react';
import React, { useRef, useState } from 'react';

import { cn } from '../../lib/utils';
import type { Screen } from '../../store';
import { useAppStore } from '../../store';
import { dockApps, pageApps } from '../../shell/appCatalog';
import { DEFAULT_SOFTWARE_AVATAR_LOGO, isDefaultSoftwareAvatarLogo, resolveAppIconImage } from '../../shell/appIconOverrides';
import { themeOptions } from '../../themes/themeOptions';
import { Header, Panel } from '../shared/AppPrimitives';

const fontOptions = [
  {
    id: 'rounded',
    name: '圆润手写',
    desc: '更软，像贴纸标题。',
    sample: '圆润 Aa 123',
  },
  {
    id: 'system',
    name: '系统清爽',
    desc: '接近手机原生界面。',
    sample: '系统 Aa 123',
  },
  {
    id: 'serif',
    name: '书卷宋楷',
    desc: '适合日记、国风长文。',
    sample: '书卷 Aa 123',
  },
  {
    id: 'pixel',
    name: '像素终端',
    desc: '硬边等宽，适合像素主题。',
    sample: 'PIXEL 123',
  },
] as const;

export function ThemesScreen() {
  const {
    theme,
    fontStyle,
    appIconOverrides,
    setTheme,
    setFontStyle,
    setAppIconOverride,
    clearAppIconOverride,
  } = useAppStore();
  const iconInputRef = useRef<HTMLInputElement>(null);
  const editingScreenRef = useRef<Screen | null>(null);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [softwareIconsExpanded, setSoftwareIconsExpanded] = useState(false);
  const catalogApps = [...pageApps, ...dockApps];

  const uploadAppIcon = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const screen = editingScreenRef.current || editingScreen;
    if (!file || !screen) return;
    const reader = new FileReader();
    reader.onload = () => setAppIconOverride(screen, String(reader.result || ''));
    reader.readAsDataURL(file);
    event.target.value = '';
    editingScreenRef.current = null;
    setEditingScreen(null);
  };

  const openIconPicker = (screen: Screen) => {
    editingScreenRef.current = screen;
    setEditingScreen(screen);
    iconInputRef.current?.click();
  };

  return (
    <section className="h-full overflow-y-auto pb-8">
      <Header title="主题" subtitle="保持干净手机尺寸，也支持多个主题" />
      <Panel className="themes-panel">
        <h2 className="mb-3 text-lg font-black">颜色主题</h2>
        <div className="grid gap-3">
          {themeOptions.map((item) => (
            <button key={item.id} onClick={() => setTheme(item.id)} className={cn('theme-card', theme === item.id && 'active')}>
              <p className="text-lg font-black">{item.name}</p>
              <p className="text-sm font-bold opacity-65">{item.desc}</p>
            </button>
          ))}
        </div>
      </Panel>
      <Panel className="themes-panel mt-4">
        <h2 className="mb-3 text-lg font-black">软件头像</h2>
        <div className="software-logo-card">
          <img src={DEFAULT_SOFTWARE_AVATAR_LOGO} alt="" className="software-logo-preview" />
          <div className="min-w-0">
            <p className="font-black">默认软件头像</p>
            <p className="text-xs font-bold opacity-60">小手机</p>
          </div>
        </div>
        <input ref={iconInputRef} type="file" accept="image/*" onChange={uploadAppIcon} className="hidden" />
        <button
          type="button"
          className="software-icons-disclosure mt-3"
          aria-expanded={softwareIconsExpanded}
          onClick={() => setSoftwareIconsExpanded((expanded) => !expanded)}
        >
          <span>{softwareIconsExpanded ? '收起软件头像列表' : `展开软件头像列表（${catalogApps.length} 个）`}</span>
          <ChevronDown className={cn('h-5 w-5 transition-transform', softwareIconsExpanded && 'rotate-180')} />
        </button>
        {softwareIconsExpanded && (
          <div className="mt-3 grid gap-2">
            {catalogApps.map((app) => {
              const customIcon = resolveAppIconImage(app.screen, appIconOverrides);
              const usesDefaultSoftwareAvatar = isDefaultSoftwareAvatarLogo(customIcon);
              return (
                <div key={app.screen} className="software-icon-row">
                  <span className={cn('software-icon-preview', app.color)}>
                    {customIcon
                      ? <img src={customIcon} alt="" className="custom-app-icon-image" />
                      : React.cloneElement(app.icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-black">{app.label}</span>
                  <button type="button" onClick={() => openIconPicker(app.screen)} className="icon-tool-button" aria-label={`更换${app.label}头像`}>
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppIconOverride(app.screen, DEFAULT_SOFTWARE_AVATAR_LOGO)}
                    className="icon-tool-button"
                    aria-label={`设为${app.label}小手机默认头像`}
                    title="设为小手机默认头像"
                    disabled={usesDefaultSoftwareAvatar}
                  >
                    <Smartphone className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => clearAppIconOverride(app.screen)} className="icon-tool-button" aria-label={`恢复${app.label}默认头像`} disabled={!customIcon}>
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      <Panel className="themes-panel mt-4">
        <h2 className="mb-3 text-lg font-black">界面字体</h2>
        <div className="grid grid-cols-2 gap-3">
          {fontOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFontStyle(item.id)}
              className={cn('theme-card font-choice-card', fontStyle === item.id && 'active')}
            >
              <p className="text-lg font-black">{item.name}</p>
              <p className="text-sm font-bold opacity-65">{item.desc}</p>
              <p className={cn('font-choice-sample', `font-choice-sample-${item.id}`)}>{item.sample}</p>
            </button>
          ))}
        </div>
      </Panel>
    </section>
  );
}
