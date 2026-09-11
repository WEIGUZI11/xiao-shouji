export type PendingChatDraftKind =
  | 'text'
  | 'voice'
  | 'image'
  | 'sticker'
  | 'call-note'
  | 'theater'
  | 'transfer'
  | 'red-packet'
  | 'shopping';

export type PendingChatDraftLike = {
  kind: PendingChatDraftKind;
};

export interface AutoReplyActionOptions {
  triggerType?: 'manual_upload' | 'manual_generated_image' | 'proactive_generated_image';
}

export type ManualReplySendIntent = 'queue-user-message' | 'request-assistant-reply' | 'idle';

export function shouldAutoReplyAfterUserAction(kind: PendingChatDraftKind, options: AutoReplyActionOptions = {}) {
  void kind;
  void options;
  return false;
}

export function getManualReplySendIntent({ content, pendingDraftCount }: { content: string; pendingDraftCount: number }): ManualReplySendIntent {
  if (content.trim()) return 'queue-user-message';
  return pendingDraftCount > 0 ? 'request-assistant-reply' : 'idle';
}

export function shouldSubmitChatComposerKey({ key, shiftKey }: { key: string; shiftKey: boolean }) {
  void key;
  void shiftKey;
  return false;
}

export function getPendingResponseMode(drafts: PendingChatDraftLike[]): 'text' | 'voice' {
  return drafts.some((draft) => draft.kind === 'voice') ? 'voice' : 'text';
}
