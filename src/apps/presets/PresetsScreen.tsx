import { Bot, Check, ChevronDown, ChevronUp, FileText, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import React, { useRef, useState } from 'react';

import { cn } from '../../lib/utils';
import { appPresetDefinitions, roleMap, type AppPresetEntry, type AppPresetKey, type GeminiPresetRole } from '../../presets/softwarePresets';
import { useAppStore } from '../../store';
import { compileChatPresetEntries, parseSillyTavernPresetEntries } from '../wechat/presets/chatPresetEntries';
import { createSmallPhonePresetEntries, getSmallPhoneRpMode } from '../wechat/presets/smallPhonePreset';
import { clampNumber, parseSillyTavernPreset, wechatChatPresets } from '../wechat/shared/WeChatShared';
import { Field, Header, Panel } from '../shared/AppPrimitives';
import { ChatPresetEntriesEditor } from './ChatPresetEntriesEditor';

const presetCards = [
  ['手机沉浸模式', '适合微信、QQ、电话、日记和查手机等日常互动。'],
  ['日常陪伴', '偏向自然聊天、生活琐事和轻松陪伴。'],
  ['剧情推进', '偏向小剧场、主动事件、隐藏相册和剧情线索。'],
  ['沉浸通话', '偏向电话和视频通话中的停顿、画面与环境声。'],
] as const;

const cleanAppLabels: Record<AppPresetKey, { label: string; appName: string; summary: string }> = {
  wechat: { label: '微信', appName: '微信 / QQ 聊天', summary: '微信和 QQ 共用同一个聊天预设。' },
  qq: { label: 'QQ', appName: '微信 / QQ 聊天', summary: '微信和 QQ 共用同一个聊天预设。' },
  phone: { label: '电话', appName: '电话', summary: '管理接听、拨号和通话记录的口语提示词。' },
  video: { label: '视频', appName: '视频通话', summary: '管理视频通话的画面、动作和对白提示词。' },
  diary: { label: '日记', appName: '日记', summary: '管理角色日记和生活记录的提示词。' },
  calendar: { label: '日历', appName: '日历', summary: '管理日程、纪念日和提醒事项的提示词。' },
  gallery: { label: '相册', appName: '相册', summary: '管理照片注释、回忆和相册内容的提示词。' },
  memo: { label: '备忘录', appName: '备忘录', summary: '管理便签、待办和提醒内容的提示词。' },
  peek: { label: '查手机', appName: '查手机', summary: '管理角色手机痕迹和线索内容的提示词。' },
  browser: { label: '浏览器', appName: '浏览器搜索', summary: '管理搜索结果和网页内容的提示词。' },
  xiaohongshu: { label: '小红书', appName: '小红书', summary: '管理笔记、评论和标签内容的提示词。' },
  bilibili: { label: 'B站', appName: 'Bilibili', summary: '管理视频、弹幕和评论内容的提示词。' },
  theater: { label: '小剧场', appName: '小剧场', summary: '管理剧情场景、对白和转折的提示词。' },
  music: { label: '音乐', appName: '音乐', summary: '管理歌名、风格、编曲说明和歌词提示词。' },
  activeEvents: { label: '主动事件', appName: '主动事件', summary: '管理角色主动消息和生活变化的提示词。' },
};

export function PresetsScreen() {
  const {
    presetName,
    setPresetName,
    appPresets,
    setAppPreset,
    resetAppPreset,
    resetAllAppPresets,
    chatPresetName,
    chatPresetPrompt,
    chatPresetEntries,
    chatContextDepth,
    chatTemperature,
    chatMaxTokens,
    chatReplyStyle,
    setChatPresetEntries,
    setModelConfig,
  } = useAppStore();
  const [activePresetKey, setActivePresetKey] = useState<AppPresetKey>('wechat');
  const [presetImportText, setPresetImportText] = useState('');
  const [styleSectionOpen, setStyleSectionOpen] = useState(false);
  const [softwareSectionOpen, setSoftwareSectionOpen] = useState(false);
  const [confirmDeletePreset, setConfirmDeletePreset] = useState(false);
  const [pendingGenericDeleteId, setPendingGenericDeleteId] = useState<string | null>(null);
  const presetInputRef = useRef<HTMLInputElement>(null);
  const activeLabels = cleanAppLabels[activePresetKey];
  const isSharedChatPreset = activePresetKey === 'wechat' || activePresetKey === 'qq';
  const activePreset = appPresets[activePresetKey];
  const activeEntry = activePreset.entries.find((entry) => entry.id === activePreset.activeEntryId) || activePreset.entries[0];
  const enabledChatEntries = chatPresetEntries.filter((entry) => entry.enabled).length;
  const isBuiltInWechatPreset = wechatChatPresets.some((preset) => preset.name === chatPresetName);
  const actualChatPresetPreview = chatPresetEntries.length > 0
    ? compileChatPresetEntries(chatPresetEntries, { replyStyle: chatReplyStyle })
    : chatPresetPrompt;

  const commitEntries = (entries: AppPresetEntry[], activeEntryId = activePreset.activeEntryId) => {
    const selected = entries.find((entry) => entry.id === activeEntryId) || entries[0];
    setAppPreset(activePresetKey, {
      entries,
      activeEntryId: selected?.id,
      name: selected?.name || activePreset.name,
      prompt: selected?.prompt || activePreset.prompt,
      role: selected?.role || activePreset.role,
    });
  };

  const updateActiveEntry = (updates: Partial<Omit<AppPresetEntry, 'id'>>) => {
    const entries = activePreset.entries.map((entry) => entry.id === activeEntry.id ? { ...entry, ...updates } : entry);
    commitEntries(entries, activeEntry.id);
  };

  const addEntry = () => {
    const id = `${activePresetKey}-${Date.now()}`;
    commitEntries([...activePreset.entries, { id, name: '新条目', role: 'system', prompt: '' }], id);
  };

  const deleteGenericEntry = (entryId: string) => {
    if (activePreset.entries.length <= 1) return;
    const entries = activePreset.entries.filter((entry) => entry.id !== entryId);
    commitEntries(entries, entries[0]?.id);
    setPendingGenericDeleteId(null);
  };

  const applyWechatPresetObject = (data: Record<string, unknown>, fallbackName?: string) => {
    const preset = parseSillyTavernPreset(data);
    const entries = parseSillyTavernPresetEntries(data);
    const importedName = preset.name === '导入预设' && fallbackName ? fallbackName : preset.name;
    setChatPresetEntries(entries, importedName);
    setModelConfig({
      ...(entries.length === 0 ? { chatPresetName: importedName, chatPresetPrompt: preset.prompt || chatPresetPrompt } : {}),
      chatContextDepth: preset.contextDepth,
      chatTemperature: preset.temperature,
      chatMaxTokens: preset.maxTokens,
      ...(preset.model ? { selectedModel: preset.model } : {}),
      chatReplyStyle: data.reply_style === 'single' || data.reply_style === 'burst' || data.reply_style === 'auto'
        ? data.reply_style
        : chatReplyStyle,
    });
  };

  const importPresetFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        applyWechatPresetObject(JSON.parse(String(reader.result)), file.name.replace(/\.(?:json|txt)$/i, ''));
      } catch {
        setPresetImportText(String(reader.result || ''));
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const importPresetText = () => {
    if (!presetImportText.trim()) return;
    try {
      applyWechatPresetObject(JSON.parse(presetImportText));
    } catch {
      setChatPresetEntries([], '导入文本预设');
      setModelConfig({ chatPresetName: '导入文本预设', chatPresetPrompt: presetImportText });
    }
    setPresetImportText('');
  };

  const applyBuiltInWechatPreset = (name: string, preserveCurrentEntries = true) => {
    const preset = wechatChatPresets.find((item) => item.name === name) || wechatChatPresets[0];
    const replyMode = getSmallPhoneRpMode(preset.replyStyle);
    const nextEntries = preset.entries
      ? createSmallPhonePresetEntries(replyMode, preserveCurrentEntries ? chatPresetEntries : preset.entries)
      : [];
    setChatPresetEntries(nextEntries, preset.name);
    setModelConfig({
      chatPresetName: preset.name,
      chatPresetPrompt: nextEntries.length > 0 ? compileChatPresetEntries(nextEntries, { replyStyle: preset.replyStyle }) : preset.prompt,
      chatContextDepth: preset.contextDepth,
      chatTemperature: preset.temperature,
      chatMaxTokens: preset.maxTokens,
      chatReplyStyle: preset.replyStyle,
    });
  };

  const resetCurrentPreset = () => {
    if (isSharedChatPreset) {
      applyBuiltInWechatPreset(wechatChatPresets[0].name, false);
      return;
    }
    resetAppPreset(activePresetKey);
  };

  const resetAllPresets = () => {
    resetAllAppPresets();
  };

  return (
    <section className="preset-manager-screen no-scrollbar h-full overflow-y-auto px-1 pb-24">
      <Header title="预设" subtitle="统一管理各个软件实际发送给模型的提示词" />

      <Panel>
        <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => setStyleSectionOpen((open) => !open)} aria-expanded={styleSectionOpen}>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black">手机整体风格</p>
            <p className="mt-1 truncate text-xs font-bold opacity-60">当前：{presetName}</p>
          </div>
          <span className="preset-icon-button">{styleSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
        </button>
        {styleSectionOpen && (
          <div className="mt-3 grid gap-2">
            {presetCards.map(([name, desc]) => {
              const selected = presetName === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setPresetName(name)}
                  aria-pressed={selected}
                  className={cn('flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition', selected ? 'border-[#111] bg-[#111] text-white shadow-[3px_3px_0_var(--theme-accent)]' : 'border-black/15 bg-white/55')}
                >
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-white bg-[var(--theme-accent)]' : 'border-black/20')}>{selected && <Check className="h-4 w-4" />}</span>
                  <span className="min-w-0">
                    <strong className="block text-sm">{name}</strong>
                    <span className="block truncate text-[11px] opacity-70">{desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel>
        <div className="flex items-center gap-3">
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSoftwareSectionOpen((open) => !open)} aria-expanded={softwareSectionOpen}>
            <p className="text-lg font-black">软件预设</p>
            <p className="mt-1 truncate text-xs font-bold opacity-60">当前：{cleanAppLabels[activePresetKey].label}</p>
          </button>
          <button type="button" className="preset-icon-button" onClick={() => setSoftwareSectionOpen((open) => !open)} aria-label={softwareSectionOpen ? '收起软件预设' : '展开软件预设'}>
            {softwareSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button type="button" onClick={resetAllPresets} className="preset-compact-button shrink-0" title="全部恢复默认">全部恢复</button>
        </div>
        {softwareSectionOpen && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {appPresetDefinitions.map((definition) => {
              const selected = activePresetKey === definition.key;
              return (
                <button
                  key={definition.key}
                  type="button"
                  onClick={() => setActivePresetKey(definition.key)}
                  aria-pressed={selected}
                  className={cn('relative rounded-xl border-2 px-3 py-2.5 text-left text-sm font-black transition', selected ? 'border-[#111] bg-[#111] text-white shadow-[3px_3px_0_var(--theme-accent)]' : 'border-black/15 bg-white/55')}
                >
                  <span className="flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded-full', selected ? 'bg-[var(--theme-accent)] ring-2 ring-white' : 'bg-black/15')} />{cleanAppLabels[definition.key].label}</span>
                  <span className="mt-1 block truncate text-[10px] opacity-65">{definition.key === 'wechat' || definition.key === 'qq' ? chatPresetName : appPresets[definition.key]?.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {isSharedChatPreset ? (
        <Panel>
          <div>
            <div className="min-w-0">
              <p className="text-lg font-black">微信 / QQ 共用聊天预设</p>
              <p className="mt-1 text-sm font-bold opacity-65">{chatPresetName} · 共 {chatPresetEntries.length} 条 · 已开启 {enabledChatEntries} 条</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {!isBuiltInWechatPreset && (
                <button type="button" onClick={() => setConfirmDeletePreset(true)} className="preset-danger-text-button" aria-label="删除当前预设"><Trash2 className="h-4 w-4" />删除预设</button>
              )}
              <button type="button" onClick={resetCurrentPreset} className="preset-compact-button" aria-label="恢复微信和 QQ 默认预设"><RefreshCw className="h-4 w-4" />恢复默认</button>
            </div>
          </div>

          {confirmDeletePreset && (
            <div className="preset-delete-confirm mt-3" role="alert">
              <span className="min-w-0 flex-1 truncate">删除“{chatPresetName}”并切回小手机短 RP？</span>
              <button type="button" onClick={() => { applyBuiltInWechatPreset(wechatChatPresets[0].name, false); setConfirmDeletePreset(false); }}>确认删除</button>
              <button type="button" onClick={() => setConfirmDeletePreset(false)}>取消</button>
            </div>
          )}

          <Field icon={<Search />} label="正在使用">
            <select value={chatPresetName} onChange={(event) => applyBuiltInWechatPreset(event.target.value)} className="hand-input w-full">
              {!wechatChatPresets.some((preset) => preset.name === chatPresetName) && <option value={chatPresetName}>{chatPresetName}</option>}
              {wechatChatPresets.map((preset) => <option key={preset.name} value={preset.name}>{preset.name}</option>)}
            </select>
            <p className="mt-1 text-[11px] font-bold opacity-55">短 RP 与长 RP 只能选一个；微信和 QQ 会同时切换。导入预设仍会显示在这里。</p>
          </Field>

          <Field icon={<Bot />} label="玩家可调的回复参数">
            <div className="preset-parameter-panel grid gap-4 rounded-2xl border-2 border-black/10 bg-white/45 p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <label className="grid gap-2">
                <span className="flex items-center justify-between gap-3 text-sm font-black">
                  <span>读取聊天记录</span>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={chatContextDepth}
                    onChange={(event) => setModelConfig({ chatContextDepth: clampNumber(Number(event.target.value), 1, 1000) })}
                    className="hand-input w-24 text-center"
                    aria-label="读取聊天记录条数"
                  />
                </span>
                <input type="range" min={1} max={1000} value={chatContextDepth} onChange={(event) => setModelConfig({ chatContextDepth: Number(event.target.value) })} />
                <span className="text-[11px] font-bold leading-5 opacity-55">设置多少就最多读取多少条；记录不足时只读取实际已有的内容，已撤回的消息不发送。</span>
              </label>

              <label className="grid gap-2">
                <span className="flex items-center justify-between gap-3 text-sm font-black">
                  <span>温度</span>
                  <input
                    type="number"
                    min={0.1}
                    max={1.6}
                    step={0.05}
                    value={chatTemperature}
                    onChange={(event) => setModelConfig({ chatTemperature: clampNumber(Number(event.target.value), 0.1, 1.6) })}
                    className="hand-input w-24 text-center"
                    aria-label="聊天温度"
                  />
                </span>
                <input type="range" min={0.1} max={1.6} step={0.05} value={chatTemperature} onChange={(event) => setModelConfig({ chatTemperature: Number(event.target.value) })} />
                <span className="text-[11px] font-bold leading-5 opacity-55">越低越稳定克制，越高越活泼随机；不是回复长度。</span>
              </label>

              <label className="grid gap-2">
                <span className="flex items-center justify-between gap-3 text-sm font-black">
                  <span>最大输出</span>
                  <input
                    type="number"
                    min={120}
                    max={4000}
                    step={20}
                    value={chatMaxTokens}
                    onChange={(event) => setModelConfig({ chatMaxTokens: clampNumber(Number(event.target.value), 120, 4000) })}
                    className="hand-input w-24 text-center"
                    aria-label="最大输出 Token"
                  />
                </span>
                <input type="range" min={120} max={4000} step={20} value={chatMaxTokens} onChange={(event) => setModelConfig({ chatMaxTokens: Number(event.target.value) })} />
                <span className="text-[11px] font-bold leading-5 opacity-55">这是一次回复允许生成的 Token 上限，不是必须写满的字数。太小可能截断正文，调高只代表允许回复更长。</span>
              </label>
            </div>
          </Field>

          <Field icon={<Upload />} label="导入酒馆预设">
            <input ref={presetInputRef} type="file" accept=".json,.txt" onChange={importPresetFile} className="hidden" />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => presetInputRef.current?.click()} className="fetch-button">选择文件</button>
              <button type="button" onClick={importPresetText} className="fetch-button">应用粘贴内容</button>
            </div>
            <textarea
              value={presetImportText}
              onChange={(event) => setPresetImportText(event.target.value)}
              placeholder="也可以粘贴酒馆预设 JSON 或纯文本提示词"
              className="hand-input mt-2 min-h-24 w-full resize-y text-sm"
            />
          </Field>

          {chatPresetEntries.length > 0 ? (
            <>
              <ChatPresetEntriesEditor entries={chatPresetEntries} onChange={(entries) => setChatPresetEntries(entries, chatPresetName)} />
              <details className="mt-4 rounded-2xl border-2 border-black/10 p-3 text-xs dark:border-white/10">
                <summary className="cursor-pointer font-bold">查看已开启条目的发送预览</summary>
                <textarea value={actualChatPresetPreview} readOnly className="hand-input mt-2 min-h-32 w-full resize-y text-sm" />
                <p className="mt-2 font-bold leading-5 opacity-55">这里预览预设条目；角色资料、玩家资料、聊天历史和最后一条消息会在实际发送时按条目位置插入。完整顺序可在“后台日志 → 发送给 AI 的完整文本”查看。</p>
              </details>
            </>
          ) : (
            <Field icon={<FileText />} label="预设内容">
              <textarea
                value={chatPresetPrompt}
                onChange={(event) => setModelConfig({ chatPresetName: '自定义', chatPresetPrompt: event.target.value })}
                className="hand-input min-h-56 w-full resize-y text-sm leading-6"
              />
            </Field>
          )}
        </Panel>
      ) : (
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-black">{activeLabels.appName}</p>
              <p className="mt-1 text-sm font-bold opacity-65">{activeLabels.summary}</p>
            </div>
            <button type="button" onClick={resetCurrentPreset} className="icon-button h-10 w-10 shrink-0" title="恢复这个软件的默认预设" aria-label="恢复这个软件的默认预设">
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>

          <Field icon={<Search />} label="预设名称">
            <input value={activeEntry.name} onChange={(event) => updateActiveEntry({ name: event.target.value })} className="hand-input w-full" />
          </Field>

          <Field icon={<FileText />} label="条目选择">
            <div className="grid gap-2">
              {activePreset.entries.map((entry) => (
                <div key={entry.id} className="preset-entry-card">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => commitEntries(activePreset.entries, entry.id)} aria-pressed={activeEntry.id === entry.id} className={cn('min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left', activeEntry.id === entry.id && 'bg-[#111] text-white')}>
                      <span className="block truncate text-sm font-black">{entry.name}</span>
                      <span className="block truncate text-[10px] font-bold opacity-65">{entry.role === 'system' ? '系统' : entry.role === 'user' ? '用户' : 'AI 助手'} · {entry.prompt.trim() ? `${entry.prompt.trim().length} 字` : '空内容'}</span>
                    </button>
                    <button type="button" onClick={() => setPendingGenericDeleteId(entry.id)} disabled={activePreset.entries.length <= 1} className="preset-delete-button disabled:opacity-30" aria-label={`删除 ${entry.name}`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {pendingGenericDeleteId === entry.id && (
                    <div className="preset-delete-confirm" role="alert">
                      <span className="min-w-0 flex-1 truncate">确定删除“{entry.name}”？</span>
                      <button type="button" onClick={() => deleteGenericEntry(entry.id)}>确认删除</button>
                      <button type="button" onClick={() => setPendingGenericDeleteId(null)}>取消</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addEntry} className="preset-compact-button mt-3 w-full">＋ 新增条目</button>
          </Field>

          <Field icon={<Bot />} label="条目发送身份">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(roleMap) as GeminiPresetRole[]).map((role) => (
                <button key={role} type="button" onClick={() => updateActiveEntry({ role })} aria-pressed={activeEntry.role === role} className={cn('rounded-[12px] border-2 px-2 py-2 text-xs font-black', activeEntry.role === role ? 'border-[#111] bg-[#111] text-white shadow-[2px_2px_0_var(--theme-accent)]' : 'border-black/15 bg-white/60')}>
                  {role === 'system' ? '系统' : role === 'user' ? '用户' : 'AI 助手'}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-bold opacity-60">系统＝规则；用户＝本轮补充；AI 助手＝示例回复。一般规则选“系统”。</p>
            <details className="mt-2 text-[10px] font-bold opacity-60">
              <summary className="cursor-pointer">查看接口角色名称</summary>
              <p className="mt-1">OpenAI：{roleMap[activeEntry.role].openAiRole} · Gemini：{roleMap[activeEntry.role].geminiRole}</p>
            </details>
          </Field>

          <Field icon={<FileText />} label="预设内容">
            <textarea value={activeEntry.prompt} onChange={(event) => updateActiveEntry({ prompt: event.target.value })} className="hand-input min-h-56 w-full resize-y text-sm leading-6" />
          </Field>
        </Panel>
      )}
    </section>
  );
}
