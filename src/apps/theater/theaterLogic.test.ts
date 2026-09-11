import assert from 'node:assert/strict';
import {
  buildTheaterSystemPrompt,
  buildTheaterUserPrompt,
  buildTheaterLengthInstruction,
  buildTheaterContinuationPrompt,
  parseTheaterWordCount,
  getTheaterMaxTokens,
  buildTheaterOutputRule,
  buildTheaterResultStatus,
  appendTheaterContinuation,
  buildTheaterChatMessage,
  parseTheaterTopicImport,
  resolveTavernRandom,
  rollWorldBookEntries,
} from './theaterLogic.ts';

function sequencePicker(values: number[]) {
  let index = 0;
  return () => values[index++] ?? 0;
}

const resolved = resolveTavernRandom(
  '地点：{{random:校园,医院,出租屋}}\n关系：{{random:旧友,敌人,临时恋人}}',
  sequencePicker([0.45, 0.1]),
);

assert.equal(resolved, '地点：医院\n关系：旧友');
assert.equal(resolved.includes('校园'), false);
assert.equal(resolved.includes('出租屋'), false);

const rolled = rollWorldBookEntries(
  [
    {
      id: 'low-location',
      comment: '默认 low',
      content: '地点：{{random:校园,医院,出租屋}}\n冲突：{{random:误会升级,秘密曝光}}',
      enabled: true,
      selected: true,
      keys: [],
      importedAt: 1,
      updatedAt: 1,
    },
  ],
  sequencePicker([0.7, 0.2]),
);

assert.deepEqual(rolled, ['【默认 low】\n地点：出租屋\n冲突：误会升级']);
assert.equal(rolled[0].includes('校园,医院'), false);

assert.equal(buildTheaterLengthInstruction('short'), '请生成约 200 到 600 字左右的小剧场。');
assert.equal(buildTheaterLengthInstruction('custom', '约 1200 字'), '请生成约 1200 字左右的小剧场。');

const continuationPrompt = buildTheaterContinuationPrompt({
  previousContent: '雨停后，她终于推开了那扇门。',
  theme: '雨夜重逢',
  length: 'short',
  customLengthText: '',
  actorNames: ['艾尔', '我'],
  rollResult: '旧钥匙仍在口袋里',
});
assert.match(continuationPrompt, /最后一句自然续写后续/);
assert.match(continuationPrompt, /不要重写、复述或总结/);
assert.match(continuationPrompt, /雨停后，她终于推开了那扇门/);
assert.match(continuationPrompt, /角色：艾尔、我/);

const randomPrompt = buildTheaterUserPrompt({
  theme: '雨夜误会',
  length: 'custom',
  customLengthText: '1200',
  actorNames: ['林雾', '陈川'],
  rollResult: '地点：医院',
});

assert.equal(randomPrompt.includes('风格：'), false);
assert.equal(randomPrompt.includes('本次世界书随机结果：\n地点：医院'), true);
assert.equal(randomPrompt.includes('请生成约 1200 字左右的小剧场。'), true);

const fixedPrompt = buildTheaterUserPrompt({
  theme: '雨夜误会',
  length: 'medium',
  customLengthText: '',
  actorNames: ['林雾'],
  rollResult: '',
});

assert.equal(fixedPrompt.includes('风格：'), false);
assert.equal(fixedPrompt.includes('完整故事'), true);
assert.equal(buildTheaterSystemPrompt('').includes('完整故事'), true);
assert.equal(buildTheaterSystemPrompt('').includes('开端'), true);

const textTopics = parseTheaterTopicImport('雨夜误会\n旧友重逢', '日常');
assert.deepEqual(textTopics.map((topic) => topic.title), ['雨夜误会', '旧友重逢']);
assert.deepEqual(textTopics.map((topic) => topic.category), ['日常', '日常']);

const jsonTopics = parseTheaterTopicImport('{"category":"梦境","topics":["{{random:迷路,重逢}}"]}', '默认');
assert.equal(jsonTopics[0].content, '{{random:迷路,重逢}}');
assert.equal(jsonTopics[0].category, '梦境');

console.log('theaterLogic tests passed');

for (const [text, expected] of [['400', 400], ['约 1200 字', 1200], ['4,000', 4000], ['１２００', 1200]] as const) {
  assert.equal(parseTheaterWordCount(text), expected);
  assert.equal(getTheaterMaxTokens('custom', text), Math.ceil(expected * 2.5) + 1024);
  assert.match(buildTheaterOutputRule('custom', text), new RegExp(String(expected)));
}
assert.ok(getTheaterMaxTokens('custom', '4000') > 5000, 'no hidden 5000-token cap');
for (const text of ['', '0', '-400', '1.5', '400-800', 'abc']) assert.throws(() => getTheaterMaxTokens('custom', text));
assert.equal(appendTheaterContinuation('她推开了', '那扇门。'), '她推开了那扇门。');
assert.equal(appendTheaterContinuation('她推开了门。', '屋里很安静。'), '她推开了门。\n\n屋里很安静。');
assert.equal(appendTheaterContinuation('她推开了\n\n（本次回复达到长度上限，请调高设置。）', '那扇门。'), '她推开了那扇门。');
const longBody = '字'.repeat(4000) + '结尾保留';
assert.equal(buildTheaterChatMessage('主题', longBody), `【小剧场】主题\n${longBody}`);
assert.match(buildTheaterResultStatus('字'.repeat(400), 'custom', '1200', false), /尚未达到目标 1200 字/);
assert.match(buildTheaterResultStatus('字'.repeat(400), 'custom', '1200', true), /模型输出达到上限/);
