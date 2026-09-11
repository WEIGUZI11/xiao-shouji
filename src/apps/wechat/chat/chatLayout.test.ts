import assert from 'node:assert/strict';

import { getChatBottomLayoutClass, getPhoneBottomLayoutClass, normalizeChatBottomLayout } from './chatLayout';

assert.equal(normalizeChatBottomLayout('default'), 'default');
assert.equal(normalizeChatBottomLayout('lifted'), 'lifted');
assert.equal(normalizeChatBottomLayout('safe-area'), 'default');
assert.equal(normalizeChatBottomLayout(undefined), 'default');

assert.equal(getChatBottomLayoutClass('default'), '');
assert.equal(getChatBottomLayoutClass('lifted'), 'chat-bottom-lift');
assert.equal(getPhoneBottomLayoutClass('default'), '');
assert.equal(getPhoneBottomLayoutClass('lifted'), 'phone-bottom-lift');
