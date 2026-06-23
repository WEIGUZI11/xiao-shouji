import type { Character, GroupChat, QqGroupFile, QqGroupNotice, QqGroupPhoto } from '../../../store';

export interface QqGroupMemberCard {
  characterId: string;
  name: string;
  cardName: string;
}

export function getQqGroupMemberName(characterId: string, characters: Pick<Character, 'id' | 'name'>[]) {
  return characters.find((character) => character.id === characterId)?.name || '群成员';
}

export function createQqGroupFile({
  group,
  characters,
  name,
  now = Date.now(),
}: {
  group: Pick<GroupChat, 'id' | 'memberIds'>;
  characters: Pick<Character, 'id' | 'name'>[];
  name: string;
  now?: number;
}): QqGroupFile {
  const cleanName = name.trim() || '群文件.txt';
  const uploaderId = group.memberIds[0] || characters[0]?.id || 'unknown';
  return {
    id: `qq-file-${now}`,
    name: cleanName,
    uploaderId,
    uploaderName: getQqGroupMemberName(uploaderId, characters),
    sizeLabel: cleanName.endsWith('.png') || cleanName.endsWith('.jpg') ? '图片' : '文档',
    createdAt: now,
  };
}

export function createQqGroupNotice({
  group,
  characters,
  content,
  now = Date.now(),
}: {
  group: Pick<GroupChat, 'id' | 'memberIds'>;
  characters: Pick<Character, 'id' | 'name'>[];
  content: string;
  now?: number;
}): QqGroupNotice {
  const publisherId = group.memberIds[0] || characters[0]?.id || 'unknown';
  return {
    id: `qq-notice-${now}`,
    content: content.trim() || '今晚群里记得看消息。',
    publisherId,
    publisherName: getQqGroupMemberName(publisherId, characters),
    createdAt: now,
    unread: true,
  };
}

export function createQqGroupPhoto({
  group,
  characters,
  title,
  now = Date.now(),
}: {
  group: Pick<GroupChat, 'id' | 'memberIds'>;
  characters: Pick<Character, 'id' | 'name' | 'avatar'>[];
  title: string;
  now?: number;
}): QqGroupPhoto {
  const sourceId = group.memberIds.find((id) => characters.some((character) => character.id === id)) || characters[0]?.id || 'unknown';
  const source = characters.find((character) => character.id === sourceId);
  return {
    id: `qq-photo-${now}`,
    title: title.trim() || '群聊照片',
    sourceMemberId: sourceId,
    sourceMemberName: source?.name || '群成员',
    url: source?.avatar || '',
    createdAt: now,
  };
}

export function buildQqGroupSharedSpace({
  group,
  characters,
}: {
  group: Pick<GroupChat, 'id' | 'name' | 'memberIds' | 'announcement' | 'files' | 'photos' | 'notices' | 'memberCards'>;
  characters: Pick<Character, 'id' | 'name' | 'avatar'>[];
}) {
  const memberNames = new Map(characters.map((character) => [character.id, character.name]));
  const memberCards: QqGroupMemberCard[] = group.memberIds.map((characterId) => ({
    characterId,
    name: memberNames.get(characterId) || '群成员',
    cardName: group.memberCards?.[characterId]?.trim() || memberNames.get(characterId) || '群成员',
  }));

  const files = group.files || [];
  const photos = group.photos || [];
  const notices = group.notices || [];
  return {
    files,
    photos,
    notices,
    memberCards,
    fileCount: files.length,
    photoCount: photos.length,
    unreadNoticeCount: notices.filter((notice) => notice.unread).length,
    cardPreview: memberCards.slice(0, 3).map((card) => card.cardName).join('、') || '还没有群成员',
  };
}
