/**
 * Theme customization screen.
 * Owns whole-phone theme previews (including branded theme-card marks), chat-bubble skins, app icon overrides, fonts, and bottom placement controls.
 * Visual rules for theme and bubble previews live in src/themes/bubbles/index.css.
 */
import { ChevronDown, Image as ImageIcon, RotateCcw } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { BACKUP_STORAGE_KEY } from '../../backup/backupPayload';
import { PersistentImage } from '../../components/PersistentImage';
import { customImageAccept, readCustomImageFile } from '../../lib/customImage';
import { deleteImageAssets, saveImageAsset } from '../../lib/imageAssetStore';
import { cn } from '../../lib/utils';
import type { Screen } from '../../store';
import { useAppStore } from '../../store';
import { dockApps, pageApps } from '../../shell/appCatalog';
import { hasPersistedAppIconOverride, resolveAppIconImage } from '../../shell/appIconOverrides';
import { bubbleStyleOptions, themeOptions } from '../../themes/themeOptions';
import { Header, Panel } from '../shared/AppPrimitives';

const fontOptions = [
  {
    id: 'rounded',
    name: '霞鹜漫黑',
    desc: '清楚又带一点手写感。',
    sample: '霞鹜漫黑 Aa 123',
  },
  {
    id: 'system',
    name: '系统清爽',
    desc: '接近手机原生界面。',
    sample: '系统 Aa 123',
  },
  {
    id: 'serif',
    name: '朱雀仿宋',
    desc: '适合日记与国风长文。',
    sample: '朱雀仿宋 Aa 123',
  },
  {
    id: 'pixel',
    name: '点阵像素',
    desc: '硬边日系点阵字。',
    sample: '点阵像素 PIXEL 123',
  },
  {
    id: 'zen-maru',
    name: '日系圆体',
    desc: '柔和圆润，适合日常聊天。',
    sample: '日系圆体 Aa 123',
  },
  {
    id: 'zcool-happy',
    name: '站酷快乐体',
    desc: '活泼醒目，适合轻松主题。',
    sample: '快乐聊天 Aa 123',
  },
  {
    id: 'zcool-xiaowei',
    name: '站酷小薇体',
    desc: '细长文艺，适合标题与手账。',
    sample: '小薇手账 Aa 123',
  },
  {
    id: 'zcool-qingke',
    name: '站酷庆科黄油体',
    desc: '复古方正，辨识度很高。',
    sample: '庆科黄油 Aa 123',
  },
  {
    id: 'ma-shan-zheng',
    name: '马善政毛笔',
    desc: '醒目的中文毛笔风格。',
    sample: '山海来信 Aa 123',
  },
  {
    id: 'long-cang',
    name: '龙藏书法',
    desc: '更自由的行书笔触。',
    sample: '龙藏手书 Aa 123',
  },
  {
    id: 'zen-old-mincho',
    name: '古典明朝体',
    desc: '沉稳复古，适合阅读。',
    sample: '古典明朝 Aa 123',
  },
] as const;

