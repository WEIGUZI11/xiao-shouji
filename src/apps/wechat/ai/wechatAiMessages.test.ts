import { strict as assert } from 'node:assert';
import { parseWeChatAiReply } from './wechatAiMessages';

const parsed = parseWeChatAiReply([
  '到了说一声',
  '[sticker mood=comfort]',
  '[transfer amount=188 note=晚饭钱]',
  '[red-packet amount=52 note=买点甜的]',
  '[shopping item=奶茶 amount=18 note=我下单了]',
  '[image prompt="雨夜窗边的热茶" label=发你看]',
].join('\n'));

assert.equal(parsed.length, 6);
assert.equal(parsed[0].kind, 'text');
assert.equal(parsed[0].content, '到了说一声');
assert.equal(parsed[1].kind, 'sticker');
assert.equal(parsed[1].mood, 'comfort');
assert.equal(parsed[2].kind, 'transfer');
assert.equal(parsed[2].amount, '188');
assert.equal(parsed[2].note, '晚饭钱');
assert.equal(parsed[3].kind, 'red-packet');
assert.equal(parsed[3].amount, '52');
assert.equal(parsed[4].kind, 'shopping');
assert.equal(parsed[4].itemName, '奶茶');
assert.equal(parsed[5].kind, 'image');
assert.equal(parsed[5].prompt, '雨夜窗边的热茶');

const fallback = parseWeChatAiReply('[transfer note=少了金额]');
assert.equal(fallback[0].kind, 'text');
assert.equal(fallback[0].content, '[transfer note=少了金额]');

const quoted = parseWeChatAiReply('[shopping item="热奶茶" amount="18.5" note="别喝冰的"]');
assert.equal(quoted[0].kind, 'shopping');
assert.equal(quoted[0].itemName, '热奶茶');
assert.equal(quoted[0].amount, '18.5');
assert.equal(quoted[0].note, '别喝冰的');

const badImage = parseWeChatAiReply('[image label=缺提示词]');
assert.equal(badImage[0].kind, 'text');

const withThinking = parseWeChatAiReply([
  '<think>',
  '用户现在很难过，我应该先安慰再问原因。',
  '</think>',
  '我在呢',
  '慢慢说',
].join('\n'));
assert.deepEqual(withThinking, [
  { kind: 'text', content: '我在呢' },
  { kind: 'text', content: '慢慢说' },
]);

const colonThinking = parseWeChatAiReply([
  '思考：这里需要显得自然一点',
  '先别急，我听着',
].join('\n'));
assert.deepEqual(colonThinking, [
  { kind: 'text', content: '先别急，我听着' },
]);

assert.deepEqual(parseWeChatAiReply('["第一条","第二条"]'), [
  { kind: 'text', content: '第一条' },
  { kind: 'text', content: '第二条' },
]);

assert.deepEqual(parseWeChatAiReply('```json\n["围巾带上", "外面冷"]\n```'), [
  { kind: 'text', content: '围巾带上' },
  { kind: 'text', content: '外面冷' },
]);

assert.deepEqual(parseWeChatAiReply('{"messages":[{"content":"到了说一声"},{"text":"别走太快"}]}'), [
  { kind: 'text', content: '到了说一声' },
  { kind: 'text', content: '别走太快' },
]);

assert.deepEqual(parseWeChatAiReply('[\n"没有配平的第一条",\n"没有配平的第二条",\n'), [
  { kind: 'text', content: '没有配平的第一条' },
  { kind: 'text', content: '没有配平的第二条' },
]);

assert.deepEqual(parseWeChatAiReply('<think>这段原生思维没有闭合\n不能显示'), [
  { kind: 'text', content: '嗯，我看到了。' },
]);

console.log('wechatAiMessages tests passed');
