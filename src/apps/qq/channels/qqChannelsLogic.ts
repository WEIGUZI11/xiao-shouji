export interface QqChannelLike {
  id: string;
  name: string;
  description: string;
  topic: string;
  followed: boolean;
  createdAt: number;
  color: string;
}

export interface QqChannelMessageLike {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  imageUrl?: string;
  createdAt: number;
}

export interface QqChannelRow extends QqChannelLike {
  lastMessageText: string;
  lastUpdated: number;
  messageCount: number;
}

export interface QqChannelPersonaCharacter {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  personality?: string;
  firstMessage?: string;
}

export interface QqPersonaCharacterLike {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  personality?: string;
  firstMessage?: string;
  imagePromptTags?: string;
}

function compactText(value?: string, maxLength = 28) {
  const clean = value?.replace(/\s+/g, ' ').trim() || '';
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
}

function buildPersonaLine(character: QqPersonaCharacterLike) {
  return compactText(character.description)
    || compactText(character.personality)
    || compactText(character.firstMessage)
    || character.name;
}

export function getDefaultQqChannels(createdAt = Date.now()): QqChannelLike[] {
  return [
    {
      id: 'qq-channel-life',
      name: '日常闲聊',
      description: '像真实 QQ 频道一样，随手发一句正在发生的事。',
      topic: '生活',
      followed: true,
      createdAt,
      color: '#dff0ff',
    },
    {
      id: 'qq-channel-role',
      name: '角色小圈子',
      description: '角色们的频道广播、碎碎念和小型讨论。',
      topic: '角色日常',
      followed: false,
      createdAt: createdAt + 1,
      color: '#efe5ff',
    },
    {
      id: 'qq-channel-assets',
      name: '素材分享',
      description: '保存图、设定、灵感和聊天里冒出来的点子。',
      topic: '素材',
      followed: true,
      createdAt: createdAt + 2,
      color: '#fff4cc',
    },
  ];
}

export function buildQqChannelMessage(message: Omit<QqChannelMessageLike, 'id'> & Partial<Pick<QqChannelMessageLike, 'id'>>) {
  return {
    ...message,
    id: message.id || `qq-channel-message-${message.channelId}-${message.createdAt}`,
    content: message.content.trim(),
  };
}

export function buildPersonaQqChannelMessageDraft({
  channel,
  character,
  createdAt = Date.now(),
}: {
  channel: Pick<QqChannelLike, 'id' | 'topic' | 'name'>;
  character: QqPersonaCharacterLike;
  createdAt?: number;
}): Omit<QqChannelMessageLike, 'id'> {
  const personaLine = buildPersonaLine(character);
  const personality = compactText(character.personality, 24);
  const opener = compactText(character.firstMessage, 26);
  const contentByTopic: Record<string, string> = {
    生活: `${personaLine}这边上线冒个泡。${opener ? `刚想说：“${opener}”。` : '今天也在。'}`,
    角色日常: `${personality || personaLine}，所以我在「${channel.name}」留一句：${opener || '别只看着，回个话。'}`,
    素材: character.imagePromptTags
      ? `素材关键词存一下：${compactText(character.imagePromptTags, 36)}。${personaLine}`
      : `${personaLine}可以收进素材夹，之后做图或写设定都用得上。`,
  };
  return {
    channelId: channel.id,
    authorId: character.id,
    authorName: character.name,
    authorAvatar: character.avatar,
    content: contentByTopic[channel.topic] || `${personaLine}在「${channel.name}」发了一条符合自己状态的消息。${opener}`,
    createdAt,
  };
}

export function buildQqChannelRows({
  channels,
  messages,
}: {
  channels: QqChannelLike[];
  messages: QqChannelMessageLike[];
}): QqChannelRow[] {
  return channels
    .map((channel) => {
      const channelMessages = messages
        .filter((message) => message.channelId === channel.id)
        .sort((a, b) => b.createdAt - a.createdAt);
      const lastMessage = channelMessages[0];
      return {
        ...channel,
        lastMessageText: lastMessage?.content || '还没有消息，发一条频道动态吧。',
        lastUpdated: lastMessage?.createdAt || channel.createdAt,
        messageCount: channelMessages.length,
      };
    })
    .sort((a, b) =>
      Number(Boolean(b.messageCount)) - Number(Boolean(a.messageCount))
      || b.lastUpdated - a.lastUpdated
      || Number(b.followed) - Number(a.followed)
      || a.createdAt - b.createdAt,
    );
}
