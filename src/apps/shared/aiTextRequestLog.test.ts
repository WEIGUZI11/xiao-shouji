import assert from 'node:assert/strict';

import { buildChatCompletionRequestLogDetail } from './aiText';

const longSystemText = `系统开头\n${'不能截断'.repeat(800)}\n系统结尾`;
const detail = buildChatCompletionRequestLogDetail({
  endpoint: 'https://example.test/v1/chat/completions',
  model: 'model-a',
  messages: [
    { role: 'system', content: longSystemText },
    { role: 'user', content: '用户本轮消息' },
    { role: 'assistant', content: '示例回复' },
  ],
  temperature: 0.8,
  maxTokens: 2400,
});

assert.match(detail, /【最终发送顺序与完整文本】/);
assert.match(detail, /#001 SYSTEM/);
assert.match(detail, /#002 USER/);
assert.match(detail, /#003 ASSISTANT/);
assert.match(detail, /系统结尾/);
assert.match(detail, /message_count=3/);
assert.doesNotMatch(detail, /\.\.\.$/);

console.log('ai text complete request log ok');
