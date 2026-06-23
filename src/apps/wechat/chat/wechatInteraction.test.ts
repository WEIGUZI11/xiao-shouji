import assert from 'node:assert/strict';
import {
  canAcceptLifeCard,
  getCallScreenForType,
  getReplyHistoryMessages,
  getPendingResponseMode,
  shouldAutoReplyAfterUserAction,
} from './wechatInteraction';

assert.equal(shouldAutoReplyAfterUserAction('text'), true);
assert.equal(shouldAutoReplyAfterUserAction('voice'), true);
assert.equal(shouldAutoReplyAfterUserAction('sticker'), true);
assert.equal(shouldAutoReplyAfterUserAction('transfer'), true);
assert.equal(shouldAutoReplyAfterUserAction('red-packet'), true);
assert.equal(shouldAutoReplyAfterUserAction('shopping'), true);
assert.equal(shouldAutoReplyAfterUserAction('image'), true);
assert.equal(shouldAutoReplyAfterUserAction('image', { triggerType: 'manual_generated_image' }), false);

assert.equal(getPendingResponseMode([{ kind: 'text' }, { kind: 'voice' }]), 'voice');
assert.equal(getPendingResponseMode([{ kind: 'sticker' }, { kind: 'transfer' }]), 'text');

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