export function ThemesScreen() {
  const {
    theme,
    bubbleStyle,
    fontStyle,
    chatBottomLayout,
    appIconOverrides,
    setTheme,
    setBubbleStyle,
    setFontStyle,
    setChatBottomLayout,
    setAppIconOverride,
    clearAppIconOverride,
  } = useAppStore();
  const [themesExpanded, setThemesExpanded] = useState(false);
  const [softwareIconsExpanded, setSoftwareIconsExpanded] = useState(false);
  const [bubbleStylesExpanded, setBubbleStylesExpanded] = useState(false);
  const [fontsExpanded, setFontsExpanded] = useState(false);
  const [bottomLayoutExpanded, setBottomLayoutExpanded] = useState(false);
  const [imageStatus, setImageStatus] = useState('');
  const [savingIcon, setSavingIcon] = useState<Screen | null>(null);
  const [iconStatus, setIconStatus] = useState<Record<string, string>>({});
  const legacyMigrationStarted = useRef(false);
  const catalogApps = [...pageApps, ...dockApps];
  const activeTheme = themeOptions.find((item) => item.id === theme) || themeOptions[0];
  const activeFont = fontOptions.find((item) => item.id === fontStyle) || fontOptions[0];

  useEffect(() => {
    if (legacyMigrationStarted.current) return;
    const legacyEntries = Object.entries(useAppStore.getState().appIconOverrides)
      .filter((entry): entry is [string, string] => entry[1].startsWith('data:image/'));
    if (legacyEntries.length === 0) return;
    legacyMigrationStarted.current = true;
    void (async () => {
      let migrated = 0;
      for (const [screen, source] of legacyEntries) {
        try {
          const reference = await saveImageAsset(source);
          if (useAppStore.getState().appIconOverrides[screen] !== source) continue;
          setAppIconOverride(screen as Screen, reference);
          await Promise.resolve();
          if (hasPersistedAppIconOverride(window.localStorage.getItem(BACKUP_STORAGE_KEY), screen, reference)) migrated += 1;
        } catch {
          // Keep the original inline icon when one legacy image cannot be migrated.
        }
      }
      if (migrated > 0) setImageStatus(`已自动整理 ${migrated} 个旧版软件头像，后续保存不会再挤占小容量设置存储。`);
    })();
  }, [setAppIconOverride]);

  const uploadAppIcon = async (screen: Parameters<typeof setAppIconOverride>[0], event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const label = catalogApps.find((app) => app.screen === screen)?.label || '软件';
    const previousIcon = resolveAppIconImage(screen, appIconOverrides);
    let reference = '';
    setSavingIcon(screen);
    setIconStatus((current) => ({ ...current, [screen]: '正在读取…' }));
    try {
      reference = await saveImageAsset(await readCustomImageFile(file));
      setAppIconOverride(screen, reference);
      await Promise.resolve();
      if (!hasPersistedAppIconOverride(window.localStorage.getItem(BACKUP_STORAGE_KEY), screen, reference)) {
        if (previousIcon) setAppIconOverride(screen, previousIcon);
        else clearAppIconOverride(screen);
        await deleteImageAssets([reference]).catch(() => undefined);
        throw new Error('本地设置空间不足，头像未保存；请先到“数据备份 → 存储管理”清理未引用图片。');
      }
      setIconStatus((current) => ({ ...current, [screen]: '已保存' }));
      setImageStatus(`${label}头像已保存并应用到桌面。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '软件头像保存失败。';
      setIconStatus((current) => ({ ...current, [screen]: '保存失败' }));
      setImageStatus(`${label}：${message}`);
    } finally {
      setSavingIcon(null);
      event.target.value = '';
    }
  };

  return (
    <section className="themes-screen h-full overflow-y-auto pb-8">
      <Header title="外观" subtitle="只展开现在要改的项目" />
      <Panel className="themes-panel" data-appearance-section="themes">
        <button type="button" className="appearance-disclosure" aria-expanded={themesExpanded} onClick={() => setThemesExpanded((value) => !value)}>
          <div>
            <h2 className="text-lg font-black">整机主题</h2>
            <p>正在使用：{activeTheme.name}；点击主题切换整机风格。</p>
          </div>
          <span>{themeOptions.length} 套 <ChevronDown className={cn('h-4 w-4 transition-transform', themesExpanded && 'rotate-180')} /></span>
        </button>
        {themesExpanded && <div className="appearance-choice-list mt-3 grid grid-cols-2 gap-2">
          {themeOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={theme === item.id}
              data-theme-preview={item.id}
              onClick={() => setTheme(item.id)}
              className={cn('theme-card theme-choice-card', theme === item.id && 'active')}
            >
              <span className="theme-choice-copy">
                <strong>{item.name}</strong>
                <small>{item.desc}</small>
              </span>
              <span className="theme-choice-visual" aria-hidden="true">
                <i className="theme-choice-brand" />
                <i className="theme-choice-route" />
                <i className="theme-choice-status" />
                <i className="theme-choice-bubble theme-choice-bubble-model" />
                <i className="theme-choice-bubble theme-choice-bubble-user" />
                <i className="theme-choice-dock"><b /><b /><b /></i>
              </span>
            </button>
          ))}
        </div>}
      </Panel>
      <Panel className="themes-panel mt-4" data-appearance-section="bubbles">
        <button
          type="button"
          className="bubble-styles-disclosure"
          aria-expanded={bubbleStylesExpanded}
          onClick={() => setBubbleStylesExpanded((expanded) => !expanded)}
        >
          <div>
            <h2 className="text-lg font-black">气泡美化</h2>
            <p>{bubbleStyleOptions.find((item) => item.id === bubbleStyle)?.number || '默认'} · {bubbleStyleOptions.find((item) => item.id === bubbleStyle)?.name}；同时作用于微信和 QQ</p>
          </div>
          <span>{bubbleStyleOptions.length - 1} 套 · 微信/QQ <ChevronDown className={cn('h-4 w-4 transition-transform', bubbleStylesExpanded && 'rotate-180')} /></span>
        </button>
        {bubbleStylesExpanded && <div className="mt-3 grid gap-3">
          {bubbleStyleOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={bubbleStyle === item.id}
              onClick={() => setBubbleStyle(item.id)}
              className={cn('theme-card bubble-choice-card', bubbleStyle === item.id && 'active')}
            >
              <span className="bubble-choice-copy">
                <strong>{item.number && <b className="bubble-choice-number">{item.number}</b>}{item.name}</strong>
                <small>{item.desc}</small>
                <em>微信 · QQ</em>
              </span>
              <span
                className={cn('bubble-choice-preview', `bubble-choice-preview-${item.id}`)}
                data-bubble-preview={item.id}
                style={{
                  '--bubble-preview-surface': item.preview.surface,
                  '--bubble-preview-model': item.preview.model,
                  '--bubble-preview-user': item.preview.user,
                  '--bubble-preview-ink': item.preview.ink,
                  '--bubble-preview-user-ink': item.preview.userInk,
                  '--bubble-preview-accent': item.preview.accent,
                } as React.CSSProperties}
                aria-hidden="true"
              >
                <i className="bubble-preview-model"><b /><span>文字</span></i>
                <i className="bubble-preview-user"><b /><span>语音 ··· 8″</span></i>
              </span>
            </button>
          ))}
        </div>}
      </Panel>
      <Panel className="themes-panel mt-4" data-appearance-section="icons">
        <button
          type="button"
          className="appearance-disclosure"
          aria-expanded={softwareIconsExpanded}
          onClick={() => setSoftwareIconsExpanded((expanded) => !expanded)}
        >
          <div><h2 className="text-lg font-black">软件头像</h2><p>每个软件可以单独更换；坏图会自动回退原图标。</p></div>
          <span>{catalogApps.length} 个 <ChevronDown className={cn('h-4 w-4 transition-transform', softwareIconsExpanded && 'rotate-180')} /></span>
        </button>
        {softwareIconsExpanded && (
          <div className="mt-3 grid gap-2">
            {catalogApps.map((app) => {
              const customIcon = resolveAppIconImage(app.screen, appIconOverrides);
              return (
                <div key={app.screen} className="software-icon-row">
                  <span className={cn('software-icon-preview', app.color)}>
                    {customIcon
                      ? <PersistentImage src={customIcon} alt="" className="custom-app-icon-image" fallback={React.cloneElement(app.icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })} />
                      : React.cloneElement(app.icon as React.ReactElement<{ className?: string }>, { className: 'h-5 w-5' })}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-black">
                    {app.label}
                    {iconStatus[app.screen] && <small className="block truncate text-[10px] opacity-60">{iconStatus[app.screen]}</small>}
                  </span>
                  <label className="icon-tool-button icon-tool-button-wide cursor-pointer" aria-label={`更换${app.label}头像`}>
                    <ImageIcon className="h-4 w-4" /><span>{savingIcon === app.screen ? '保存中' : '更换'}</span>
                    <input type="file" accept={customImageAccept} onChange={(event) => uploadAppIcon(app.screen, event)} className="sr-only" disabled={savingIcon !== null} />
                  </label>
                  <button type="button" onClick={() => clearAppIconOverride(app.screen)} className="icon-tool-button icon-tool-button-wide" aria-label={`恢复${app.label}默认头像`} disabled={!customIcon}>
                    <RotateCcw className="h-4 w-4" /><span>恢复</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {imageStatus && <p className="mt-3 text-xs font-black leading-5 opacity-65" role="status">{imageStatus}</p>}
      </Panel>
      <Panel className="themes-panel mt-4" data-appearance-section="fonts">
        <button type="button" className="appearance-disclosure" aria-expanded={fontsExpanded} onClick={() => setFontsExpanded((value) => !value)}>
          <div>
            <h2 className="text-lg font-black">界面字体</h2>
            <p>正在使用：{activeFont.name}；字体与主题可独立切换</p>
          </div>
          <span>{fontOptions.length} 套 · 本地 <ChevronDown className={cn('h-4 w-4 transition-transform', fontsExpanded && 'rotate-180')} /></span>
        </button>
        {fontsExpanded && <div className="mt-3 grid grid-cols-2 gap-2">
          {fontOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={fontStyle === item.id}
              onClick={() => setFontStyle(item.id)}
              className={cn('theme-card font-choice-card', `font-choice-card-${item.id}`, fontStyle === item.id && 'active')}
            >
              <p className="text-lg font-black">{item.name}</p>
              <p className="text-sm font-bold opacity-65">{item.desc}</p>
              <p className={cn('font-choice-sample', `font-choice-sample-${item.id}`)}>{item.sample}</p>
            </button>
          ))}
        </div>}
      </Panel>
      <Panel className="themes-panel mt-4" data-appearance-section="bottom">
        <button type="button" className="appearance-disclosure" aria-expanded={bottomLayoutExpanded} onClick={() => setBottomLayoutExpanded((value) => !value)}>
          <div><h2 className="text-lg font-black">底部位置</h2><p>{chatBottomLayout === 'lifted' ? '当前：上移，适合输入法容易遮挡的设备' : '当前：标准位置'}</p></div>
          <span><ChevronDown className={cn('h-4 w-4 transition-transform', bottomLayoutExpanded && 'rotate-180')} /></span>
        </button>
        {bottomLayoutExpanded && <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setChatBottomLayout('default')}
            className={cn('theme-card text-left', chatBottomLayout === 'default' && 'active')}
          >
            <p className="text-lg font-black">维持现在</p>
            <p className="text-sm font-bold opacity-65">保持原来的底部位置。</p>
          </button>
          <button
            type="button"
            onClick={() => setChatBottomLayout('lifted')}
            className={cn('theme-card text-left', chatBottomLayout === 'lifted' && 'active')}
          >
            <p className="text-lg font-black">底部上移</p>
            <p className="text-sm font-bold opacity-65">桌面 Dock、分页点、聊天输入栏和应用底部导航一起上移。</p>
          </button>
        </div>}
      </Panel>
    </section>
  );
}
