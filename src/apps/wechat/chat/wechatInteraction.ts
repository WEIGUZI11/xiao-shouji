import type { ChatMessage } from '../../../store';
export type {
  AutoReplyActionOptions,
  PendingChatDraftKind,
  PendingChatDraftLike,
} from './manualReply';
export {
  getManualReplySendIntent,
  getPendingResponseMode,
  shouldSubmitChatComposerKey,
  shouldAutoReplyAfterUserAction,
} from './manualReply';
export { parseOpenMojiEmotionText } from './openMojiEmotion';

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
