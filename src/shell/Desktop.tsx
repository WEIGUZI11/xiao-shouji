/**
 * Desktop, dock, draggable app icons, and custom widgets for the phone shell.
 * Main components: Desktop, Draggable, CustomWidgetView, AppIcon.
 * Dependencies: app catalog, desktop guide, first-use guide tip, icon overrides, and shell layout state from useAppStore.
 * Maintenance note: keep feature routing in FeatureRouter.tsx; this file owns only desktop layout UI.
 */
import { Image as ImageIcon, LayoutGrid, Plus, Sparkles, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { PersistentImage } from '../components/PersistentImage';
import { customImageAccept, readCustomImageFile } from '../lib/customImage';
import { saveImageAsset } from '../lib/imageAssetStore';
import type { CustomWidget, LayoutMode, Screen } from '../store';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import { dockApps, pageApps } from './appCatalog';
import { resolveAppIconImage } from './appIconOverrides';
import { getDesktopAppPage, getDesktopDefaultPosition, getDesktopItemStyle, getDesktopLayoutStorageId } from './desktopLayout';
import { desktopGuideSections, getDesktopGuideView } from './desktopGuide';
import { markFirstUseGuideTipSeen, shouldShowFirstUseGuideTip } from './firstUseGuideTip';

export function Desktop({ badges }: { badges: Partial<Record<Screen, number>> }) {
  const {
    setScreen,
    imageBed,
    setImageBed,
    layoutMode,
    setLayoutMode,
    layoutPositions,
    setLayoutPosition,
    resetLayoutPositions,
    desktopPage,
    setDesktopPage,
    customWidgets,
    addCustomWidget,
    updateCustomWidget,
    removeCustomWidget,
    appIconOverrides,
    theme,
  } = useAppStore(useShallow((state) => ({
    setScreen: state.setScreen,
    imageBed: state.imageBed,
    setImageBed: state.setImageBed,
    layoutMode: state.layoutMode,
    setLayoutMode: state.setLayoutMode,
    layoutPositions: state.layoutPositions,
    setLayoutPosition: state.setLayoutPosition,
    resetLayoutPositions: state.resetLayoutPositions,
    desktopPage: state.desktopPage,
    setDesktopPage: state.setDesktopPage,
    customWidgets: state.customWidgets,
    addCustomWidget: state.addCustomWidget,
    updateCustomWidget: state.updateCustomWidget,
    removeCustomWidget: state.removeCustomWidget,
    appIconOverrides: state.appIconOverrides,
    theme: state.theme,
  })));
  const imageInputRef = useRef<HTMLInputElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showFirstUseGuideTip, setShowFirstUseGuideTip] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [imageUploadStatus, setImageUploadStatus] = useState('');
  const [activeGuideSectionId, setActiveGuideSectionId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const page = desktopPage;
  const now = new Date();
  const dateText = now.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'long' });
  const themedPos = (id: string, fallback: { x: number; y: number }) => getDesktopDefaultPosition(theme, id, fallback);

  useEffect(() => {
    setShowFirstUseGuideTip(shouldShowFirstUseGuideTip());
  }, []);

  useEffect(() => {
    if (!imageUploadStatus) return;
    const timer = window.setTimeout(() => setImageUploadStatus(''), 3200);
    return () => window.clearTimeout(timer);
  }, [imageUploadStatus]);

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImageBed(await saveImageAsset(await readCustomImageFile(file)));
      setImageUploadStatus('自定义图片已保存。');
    } catch (error) {
      setImageUploadStatus(error instanceof Error ? error.message : '图片保存失败，请重新选择。');
    } finally {
      event.target.value = '';
    }
  };

  const setDesktopPageSafely = (nextPage: number) => {
    setDesktopPage(nextPage <= 0 ? 0 : 1);
  };

  const startPageSwipe = (event: React.PointerEvent<HTMLElement>) => {
    if (editMode || (event.target as HTMLElement).closest('button, input, textarea')) return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const finishPageSwipe = (event: React.PointerEvent<HTMLElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || editMode) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 46 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    setDesktopPageSafely(deltaX < 0 ? 1 : 0);
  };

  const resetCurrentPageLayout = () => {
    const ids = pageApps
      .filter((app) => getDesktopAppPage(theme, app.id, app.page) === page)
      .map((app) => getDesktopLayoutStorageId(theme, app.id));
    if (page === 0) {
      ids.push(getDesktopLayoutStorageId(theme, 'image-bed'), getDesktopLayoutStorageId(theme, 'time-card'));
    }
    resetLayoutPositions(ids);
  };

  const closeGuide = () => {
    setShowGuide(false);
    setActiveGuideSectionId(null);
  };

  const dismissFirstUseGuideTip = () => {
    markFirstUseGuideTipSeen();
    setShowFirstUseGuideTip(false);
  };

  const openGuideFromFirstUseTip = () => {
    dismissFirstUseGuideTip();
    setActiveGuideSectionId(null);
    setShowGuide(true);
    setDesktopPageSafely(0);
  };

  const guideView = getDesktopGuideView(desktopGuideSections, activeGuideSectionId);

  return (
    <section
      className={cn('cream-screen desktop-screen relative h-full overflow-hidden px-5 pb-28 pt-10', `desktop-page-${page + 1}`, editMode && 'select-none')}
      onPointerDown={startPageSwipe}
      onPointerUp={finishPageSwipe}
      onPointerCancel={() => { swipeStartRef.current = null; }}
    >
      <div className="layout-controls">
        {!editMode ? (
          <button onClick={() => { setLayoutMode('snap'); setEditMode(true); }} className="layout-toggle">
            {theme !== 'gothic' && <LayoutGrid className="h-3.5 w-3.5" />}{theme === 'gothic' ? '编辑布局' : '整理桌面'}
          </button>
        ) : (
          <div className="layout-edit-panel">
            <p><strong>拖动图标调整位置</strong><small>图标会自动吸附到网格</small></p>
            <div>
              <button onClick={resetCurrentPageLayout} className="layout-toggle"><LayoutGrid className="h-3.5 w-3.5" />自动排列</button>
              <button onClick={() => setShowWidgetPicker(true)} className="layout-toggle"><Plus className="h-3.5 w-3.5" />添加组件</button>
              <button onClick={() => setEditMode(false)} className="layout-toggle active">完成</button>
            </div>
          </div>
        )}
      </div>

      <div ref={canvasRef} className={cn('desktop-canvas', `desktop-canvas-page-${page + 1}`, layoutMode === 'snap' && editMode && 'snap-grid')}>
        {page === 0 && (
          <>
            <Draggable id={getDesktopLayoutStorageId(theme, 'image-bed')} defaultPos={themedPos('image-bed', { x: 188, y: 24 })} editMode={editMode} layoutMode={layoutMode} canvasRef={canvasRef} positions={layoutPositions} setPosition={setLayoutPosition}>
              <button onClick={() => !editMode && imageInputRef.current?.click()} className={cn('image-bed', imageBed && 'has-image-bed')}>
                {imageBed
                  ? <PersistentImage src={imageBed} alt="自定义图片" className="h-full w-full object-cover" fallback={<><ImageIcon className="mb-2 h-10 w-10" /><span>重新选择图片</span></>} />
                  : <><ImageIcon className="mb-2 h-10 w-10" /><span>自定义图片</span></>}
              </button>
            </Draggable>
            <input ref={imageInputRef} type="file" accept={customImageAccept} onChange={uploadImage} className="hidden" />
            {imageUploadStatus && <p className="desktop-image-upload-status" role="status" aria-live="polite">{imageUploadStatus}</p>}

            <Draggable id={getDesktopLayoutStorageId(theme, 'time-card')} defaultPos={themedPos('time-card', { x: 12, y: 242 })} editMode={editMode} layoutMode={layoutMode} canvasRef={canvasRef} positions={layoutPositions} setPosition={setLayoutPosition}>
              <div className="time-card">
                <div className="min-w-0">
                  <div className="time-text">{now.toLocaleTimeString('zh-CN', { hour12: false })}</div>
                  <div className="date-text">{dateText}</div>
                </div>
                <button
                  onClick={() => {
                    if (editMode) return;
                    markFirstUseGuideTipSeen();
                    setShowFirstUseGuideTip(false);
                    setShowGuide(!showGuide);
                  }}
                  className="guide-mark"
                  aria-label="教程"
                >
                  42
                  <Sparkles className="absolute -right-2 -top-2 h-5 w-5 fill-[#f9e58f] text-[#111]" />
                </button>
              </div>
            </Draggable>
          </>
        )}

        {pageApps.filter((app) => getDesktopAppPage(theme, app.id, app.page) === page).map((app) => (
          <Draggable key={app.id} id={getDesktopLayoutStorageId(theme, app.id)} defaultPos={themedPos(app.id, { x: app.x, y: app.y })} editMode={editMode} layoutMode={layoutMode} canvasRef={canvasRef} positions={layoutPositions} setPosition={setLayoutPosition}>
            <AppIcon {...app} iconUrl={resolveAppIconImage(app.screen, appIconOverrides)} badge={badges[app.screen]} onClick={() => !editMode && setScreen(app.screen)} />
          </Draggable>
        ))}

        {customWidgets.filter((widget) => widget.page === page).map((widget) => (
          <Draggable key={widget.id} id={getDesktopLayoutStorageId(theme, `widget-${widget.id}`)} defaultPos={{ x: widget.x, y: widget.y }} editMode={editMode} layoutMode={layoutMode} canvasRef={canvasRef} positions={layoutPositions} setPosition={setLayoutPosition}>
            <CustomWidgetView widget={widget} editMode={editMode} updateWidget={updateCustomWidget} removeWidget={removeCustomWidget} />
          </Draggable>
        ))}
      </div>

      <div className="page-dots">
        <button type="button" aria-label="第 1 页" aria-current={page === 0 ? 'page' : undefined} onClick={() => setDesktopPageSafely(0)} className={cn(page === 0 && 'active')}><span className="page-dot-mark" aria-hidden="true" /></button>
        <button type="button" aria-label="第 2 页" aria-current={page === 1 ? 'page' : undefined} onClick={() => setDesktopPageSafely(1)} className={cn(page === 1 && 'active')}><span className="page-dot-mark" aria-hidden="true" /></button>
      </div>

      {showFirstUseGuideTip && !showGuide && !showWidgetPicker && !editMode && (
        <div className="first-use-tip" role="dialog" aria-label="首次使用提示">
          <div className="first-use-tip-panel">
            <button type="button" onClick={dismissFirstUseGuideTip} className="widget-delete guide-close" aria-label="关闭首次使用提示">
              ×
            </button>
            <p className="first-use-tip-kicker">第一次使用小手机</p>
            <h2>先看 42 教程</h2>
            <p>点时间卡右侧的 42，可以打开小手机教程，里面有每个软件的功能和使用方法。</p>
            <div className="first-use-tip-actions">
              <button type="button" onClick={openGuideFromFirstUseTip} className="guide-back-button">现在看 42</button>
              <button type="button" onClick={dismissFirstUseGuideTip} className="guide-topic-button first-use-tip-secondary">知道了</button>
            </div>
          </div>
        </div>
      )}

      {showGuide && (
        <div className="guide-modal">
          <div className="guide-panel">
            <button onClick={closeGuide} className="widget-delete guide-close">
              ×
            </button>
            <h2>小手机教程</h2>
            {guideView.mode === 'directory' ? (
              <>
                <p className="guide-intro">先点一个章节，弹窗会切换到对应的软件说明和使用步骤。</p>
                <div className="guide-topic-list">
                  {guideView.sections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveGuideSectionId(section.id)}
                      className="guide-topic-button"
                    >
                      <span className="guide-topic-title">{section.title}</span>
                      <span>{section.summary}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : guideView.activeSection ? (
              <section className="guide-section active guide-detail-view">
                <button type="button" onClick={() => setActiveGuideSectionId(null)} className="guide-back-button">
                  返回目录
                </button>
                <h3>{guideView.activeSection.title}</h3>
                {guideView.activeSection.intro && <p>{guideView.activeSection.intro}</p>}
                {(() => {
                  const ListTag = guideView.activeSection.ordered ? 'ol' : 'ul';
                  return (
                    <ListTag>
                      {guideView.activeSection.items.map((item) => <li key={item}>{item}</li>)}
                    </ListTag>
                  );
                })()}
              </section>
            ) : (
              <p className="guide-empty-hint">点任意章节查看详情。</p>
            )}
          </div>
        </div>
      )}

      {showWidgetPicker && (
        <div className="guide-modal">
          <div className="guide-panel compact">
            <button onClick={() => setShowWidgetPicker(false)} className="widget-delete guide-close">
              ×
            </button>
            <h2>添加小组件</h2>
            <div className="widget-picker">
              <button onClick={() => { addCustomWidget(page, 'note'); setShowWidgetPicker(false); }} className="feature-tile">便签</button>
              <button onClick={() => { addCustomWidget(page, 'photo'); setShowWidgetPicker(false); }} className="feature-tile">照片</button>
              <button onClick={() => { addCustomWidget(page, 'status'); setShowWidgetPicker(false); }} className="feature-tile">状态</button>
            </div>
          </div>
        </div>
      )}

      <div className="dock">
        {dockApps.map((app) => {
          const iconUrl = resolveAppIconImage(app.screen, appIconOverrides);
          return (
            <button key={app.label} type="button" aria-label={app.label} onClick={() => setScreen(app.screen)} className="flex flex-col items-center gap-1" data-screen={app.screen}>
              <span className={cn('dock-icon', app.color, iconUrl && 'has-custom-app-icon')} data-screen={app.screen}>
                {!iconUrl && <span className="gothic-app-art" aria-hidden="true" />}
                {iconUrl
                  ? <PersistentImage
                      src={iconUrl}
                      alt=""
                      className="custom-app-icon-image"
                      fallback={<><span className="gothic-app-art" aria-hidden="true" />{React.cloneElement(app.icon as React.ReactElement<{ className?: string }>, { className: 'h-6 w-6 app-icon-default-glyph' })}</>}
                    />
                  : React.cloneElement(app.icon as React.ReactElement<{ className?: string }>, { className: 'h-6 w-6 app-icon-default-glyph' })}
                {badges[app.screen] ? <span className="shell-badge dock-badge">{badges[app.screen]! > 99 ? '99+' : badges[app.screen]}</span> : null}
              </span>
              <span className="text-[11px] font-black">{app.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Draggable({
  id,
  defaultPos,
  editMode,
  layoutMode,
  canvasRef,
  positions,
  setPosition,
  children,
}: {
  key?: React.Key;
  id: string;
  defaultPos: { x: number; y: number };
  editMode: boolean;
  layoutMode: LayoutMode;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  positions: Record<string, { x: number; y: number }>;
  setPosition: (id: string, position: { x: number; y: number }) => void;
  children: React.ReactNode;
}) {
  const position = positions[id] || defaultPos;

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editMode) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const startX = event.clientX - rect.left - position.x;
    const startY = event.clientY - rect.top - position.y;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const move = (moveEvent: PointerEvent) => {
      const rawX = moveEvent.clientX - rect.left - startX;
      const rawY = moveEvent.clientY - rect.top - startY;
      const snappedX = layoutMode === 'snap' ? Math.round(rawX / 16) * 16 : rawX;
      const snappedY = layoutMode === 'snap' ? Math.round(rawY / 16) * 16 : rawY;
      const nextX = Math.max(0, Math.min(rect.width - target.offsetWidth, snappedX));
      const nextY = Math.max(0, Math.min(rect.height - target.offsetHeight, snappedY));
      setPosition(id, { x: nextX, y: nextY });
    };

    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  return (
    <div className={cn('draggable-item', editMode && 'editing')} style={getDesktopItemStyle(position)} onPointerDown={startDrag}>
      {children}
    </div>
  );
}

function CustomWidgetView({
  widget,
  editMode,
  updateWidget,
  removeWidget,
}: {
  widget: CustomWidget;
  editMode: boolean;
  updateWidget: (id: string, updates: Partial<CustomWidget>) => void;
  removeWidget: (id: string) => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);

  const uploadWidgetImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateWidget(widget.id, { image: reader.result as string });
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div className={cn('custom-widget', `widget-${widget.type}`)}>
      {editMode && (
        <button
          className="widget-delete"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            removeWidget(widget.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {editMode ? (
        <>
          <input
            value={widget.title}
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => updateWidget(widget.id, { title: event.target.value })}
            className="widget-input font-black"
          />
          {widget.type === 'photo' && (
            <>
              <button
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  photoInputRef.current?.click();
                }}
                className="widget-photo-button"
              >
                {widget.image ? <img src={widget.image} className="h-full w-full object-cover" /> : '上传照片'}
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={uploadWidgetImage} className="hidden" />
            </>
          )}
          <textarea
            value={widget.content}
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => updateWidget(widget.id, { content: event.target.value })}
            className="widget-input mt-2 min-h-12 resize-none text-sm"
          />
        </>
      ) : (
        <>
          {widget.type === 'photo' && widget.image && <img src={widget.image} className="mb-2 h-20 w-full rounded-xl border-2 border-[#111] object-cover" />}
          <p className="font-black">{widget.title}</p>
          <p className="mt-1 text-sm font-bold opacity-70">{widget.type === 'photo' && !widget.content ? '编辑布局后可上传照片/填描述' : widget.content}</p>
        </>
      )}
    </div>
  );
}

function AppIcon({ label, icon, iconUrl, color, badge, screen, onClick }: { key?: React.Key; label: string; icon: React.ReactNode; iconUrl?: string | null; color: string; badge?: number; screen: Screen; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="app-button" data-screen={screen}>
      <span className={cn('app-icon', color, iconUrl && 'has-custom-app-icon')} data-screen={screen}>
        {!iconUrl && <span className="gothic-app-art" aria-hidden="true" />}
        {iconUrl
          ? <PersistentImage
              src={iconUrl}
              alt=""
              className="custom-app-icon-image"
              fallback={<><span className="gothic-app-art" aria-hidden="true" />{React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-7 w-7 app-icon-default-glyph' })}</>}
            />
          : React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'h-7 w-7 app-icon-default-glyph' })}
        {badge ? <span className="shell-badge">{badge > 99 ? '99+' : badge}</span> : null}
      </span>
      <span className="app-label">{label}</span>
    </button>
  );
}
