import type { ChatMessage } from '../../../store';

export type PendingChatDraftKind =
  | 'text'
  | 'voice'
  | 'image'
  | 'sticker'
  | 'call-note'
  | 'transfer'
  | 'red-packet'
  | 'shopping';

export type PendingChatDraftLike = {
  kind: PendingChatDraftKind;
};

export interface AutoReplyActionOptions {
  triggerType?: 'manual_upload' | 'manual_generated_image' | 'proactive_generated_image';
}

export function shouldAutoReplyAfterUserAction(kind: PendingChatDraftKind, options: AutoReplyActionOptions = {}) {
  if (kind === 'image' && options.triggerType === 'manual_generated_image') return false;
  if (kind === 'image' && options.triggerType === 'proactive_generated_image') return false;
  return kind === 'text'
    || kind === 'voice'
    || kind === 'image'
    || kind === 'sticker'
    || kind === 'transfer'
    || kind === 'red-packet'
    || kind === 'shopping';
}

export function getPendingResponseMode(drafts: PendingChatDraftLike[]): 'text' | 'voice' {
  return drafts.some((draft) => draft.kind === 'voice') ? 'voice' : 'text';
}

export function getCallScreenForType(type: 'voice' | 'video') {
  return type === 'voice' ? 'voice-call' : 'video';
}

export function canAcceptLifeCard(message: Pick<ChatMessage, 'role' | 'kind' | 'status'>) {
  return message.role === 'model'
    && (message.kind === 'transfer' || message.kind === 'red-packet')
    && message.status !== 'accepted';
}

export function getReplyHistoryMessages<T extends { id: string }>(
  messages: T[],
  drafts: Array<{ sourceMessageId?: string }>,
) {
  const pendingMessageIds = new Set(drafts.map((draft) => draft.sourceMessageId).filter(Boolean));
  if (pendingMessageIds.size === 0) return messages;
  return messages.filter((message) => !pendingMessageIds.has(message.id));
}
