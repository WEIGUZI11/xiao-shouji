import assert from 'node:assert/strict';
import { desktopGuideSections, getDesktopGuideView } from './desktopGuide';

assert.equal(desktopGuideSections.length, 7);
assert.deepEqual(desktopGuideSections.map((section) => section.title), [
  '作者信息',
  '新手快速上手',
  '桌面与组件',
  '聊天和角色',
  '生活软件',
  '创作和工具',
  '数据安全',
]);

assert(desktopGuideSections.every((section) => section.id));
assert(desktopGuideSections.every((section) => section.summary));

const beginnerSteps = desktopGuideSections.find((section) => section.title === '新手快速上手')?.items || [];
assert(beginnerSteps.some((item) => item.includes('设置') && item.includes('AI')));
assert(beginnerSteps.some((item) => item.includes('通讯录') && item.includes('char')));
assert(beginnerSteps.some((item) => item.includes('User信息')));
assert(beginnerSteps.some((item) => item.includes('微信') || item.includes('QQ')));
assert(beginnerSteps.some((item) => item.includes('备份')));

const authorInfo = desktopGuideSections.find((section) => section.title === '作者信息')?.items || [];
assert(authorInfo.some((item) => item.includes('反馈') && item.includes('无名小手机') && item.includes('世界树社区')));

const allGuideCopy = desktopGuideSections
  .flatMap((section) => [section.title, section.summary, section.intro || '', ...section.items])
  .join('\n');

[
  '微信',
  'QQ',
  '通讯录',
  '电话',
  'User信息',
  '相册',
  '日记',
  '日历',
  '备忘录',
  '小红书',
  'B站',
  '音乐',
  '小剧场',
  '浏览器',
  '预设',
  '主题',
  '设置',
  'AI上下文',
  '报错',
  'char主动',
  '数据备份',
  '记账',
].forEach((appName) => {
  assert(allGuideCopy.includes(appName), `guide should explain ${appName}`);
});

const directoryView = getDesktopGuideView(desktopGuideSections, null);
assert.equal(directoryView.mode, 'directory');
assert.equal(directoryView.activeSection, null);
assert.equal(directoryView.sections.length, desktopGuideSections.length);

const lifeView = getDesktopGuideView(desktopGuideSections, 'life');
assert.equal(lifeView.mode, 'detail');
assert.equal(lifeView.activeSection?.title, '生活软件');
assert.equal(lifeView.sections.length, desktopGuideSections.length);

const unknownView = getDesktopGuideView(desktopGuideSections, 'missing');
assert.equal(unknownView.mode, 'directory');
assert.equal(unknownView.activeSection, null);

console.log('desktop guide copy ok');
