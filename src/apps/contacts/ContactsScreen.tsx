import { BookOpen, ChevronDown, CircleUserRound, FileText, Image as ImageIcon, Import, MessageCircle, RotateCcw, Shield, Sparkles, Trash2 } from 'lucide-react';
import React, { useRef, useState } from 'react';

import { parseCharacterCard } from '../../lib/charaParser';
import { customImageAccept, readCustomImageFile } from '../../lib/customImage';
import { saveImageAsset } from '../../lib/imageAssetStore';
import type { Character } from '../../store';
import { useAppStore } from '../../store';
import { PersistentImage } from '../../components/PersistentImage';
import { Avatar, Empty, Field, Header, Panel } from '../shared/AppPrimitives';
import { getCharacterScenario, getCharacterSupplementalSystemPrompt } from '../shared/aiText';
import { parseWorldBookDraft, stringifyWorldBookForEditing } from './worldBookText';

function repairMojibake(text: string) {
  if (!/[ÃÂâäåæçèé]/.test(text)) return text;
  try {
    const bytes = Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const originalCjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const decodedCjk = (decoded.match(/[\u4e00-\u9fff]/g) || []).length;
    return decodedCjk > originalCjk ? decoded : text;
  } catch {
    return text;
  }
}

export function ContactsScreen() {
  const { characters, addCharacter, updateCharacter, deleteCharacter, openChat } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('支持导入酒馆 PNG/JSON 角色卡。');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [worldBookDrafts, setWorldBookDrafts] = useState<Record<string, string>>({});
  const character = characters.find((item) => item.id === editingId) || null;

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = (await parseCharacterCard(file)) as Character;
      addCharacter(imported);
      setEditingId(imported.id);
      setStatus(`已导入：${imported.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '导入失败');
    } finally {
      event.target.value = '';
    }
  };

  if (character) {
    const worldBookText = worldBookDrafts[character.id] ?? stringifyWorldBookForEditing(character.worldBook);
    const persistCharacterDraft = () => {
      const draft = worldBookDrafts[character.id];
      if (draft !== undefined) {
        updateCharacter(character.id, { worldBook: parseWorldBookDraft(draft) });
      }
    };
    const saveCharacter = () => {
      persistCharacterDraft();
      setEditingId(null);
    };
    const saveAndOpenWechat = () => {
      persistCharacterDraft();
      openChat(character.id, 'wechat');
    };
    const removeCharacter = () => {
      const confirmed = window.confirm(`确定删除「${character.name}」吗？通讯录、微信聊天、群聊成员、电话、日记、相册、备忘录、音乐等关联记录都会一起删除。`);
      if (!confirmed) return;
      deleteCharacter(character.id);
      setWorldBookDrafts((state) => {
        const next = { ...state };
        delete next[character.id];
        return next;
      });
      setEditingId(null);
      setStatus(`已删除：${character.name}`);
    };
    const updateAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        updateCharacter(character.id, { avatar: String(reader.result || '') });
        setStatus(`已更换头像：${character.name}`);
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    };
    const updateChatBackground = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const reference = await saveImageAsset(await readCustomImageFile(file));
        updateCharacter(character.id, { chatBackgroundImage: reference });
        setStatus(`已更换 ${character.name} 的聊天背景。`);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : '聊天背景保存失败。');
      } finally {
        event.target.value = '';
      }
    };
    return (
      <section className="character-profile-screen h-full overflow-y-auto pb-4">
        <Header title="角色资料" subtitle="人设、世界书和开场白都可以自己改" onSave={saveCharacter} />
        <Panel className="character-profile-panel">
          <div className="mb-2 flex items-center gap-3">
            <Avatar character={character} />
            <div className="min-w-0">
              <p className="text-lg font-black">{character.name}</p>
              <p className="text-xs font-bold opacity-60">导入后停留在资料页，不会强制跳微信</p>
            </div>
          </div>
          <div className="character-avatar-actions">
            <label className="character-avatar-button cursor-pointer">
              <ImageIcon className="h-5 w-5" />
              更换头像
              <input type="file" accept="image/*" onChange={updateAvatar} className="sr-only" />
            </label>
            <button type="button" onClick={() => updateCharacter(character.id, { avatar: '' })} className="character-avatar-button secondary">
              恢复默认
            </button>
          </div>
          <details className="character-appearance-details">
            <summary>
              <span><ImageIcon className="h-5 w-5" />聊天外观</span>
              <small>{character.chatBackgroundImage ? '已为这个角色设置背景' : '跟随当前主题'}</small>
              <ChevronDown className="h-4 w-4 character-appearance-chevron" />
            </summary>
            <div className="character-chat-background-editor">
              <div className="chat-background-preview compact">
                {character.chatBackgroundImage
                  ? <PersistentImage src={character.chatBackgroundImage} alt={`${character.name} 的聊天背景`} />
                  : <div className="chat-background-default-preview"><span>跟随主题</span><i /><i /></div>}
              </div>
              <p>只用于和「{character.name}」的微信、QQ 私聊，不影响其他角色。</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="fetch-button cursor-pointer">
                  <ImageIcon className="h-4 w-4" />
                  选择图片
                  <input type="file" accept={customImageAccept} onChange={updateChatBackground} className="sr-only" />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    updateCharacter(character.id, { chatBackgroundImage: undefined });
                    setStatus(`已恢复 ${character.name} 的主题默认背景。`);
                  }}
                  className="fetch-button"
                  disabled={!character.chatBackgroundImage}
                >
                  <RotateCcw className="h-4 w-4" />恢复默认
                </button>
              </div>
            </div>
          </details>
          <Field icon={<CircleUserRound />} label="名字">
            <input value={character.name} onChange={(event) => updateCharacter(character.id, { name: event.target.value })} className="hand-input w-full" />
          </Field>
          <Field icon={<BookOpen />} label="人设 / Description">
            <textarea value={character.description} onChange={(event) => updateCharacter(character.id, { description: event.target.value })} className="hand-input min-h-20 w-full resize-none" />
          </Field>
          <Field icon={<Sparkles />} label="性格 / Personality">
            <textarea value={character.personality} onChange={(event) => updateCharacter(character.id, { personality: event.target.value })} className="hand-input min-h-20 w-full resize-none" />
          </Field>
          <Field icon={<BookOpen />} label="场景 / Scenario">
            <textarea
              value={getCharacterScenario(character)}
              onChange={(event) => updateCharacter(character.id, {
                scenario: event.target.value,
                ...(typeof character.scenario === 'string' ? {} : { systemPrompt: '' }),
              })}
              className="hand-input min-h-20 w-full resize-none"
            />
          </Field>
          <Field icon={<MessageCircle />} label="聊天示例 / Example">
            <textarea value={character.messageExamples || ''} onChange={(event) => updateCharacter(character.id, { messageExamples: event.target.value })} className="hand-input min-h-20 w-full resize-none" />
          </Field>
          <Field icon={<MessageCircle />} label="开场白">
            <textarea value={character.firstMessage} onChange={(event) => updateCharacter(character.id, { firstMessage: event.target.value })} className="hand-input min-h-20 w-full resize-none" />
          </Field>
          <Field icon={<Shield />} label="系统提示词">
            <textarea
              value={getCharacterSupplementalSystemPrompt(character)}
              onChange={(event) => updateCharacter(character.id, {
                scenario: getCharacterScenario(character),
                systemPrompt: event.target.value,
              })}
              className="hand-input min-h-20 w-full resize-none"
              placeholder="通常可以留空。只有想额外固定说话边界、禁忌、世界规则时再写，不用把整张角色卡粘进来。"
            />
            <p className="mt-1 text-[11px] font-bold leading-5 opacity-55">这里会叠加在角色卡后面，适合写临时补充规则。</p>
          </Field>
          <Field icon={<FileText />} label="世界书">
            <textarea
              value={worldBookText}
              onChange={(event) => setWorldBookDrafts((state) => ({ ...state, [character.id]: event.target.value }))}
              className="hand-input min-h-28 w-full resize-y text-sm leading-6"
            />
          </Field>
          <div className="character-profile-actions">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={saveAndOpenWechat} className="fetch-button">保存并聊天</button>
              <button onClick={saveCharacter} className="fetch-button bg-[#fff0bd]">返回列表</button>
            </div>
            <button type="button" onClick={removeCharacter} className="character-profile-delete-button">
              <Trash2 className="h-5 w-5" />
              删除角色
            </button>
          </div>
        </Panel>
      </section>
    );
  }

  return (
    <section className="h-full overflow-y-auto pb-8">
      <Header title="通讯录" subtitle={status} />
      <Panel>
        <button onClick={() => inputRef.current?.click()} className="fetch-button">
          <Import className="h-5 w-5" />
          导入酒馆卡
        </button>
        <input ref={inputRef} type="file" accept=".png,.json" onChange={importFile} className="hidden" />
      </Panel>
      <Panel>
        {characters.length === 0 && <Empty text="导入后，这里会成为 char 的通讯录。" />}
        {characters.map((item) => (
          <button key={item.id} onClick={() => setEditingId(item.id)} className="list-row">
            <Avatar character={item} />
            <div className="min-w-0 flex-1 text-left">
              <p className="text-lg font-black">{item.name}</p>
              <p className="truncate text-sm font-bold opacity-60">{item.description || item.personality || '酒馆卡角色'}</p>
            </div>
          </button>
        ))}
      </Panel>
    </section>
  );
}
