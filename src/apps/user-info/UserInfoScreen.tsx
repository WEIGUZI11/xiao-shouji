import { Camera, Check, CircleUserRound, Heart, Home, Link2, MapPin, Plus, Shield, Sparkles, ToggleLeft, ToggleRight, Trash2, UserRound } from 'lucide-react';
import React, { useRef, useState } from 'react';

import { useAppStore } from '../../store';
import { Field, Header, Panel } from '../shared/AppPrimitives';
import {
  buildUserProfileDeleteMessage,
  buildUserProfileDeleteTitle,
  getUserProfileDisplayName,
  normalizeUserAvatarReaderResult,
} from './userProfileUi';

type DeleteCandidate = {
  id: string;
  name: string;
};

function ProfileTextarea({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ReactNode;
}) {
  return (
    <Field icon={icon} label={label}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="hand-input min-h-20 w-full resize-none text-sm leading-6"
      />
    </Field>
  );
}

export function UserInfoScreen() {
  const {
    userName,
    userAvatar,
    userProfile,
    userProfiles,
    activeUserProfileId,
    characters,
    userProfileCharacterBindings,
    setUserName,
    setUserAvatar,
    setUserProfile,
    addUserProfilePreset,
    selectUserProfilePreset,
    deleteUserProfilePreset,
    bindUserProfileToCharacter,
  } = useAppStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<DeleteCandidate | null>(null);

  const addProfile = () => {
    const id = addUserProfilePreset();
    selectUserProfilePreset(id);
    setDeleteCandidate(null);
  };

  const requestDeleteProfile = (id: string, name: string) => {
    setDeleteCandidate({ id, name: getUserProfileDisplayName(name) });
  };

  const confirmDeleteProfile = () => {
    if (!deleteCandidate) return;
    deleteUserProfilePreset(deleteCandidate.id);
    setDeleteCandidate(null);
  };

  const replaceUserAvatar = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextAvatar = normalizeUserAvatarReaderResult(reader.result);
      if (!nextAvatar) return;
      setUserAvatar(nextAvatar);
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="no-scrollbar flex h-full flex-col overflow-y-auto pb-6">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          replaceUserAvatar(event.currentTarget.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
      <Header title="User信息" subtitle={userProfile.sendToAi ? '会发送给 AI' : '仅保存在本机'} />

      <Panel className="p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-black opacity-65">玩家档案</p>
            <p className="truncate text-xs font-bold opacity-50">多 user / 多玩家设定会跟随当前档案发送给 AI</p>
          </div>
          <button type="button" onClick={addProfile} className="app-chip" aria-label="新增玩家档案">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2">
          {userProfiles.map((profile) => {
            const active = profile.id === activeUserProfileId;
            const profileName = getUserProfileDisplayName(profile.name);
            return (
              <div
                key={profile.id}
                className={`flex min-h-14 items-stretch gap-2 rounded-xl border-[2px] px-2 py-2 text-sm font-black transition ${
                  active
                    ? 'border-[#111] bg-[var(--accent)] text-[#111] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.65)]'
                    : 'border-[#111]/15 bg-white/75 text-[#111]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    selectUserProfilePreset(profile.id);
                    setDeleteCandidate(null);
                  }}
                  aria-pressed={active}
                  className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition active:scale-[0.99]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${active ? 'bg-[#3d7ee8]' : 'bg-[#111]/20'}`} />
                    <span className="min-w-0 truncate">{profileName}</span>
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-[#111]/15 px-2 py-1 text-[11px] ${
                      active ? 'bg-white/80 text-[#111]' : 'bg-[#111]/10 text-[#111]/55'
                    }`}
                  >
                    {active && <Check className="h-3.5 w-3.5" />}
                    {active ? '当前' : '切换'}
                  </span>
                </button>

                {userProfiles.length > 1 && (
                  <button
                    type="button"
                    aria-label={`删除${profileName}档案`}
                    onClick={() => requestDeleteProfile(profile.id, profile.name)}
                    className="inline-flex min-h-12 w-11 shrink-0 items-center justify-center rounded-lg bg-[#ffe0e0] text-[#9d1f1f] transition active:scale-95"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {deleteCandidate && (
          <div
            role="alertdialog"
            aria-modal="false"
            aria-labelledby="user-profile-delete-title"
            className="mb-4 rounded-[18px] border-[2px] border-[#111] bg-[#fff3f3] p-3 shadow-[4px_4px_0_rgba(17,17,17,0.18)]"
          >
            <p id="user-profile-delete-title" className="text-sm font-black text-[#8f1d1d]">
              {buildUserProfileDeleteTitle(deleteCandidate.name)}
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-[#111]/70">{buildUserProfileDeleteMessage(deleteCandidate.name)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="rounded-xl border-[2px] border-[#111]/20 bg-white px-3 py-2 text-sm font-black"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDeleteProfile}
                className="rounded-xl border-[2px] border-[#111] bg-[#ffdddd] px-3 py-2 text-sm font-black text-[#9d1f1f]"
              >
                确认删除
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border-[3px] border-[#111] bg-white transition active:scale-95"
            aria-label="更换玩家头像"
          >
            {userAvatar ? (
              <img src={userAvatar} alt="玩家头像" className="h-full w-full object-cover" />
            ) : (
              <CircleUserRound className="h-10 w-10 opacity-60" />
            )}
            <span className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full border-[2px] border-[#111] bg-white shadow-[0_2px_0_rgba(17,17,17,0.18)]">
              <Camera className="h-3.5 w-3.5" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <Field icon={<UserRound />} label="昵称">
              <input
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
                className="hand-input w-full text-base font-black"
                placeholder="我"
              />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="mb-3 flex items-start gap-2">
          <Link2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="text-base font-black">角色绑定</p>
            <p className="text-xs font-bold leading-5 opacity-55">绑定后，和该角色聊天、语音或视频时会自动使用指定 user 信息。</p>
          </div>
        </div>

        {characters.length > 0 ? (
          <div className="grid gap-2">
            {characters.map((character) => {
              const boundUserProfileId = userProfileCharacterBindings[character.id] || '';
              return (
                <label key={character.id} className="grid gap-1 rounded-2xl border-[2px] border-[#111]/15 bg-white/75 p-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-black">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#3d7ee8]" />
                    <span className="truncate">{character.name}</span>
                  </span>
                  <select
                    value={boundUserProfileId}
                    onChange={(event) => bindUserProfileToCharacter(character.id, event.target.value || null)}
                    className="hand-input w-full text-sm font-black"
                  >
                    <option value="">跟随当前 user</option>
                    {userProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {getUserProfileDisplayName(profile.name)}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border-[2px] border-dashed border-[#111]/20 bg-white/60 p-3 text-sm font-bold opacity-60">
            还没有角色。导入或创建角色后，就可以在这里绑定对应 user 档案。
          </p>
        )}
      </Panel>

      <Panel>
        <button
          type="button"
          onClick={() => setUserProfile({ sendToAi: !userProfile.sendToAi })}
          className="fetch-button w-full justify-between"
        >
          <span className="flex items-center gap-2">
            {userProfile.sendToAi ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
            发送给 AI
          </span>
          <span>{userProfile.sendToAi ? '开启' : '关闭'}</span>
        </button>
      </Panel>

      <Panel>
        <ProfileTextarea
          icon={<CircleUserRound />}
          label="年龄或身份"
          value={userProfile.identity}
          onChange={(value) => setUserProfile({ identity: value })}
          placeholder="例如：成年创作者 / 大学生 / 上班族"
        />
        <ProfileTextarea
          icon={<MapPin />}
          label="所在地或生活环境"
          value={userProfile.location}
          onChange={(value) => setUserProfile({ location: value })}
          placeholder="例如：南方城市，夜猫子作息"
        />
        <ProfileTextarea
          icon={<Sparkles />}
          label="性格"
          value={userProfile.personality}
          onChange={(value) => setUserProfile({ personality: value })}
          placeholder="例如：慢热，嘴硬但心软"
        />
        <ProfileTextarea
          icon={<Heart />}
          label="喜好"
          value={userProfile.likes}
          onChange={(value) => setUserProfile({ likes: value })}
          placeholder="例如：雨天、甜饮、被认真回应"
        />
        <ProfileTextarea
          icon={<Shield />}
          label="雷点或禁区"
          value={userProfile.boundaries}
          onChange={(value) => setUserProfile({ boundaries: value })}
          placeholder="例如：不要替我决定现实行动"
        />
        <ProfileTextarea
          icon={<Home />}
          label="和 char 的关系"
          value={userProfile.relationship}
          onChange={(value) => setUserProfile({ relationship: value })}
          placeholder="例如：暧昧期室友 / 旧友重逢"
        />
        <ProfileTextarea
          icon={<Sparkles />}
          label="长期记忆"
          value={userProfile.longTermMemory}
          onChange={(value) => setUserProfile({ longTermMemory: value })}
          placeholder="写希望 AI 长期记住的事实"
        />
      </Panel>
    </section>
  );
}
