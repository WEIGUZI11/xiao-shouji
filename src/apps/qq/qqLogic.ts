import type { Character, ChatMessage, ChatSession, GroupChat } from '../../store';

export type QqTabId = 'messages' | 'channels' | 'contacts' | 'dynamic';

export const QQ_TABS: { id: QqTabId; label: string }[] = [
  { id: 'messages', label: '消息' },
  { id: 'channels', label: '频道' },
  { id: 'contacts', label: '联系人' },
  { id: 'dynamic', label: '动态' },
];

export type QqTopActionId = 'add-friend' | 'create-group' | 'scan' | 'create-channel';

export const QQ_TOP_ACTIONS: { id: QqTopActionId; label: string }[] = [
  { id: 'add-friend', label: '加好友' },
  { id: 'create-group', label: '发起群聊' },
  { id: 'scan', label: '扫一扫' },
  { id: 'create-channel', label: '创建频道' },
];

export interface QqHomeRow {
  targetId: string;
  type: 'friend' | 'group';
  characterId: string;
  name: string;
  avatar?: string;
  memberCount?: number;
  memberPreview?: string;
  announcement?: string;
  isPinned?: boolean;
  pinnedAt?: number;
  lastMessageText: string;
  lastUpdated: number;
  hasSession: boolean;
  unread: number;
}

export interface QqGroupRow {
  id: string;
  name: string;
  memberCount: number;
  memberPreview: string;
  createdAt: number;
}

export interface QqInfoRow {
  title: string;
  desc: string;
}

export interface QqMessageShortcut {
  id: 'friend-requests' | 'mentions' | 'group-notices';
  title: string;
  preview: string;
  count: number;
  targetId?: string;
}

export interface QqProfileAction {
  id: 'chat' | 'voice' | 'video' | 'dynamic';
  label: string;
}

function describeQqPreview(message?: Pick<ChatMessage, 'content' | 'kind' | 'stickerLabel' | 'transcript'>) {
  if (!message) return '';
  if (message.kind === 'sticker') return message.stickerLabel ? `表情包：${message.stickerLabel}` : '表情包';
  if (message.kind === 'image') return '图片';
  if (message.kind === 'voice') return message.transcript || message.content || '语音条';
  if (message.kind === 'transfer') return '转账';
  if (message.kind === 'red-packet') return '红包';
  if (message.kind === 'shopping') return message.content || '购物';
  if (message.kind === 'call-note') return message.content || '通话记录';
  return message.content;
}

export function buildQqHomeRows({
  characters,
  groupChats = [],
  pinnedChatIds = {},
  chatSessions,
}: {
  characters: Pick<Character, 'id' | 'name' | 'avatar' | 'firstMessage'>[];
  groupChats?: Pick<GroupChat, 'id' | 'name' | 'memberIds' | 'createdAt' | 'announcement'>[];
  pinnedChatIds?: Record<string, number>;
  chatSessions: Record<string, Pick<ChatSession, 'characterId' | 'channel' | 'messages' | 'lastUpdated' | 'unread'>>;
}): QqHomeRow[] {
  const qqSessionsByTarget = new Map(
    Object.values(chatSessions)
      .filter((session) => session.channel === 'qq')
      .map((session) => [session.characterId, session]),
  );
  const namesById = new Map(characters.map((character) => [character.id, character.name]));

  const friendRows = characters.map((character) => {
    const session = qqSessionsByTarget.get(character.id);
    const lastMessage = session?.messages.at(-1);
    return {
      targetId: character.id,
      type: 'friend' as const,
      characterId: character.id,
      name: character.name,
      avatar: character.avatar,
      isPinned: Boolean(pinnedChatIds[`qq:${character.id}`]),
      pinnedAt: pinnedChatIds[`qq:${character.id}`] || 0,
      lastMessageText: describeQqPreview(lastMessage) || character.firstMessage || '点开建立 QQ 聊天',
      lastUpdated: session?.lastUpdated || 0,
      hasSession: Boolean(session),
      unread: session?.unread || 0,
    };
  });

  const groupRows = groupChats.map((group) => {
    const session = qqSessionsByTarget.get(group.id);
    const lastMessage = session?.messages.at(-1);
    const memberNames = group.memberIds
      .map((id) => namesById.get(id))
      .filter((name): name is string => Boolean(name));
    const memberPreview = memberNames.slice(0, 4).join('、') || '暂无成员名';
    const announcement = group.announcement?.trim() || '';
    return {
      targetId: group.id,
      type: 'group' as const,
      characterId: group.id,
      name: group.name,
      memberCount: group.memberIds.length,
      memberPreview,
      announcement,
      isPinned: Boolean(pinnedChatIds[`qq:${group.id}`]),
      pinnedAt: pinnedChatIds[`qq:${group.id}`] || 0,
      lastMessageText: describeQqPreview(lastMessage) || announcement || '群聊已创建，可以开始聊天',
      lastUpdated: session?.lastUpdated || group.createdAt,
      hasSession: Boolean(session),
      unread: session?.unread || 0,
    };
  });

  return [...friendRows, ...groupRows]
    .sort((a, b) =>
      Number(b.isPinned) - Number(a.isPinned)
      || (b.pinnedAt || 0) - (a.pinnedAt || 0)
      || Number(b.hasSession) - Number(a.hasSession)
      || b.lastUpdated - a.lastUpdated
      || a.name.localeCompare(b.name, 'zh-Hans-CN'),
    );
}

