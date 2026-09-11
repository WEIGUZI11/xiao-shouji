import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';

const baseUrl = process.env.SMALL_PHONE_URL || 'http://127.0.0.1:3000/';
const outputDirectory = path.resolve('qa-screenshots/theme-identity-regression');
const themes = ['pastel', 'gothic', 'guofeng', 'celtic-paladin', 'status-terminal', 'concept-20', 'concept-33', 'concept-57', 'concept-58'];
const qaCharacter = {
  id: 'qa-theme-identity',
  name: '主题验收角色',
  avatar: '',
  description: '隔离视觉验收角色',
  personality: '自然、清楚',
  firstMessage: '',
  systemPrompt: '',
};
const messages = [
  { id: 'qa-a', role: 'model', content: '这套主题的内页也应该有自己的结构。', timestamp: 1_786_000_000_000, kind: 'text' },
  { id: 'qa-b', role: 'user', content: '不是只换颜色，标题、列表和气泡都要变化。', timestamp: 1_786_000_030_000, kind: 'text' },
  { id: 'qa-c', role: 'model', content: '长文字需要正常换行，不能被边框或装饰吃掉。\n第二行仍然完整可读。', timestamp: 1_786_000_060_000, kind: 'text' },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

function state(theme, activeScreen, activeChannel = 'wechat') {
  return {
    characters: [qaCharacter],
    chatSessions: {
      [`${activeChannel}:${qaCharacter.id}`]: {
        id: `qa-${activeChannel}-session`,
        characterId: qaCharacter.id,
        channel: activeChannel,
        messages,
        lastUpdated: messages.at(-1).timestamp,
      },
    },
    activeScreen,
    previousScreen: activeChannel,
    activeChatId: activeScreen === 'chat' ? qaCharacter.id : null,
    activeChannel,
    theme,
    bubbleStyle: 'theme',
    fontStyle: 'system',
    chatBottomLayout: 'default',
    desktopPage: 0,
    layoutMode: 'snap',
    layoutPositions: {},
    customWidgets: [],
    appIconOverrides: {},
    imageBed: null,
    userName: '我',
    userAvatar: null,
  };
}

async function apply(nextState) {
  await page.evaluate((value) => {
    localStorage.setItem('char-phone-framework', JSON.stringify({ state: value, version: 78 }));
    localStorage.setItem('xiaophone.firstUseGuideTip.v1', 'seen');
  }, nextState);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.phone-shell').waitFor();
  const unlock = page.locator('.lock-unlock-button');
  if (await unlock.isVisible().catch(() => false)) await unlock.click();
  await page.locator('.phone-stage').waitFor();
  await page.locator(nextState.activeScreen === 'themes' ? '.themes-screen' : '.phone-shell').waitFor();
  await page.evaluate(() => document.fonts?.ready);
}

async function screenshot(name) {
  await page.locator('.phone-stage').screenshot({ path: path.join(outputDirectory, name) });
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

const report = [];
for (const theme of themes) {
  await apply(state(theme, 'themes'));
  await page.locator('[data-appearance-section="themes"] > button').click();
  await page.locator('.theme-choice-card').first().waitFor();
  const appearance = await page.evaluate(() => {
    const shell = document.querySelector('.phone-shell').getBoundingClientRect();
    const visibleCards = [...document.querySelectorAll('.theme-choice-card')].filter((element) => element.offsetParent !== null);
    return {
      cards: visibleCards.length,
      outside: visibleCards.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < shell.left - 1 || rect.right > shell.right + 1;
      }).length,
    };
  });
  await screenshot(`${theme}-appearance-open.png`);

  const chats = {};
  for (const channel of ['wechat', 'qq']) {
    await apply(state(theme, channel, channel));
    await page.locator(channel === 'wechat' ? '.wechat-shell' : '.qq-home-screen').waitFor();
    await screenshot(`${theme}-${channel}-list.png`);

    await apply(state(theme, 'chat', channel));
    await page.locator(channel === 'wechat' ? '.wechat-chat-screen' : '.qq-chat-screen').waitFor();
    chats[channel] = await page.evaluate(() => {
      const screen = document.querySelector('.phone-shell').getBoundingClientRect();
      const bubbles = [...document.querySelectorAll('.wechat-text-wrap')].filter((element) => element.offsetParent !== null);
      return {
        bubbles: bubbles.length,
        clipped: bubbles.filter((element) => {
          const rect = element.getBoundingClientRect();
          const content = element.querySelector('.bubble-content')?.getBoundingClientRect();
          return rect.left < screen.left || rect.right > screen.right || (content && (content.left < rect.left - 1 || content.right > rect.right + 1 || content.top < rect.top - 1 || content.bottom > rect.bottom + 1));
        }).length,
      };
    });
    await screenshot(`${theme}-${channel}.png`);
  }
  report.push({ theme, appearance, chats });
  console.log(`theme identity ${theme}: captured`);
}

await writeFile(path.join(outputDirectory, 'report.json'), JSON.stringify({ themes: report, consoleErrors }, null, 2));
await browser.close();

const failures = report.filter((item) => item.appearance.cards !== 9 || item.appearance.outside || item.chats.wechat.clipped || item.chats.qq.clipped);
if (consoleErrors.length || failures.length) {
  console.error(JSON.stringify({ failures, consoleErrors }, null, 2));
  process.exitCode = 1;
} else {
  console.log(`theme identity regression passed: ${themes.length} themes`);
}
