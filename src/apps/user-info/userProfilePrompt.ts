export interface UserProfile {
  sendToAi: boolean;
  identity: string;
  location: string;
  personality: string;
  likes: string;
  boundaries: string;
  relationship: string;
  longTermMemory: string;
}

export interface UserProfilePreset {
  id: string;
  name: string;
  profile: UserProfile;
  updatedAt: number;
}

export type UserProfileCharacterBindings = Record<string, string>;

export const defaultUserProfile: UserProfile = {
  sendToAi: true,
  identity: '',
  location: '',
  personality: '',
  likes: '',
  boundaries: '',
  relationship: '',
  longTermMemory: '',
};

export const defaultUserProfilePresetId = 'user-default';

export function normalizeUserProfile(profile: Partial<UserProfile> | undefined): UserProfile {
  return { ...defaultUserProfile, ...(profile && typeof profile === 'object' ? profile : {}) };
}

export function buildUserProfilePrompt(userName: string, profile: Partial<UserProfile> | undefined) {
  const safeProfile = normalizeUserProfile(profile);
  if (!safeProfile.sendToAi) return '';

  const lines = [
    ['昵称', userName],
    ['身份', safeProfile.identity],
    ['所在地/生活环境', safeProfile.location],
    ['性格', safeProfile.personality],
    ['喜好', safeProfile.likes],
    ['雷点/禁区', safeProfile.boundaries],
    ['关系设定', safeProfile.relationship],
    ['长期记忆', safeProfile.longTermMemory],
  ]
    .map(([label, value]) => [label, String(value || '').trim()] as const)
    .filter(([, value]) => value.length > 0)
    .map(([label, value]) => `${label}：${value}`);

  if (lines.length === 0) return '';

  const prompt = ['用户信息：', ...lines].join('\n');
  return prompt.length > 1800 ? `${prompt.slice(0, 1792)}……` : prompt;
}

export function resolveUserProfileForCharacter({
  characterId,
  activeUserName,
  activeUserProfile,
  userProfiles,
  bindings,
}: {
  characterId?: string | null;
  activeUserName: string;
  activeUserProfile: Partial<UserProfile> | undefined;
  userProfiles: UserProfilePreset[];
  bindings: UserProfileCharacterBindings;
}) {
  const boundUserProfileId = characterId ? bindings[characterId] : '';
  const boundPreset = boundUserProfileId
    ? userProfiles.find((preset) => preset.id === boundUserProfileId)
    : undefined;
  if (boundPreset) {
    return {
      id: boundPreset.id,
      name: boundPreset.name,
      profile: normalizeUserProfile(boundPreset.profile),
      bound: true,
    };
  }

  return {
    id: '',
    name: activeUserName,
    profile: normalizeUserProfile(activeUserProfile),
    bound: false,
  };
}
