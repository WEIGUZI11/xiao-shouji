import assert from 'node:assert/strict';
import { splitAssistantBubbles } from './wechatChat';

assert.deepEqual(
  splitAssistantBubbles('1. 小林：刚看到\n2. 我马上来', 'auto', '小林'),
  ['刚看到', '我马上来'],
);

assert.deepEqual(
  splitAssistantBubbles('旁白：她笑了一下\n好，我听你的。', 'auto', '小林'),
  ['好，我听你的。'],
);

const longReply = '这是一条特别长的解释，先第一点，然后第二点，最后再补充很多没有必要的说明，像报告一样，但既然模型已经回复出来了，聊天气泡就不能把后半句吞掉。';
const singleBubbles = splitAssistantBubbles(longReply, 'single');
assert.equal(singleBubbles.join(''), longReply);
assert.equal(singleBubbles.length, 1, 'single reply style should keep the complete reply in one bubble');
assert.doesNotMatch(singleBubbles.join(''), /\.\.\.$/);

assert.deepEqual(
  splitAssistantBubbles('第一段很长。\n第二段继续说明。', 'single'),
  ['第一段很长。\n第二段继续说明。'],
);

const burstReply = '第一句很长很长很长很长很长很长很长很长很长很长很长很长。第二句也不能被吃掉。';
const burstBubbles = splitAssistantBubbles(burstReply, 'burst');
assert.equal(burstBubbles.join(''), burstReply);

const unfinishedLongSentence = '这句话虽然很长但是模型没有在中间给出任何完整句号所以界面不能为了满足固定字数就从任意一个字符位置硬切开否则用户会误以为后台的完整内容在气泡里被截断了';
assert.deepEqual(splitAssistantBubbles(unfinishedLongSentence, 'burst'), [unfinishedLongSentence]);

const qqLongReply = 'QQ这里可以承载更长一点的一整段消息，不要像微信一样太碎；比如角色认真解释一件事的时候，一条气泡完整说完会更像QQ聊天，而不是每三十几个字就被切开。';
const qqBubbles = splitAssistantBubbles(qqLongReply, 'single', undefined, 'qq');
assert.equal(qqBubbles.join(''), qqLongReply);
assert.equal(qqBubbles.length, 1);

console.log('wechatChat tests passed');
