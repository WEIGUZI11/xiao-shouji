import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const presetsSource = readFileSync(new URL('./PresetsScreen.tsx', import.meta.url), 'utf8');
const wechatSource = readFileSync(new URL('../wechat/me/WeChatMe.tsx', import.meta.url), 'utf8');

assert.match(presetsSource, /导入酒馆预设/);
assert.match(presetsSource, /ChatPresetEntriesEditor/);
assert.match(presetsSource, /选择文件/);
assert.match(presetsSource, /手机整体风格/);
assert.match(presetsSource, /softwareSectionOpen/);
assert.match(presetsSource, /删除当前预设/);
assert.match(presetsSource, /玩家可调的回复参数/);
assert.match(presetsSource, /最大输出/);
assert.match(presetsSource, /chatTemperature/);
assert.match(presetsSource, /chatMaxTokens/);
assert.match(presetsSource, /完整顺序可在“后台日志 → 发送给 AI 的完整文本”查看/);
assert.doesNotMatch(presetsSource, /window\.confirm/);
assert.match(wechatSource, /去预设 App 管理条目/);
assert.doesNotMatch(wechatSource, /ChatPresetEntriesEditor/);
assert.doesNotMatch(wechatSource, /导入预设文件/);
assert.doesNotMatch(wechatSource, /presetImportText/);

console.log('preset placement ok');
