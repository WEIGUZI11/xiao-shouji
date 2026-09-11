import assert from 'node:assert/strict';
import {
  canAcceptLifeCard,
  getCallScreenForType,
  getManualReplySendIntent,
  getReplyHistoryMessages,
  getPendingResponseMode,
  shouldSubmitChatComposerKey,
  shouldAutoReplyAfterUserAction,
} from './wechatInteraction';

assert.equal(shouldAutoReplyAfterUserAction('text'), false);
assert.equal(shouldAutoReplyAfterUserAction('voice'), false);
assert.equal(shouldAutoReplyAfterUserAction('sticker'), false);
assert.equal(shouldAutoReplyAfterUserAction('transfer'), false);
assert.equal(shouldAutoReplyAfterUserAction('red-packet'), false);
assert.equal(shouldAutoReplyAfterUserAction('shopping'), false);
assert.equal(shouldAutoReplyAfterUserAction('image'), false);
assert.equal(shouldAutoReplyAfterUserAction('image', { triggerType: 'manual_generated_image' }), false);

assert.equal(getPendingResponseMode([{ kind: 'text' }, { kind: 'voice' }]), 'voice');
assert.equal(getPendingResponseMode([{ kind: 'sticker' }, { kind: 'transfer' }]), 'text');

assert.equal(getManualReplySendIntent({ content: '我先说一句', pendingDraftCount: 0 }), 'queue-user-message');
assert.equal(getManualReplySendIntent({ content: '第二句', pendingDraftCount: 1 }), 'queue-user-message');
assert.equal(getManualReplySendIntent({ content: '', pendingDraftCount: 2 }), 'request-assistant-reply');
assert.equal(getManualReplySendIntent({ content: '   ', pendingDraftCount: 0 }), 'idle');

assert.equal(shouldSubmitChatComposerKey({ key: 'Enter', shiftKey: false }), false);
assert.equal(shouldSubmitChatComposerKey({ key: 'Enter', shiftKey: true }), false);
assert.equal(shouldSubmitChatComposerKey({ key: 'a', shiftKey: false }), false);

assert.equal(getCallScreenForType('voice'), 'voice-call');
assert.equal(getCallScreenForType('video'), 'video');

assert.equal(canAcceptLifeCard({ role: 'model', kind: 'transfer', status: 'pending' }), true);
assert.equal(canAcceptLifeCard({ role: 'model', kind: 'red-packet', status: 'pending' }), true);
assert.equal(canAcceptLifeCard({ role: 'model', kind: 'shopping', status: 'pending' }), false);
assert.equal(canAcceptLifeCard({ role: 'user', kind: 'transfer', status: 'pending' }), false);
assert.equal(canAcceptLifeCard({ role: 'model', kind: 'transfer', status: 'accepted' }), false);

const replyHistory = getReplyHistoryMessages(
  [
    { id: 'older-user', role: 'user', content: '昨天说的', kind: 'text' },
    { id: 'pending-user', role: 'user', content: '不想找', kind: 'text' },
    { id: 'older-model', role: 'model', content: '我知道了', kind: 'text' },
  ],
  [{ sourceMessageId: 'pending-user' }],
);
assert.deepEqual(replyHistory.map((message) => message.id), ['older-user', 'older-model']);

console.log('wechatInteraction tests passed');