export function getQqEmptyStateText(characterCount: number) {
  return characterCount === 0
    ? '还没有角色。先去通讯录导入 PNG/JSON 酒馆卡。'
    : '还没有 QQ 会话，找个好友聊一句吧。';
}

export function getQqGroupEmptyStateText(characterCount: number) {
  return characterCount === 0
    ? '先导入联系人，再在 QQ 联系人里拉一个群。'
    : '还没有 QQ 群聊，点右上角发起群聊。';
}

export function buildQqGroupRows({
  groupChats,
  characters,
}: {
  groupChats: Pick<GroupChat, 'id' | 'name' | 'memberIds' | 'createdAt'>[];
  characters: Pick<Character, 'id' | 'name'>[];
}): QqGroupRow[] {
  const namesById = new Map(characters.map((character) => [character.id, character.name]));
  return groupChats
    .map((group) => {
      const memberNames = group.memberIds
        .map((id) => namesById.get(id))
        .filter((name): name is string => Boolean(name));
      return {
        id: group.id,
        name: group.name,
        memberCount: group.memberIds.length,
        memberPreview: memberNames.slice(0, 4).join('、') || '暂无成员名',
        createdAt: group.createdAt,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt || a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

export function filterQqHomeRows(rows: QqHomeRow[], query: string) {
  const keyword = query.trim().toLocaleLowerCase('zh-CN');
  if (!keyword) return rows;
  return rows.filter((row) =>
    [row.name, row.lastMessageText, row.memberPreview || '', row.announcement || ''].some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword)),
  );
}

export function buildQqMessageShortcuts({
  userName,
  characters,
  groupChats = [],
  chatSessions,
}: {
  userName: string;
  characters: Pick<Character, 'id' | 'name'>[];
  groupChats?: Pick<GroupChat, 'id' | 'name' | 'memberIds' | 'announcement' | 'notices'>[];
  chatSessions: Record<string, Pick<ChatSession, 'characterId' | 'channel' | 'messages' | 'unread' | 'lastUpdated'>>;
}): QqMessageShortcut[] {
  const qqSessionsByTarget = new Map(
    Object.values(chatSessions)
      .filter((session) => session.channel === 'qq')
      .map((session) => [session.characterId, session]),
  );
  const friendRequestCount = characters.filter((character) => !qqSessionsByTarget.has(character.id)).length;
  const groupNames = new Map(groupChats.map((group) => [group.id, group.name]));
  const mentionTokens = ['@我', userName.trim() ? `@${userName.trim()}` : ''].filter(Boolean);
  const mentionMatches = Object.values(chatSessions)
    .filter((session) => session.channel === 'qq' && groupNames.has(session.characterId))
    .flatMap((session) =>
      session.messages
        .filter((message) => mentionTokens.some((token) => message.content.includes(token)))
        .map((message) => ({
          targetId: session.characterId,
          groupName: groupNames.get(session.characterId) || '群聊',
          text: describeQqPreview(message),
          timestamp: message.timestamp,
        })),
    )
    .sort((a, b) => b.timestamp - a.timestamp);
  const unreadGroupNotices = groupChats.flatMap((group) =>
    (group.notices || [])
      .filter((notice) => notice.unread)
      .map((notice) => ({
        targetId: group.id,
        groupName: group.name,
        text: notice.content,
        timestamp: notice.createdAt,
      })),
  ).sort((a, b) => b.timestamp - a.timestamp);

  return [
    {
      id: 'friend-requests',
      title: '好友验证',
      preview: friendRequestCount > 0 ? `${friendRequestCount} 位角色还没有建立 QQ 会话` : '暂无新的好友验证',
      count: friendRequestCount,
    },
    {
      id: 'mentions',
      title: '@我',
      preview: mentionMatches[0] ? `${mentionMatches[0].groupName}：${mentionMatches[0].text}` : '暂无群聊提到你',
      count: mentionMatches.length,
      targetId: mentionMatches[0]?.targetId,
    },
    {
      id: 'group-notices',
      title: '群通知',
      preview: unreadGroupNotices[0] ? `${unreadGroupNotices[0].groupName}：${unreadGroupNotices[0].text}` : '暂无未读群通知',
      count: unreadGroupNotices.length,
      targetId: unreadGroupNotices[0]?.targetId,
    },
  ];
}

export function getQqTabLabel(tabId: QqTabId) {
  return QQ_TABS.find((tab) => tab.id === tabId)?.label || '消息';
}

export function buildQqHeaderSummary({
  userName,
  userAvatar,
}: {
  userName: string;
  userAvatar: string | null;
}) {
  return {
    name: userName.trim() || '我',
    status: '手机在线',
    avatar: userAvatar || '',
  };
}

export function buildQqProfileSummary(
  character: Pick<Character, 'id' | 'name' | 'avatar' | 'description' | 'personality' | 'firstMessage'>,
) {
  const signature = character.personality || character.firstMessage || character.description || '这个人还没有留下个性签名。';
  return {
    id: character.id,
    name: character.name,
    avatar: character.avatar,
    subtitle: character.description || character.personality || character.firstMessage || 'QQ 联系人',
    startChatLabel: '发 QQ 消息',
    backLabel: '返回联系人',
    actions: [
      { id: 'chat', label: '发消息' },
      { id: 'voice', label: '语音通话' },
      { id: 'video', label: '视频通话' },
      { id: 'dynamic', label: '看动态' },
    ] satisfies QqProfileAction[],
    details: [
      { title: character.name, label: '昵称' },
      { title: signature, label: '个性签名' },
      { title: character.description || '未填写', label: '资料备注' },
    ],
  };
}

export function buildQqGroupProfileSummary({
  group,
  characters,
}: {
  group: Pick<GroupChat, 'id' | 'name' | 'memberIds' | 'announcement'>;
  characters: Pick<Character, 'id' | 'name'>[];
}) {
  const namesById = new Map(characters.map((character) => [character.id, character.name]));
  const memberNames = group.memberIds
    .map((id) => namesById.get(id))
    .filter((name): name is string => Boolean(name));
  return {
    id: group.id,
    name: group.name,
    memberCount: group.memberIds.length,
    memberPreview: memberNames.slice(0, 4).join('、') || '暂无成员名',
    memberNames,
    announcement: group.announcement?.trim() || '还没有群公告。',
  };
}

export function buildQqDeviceRows(): QqInfoRow[] {
  return [
    { title: '我的电脑', desc: '之后可以从这里发送文件、图片和聊天记录。' },
    { title: '文件助手', desc: '保存 QQ 群文件、角色发来的图片和导入资源。' },
    { title: 'QQ邮箱提醒', desc: '之后接收系统通知、验证邮件和角色留言。' },
  ];
}

export function buildQqPhonebookRows({
  userName,
  characterCount,
}: {
  userName: string;
  characterCount: number;
}): QqInfoRow[] {
  return [
    { title: userName.trim() || '我', desc: '当前小手机用户资料。' },
    { title: 'QQ好友同步', desc: `已同步 ${characterCount} 位角色联系人。` },
    { title: '手机联系人', desc: '之后可以把本机通讯录和 QQ 联系人分开管理。' },
  ];
}
