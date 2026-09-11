import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';

const baseUrl = process.env.SMALL_PHONE_URL || 'http://127.0.0.1:3000/';
const outputDirectory = path.resolve('qa-screenshots/full-appearance-audit');

const themes = [
  'pastel',
  'gothic',
  'guofeng',
  'celtic-paladin',
  'status-terminal',
  'concept-20',
  'concept-33',
  'concept-57',
  'concept-58',
];

const bubbleStyles = [
  'lunar-halo',
  'constellation-aurora',
  'rainbow-raincloud',
  'butterfly-flower-letter',
  'feather-wax-seal',
  'signal-terminal',
  'puzzle-alert',
  'black-wing-gaze',
  'sprinkle-bow',
  'chocolate-waffle',
  'celadon-koi',
  'library-card',
  'holographic-jelly',
  'neon-cassette',
  'snow-globe',
  'moss-specimen',
  'rose-window',
  'tidal-stamp',
];

const qaCharacter = {
  id: 'qa-visual-character',
  name: '视觉验收角色',
  avatar: '',
  description: '只用于隔离截图，不会写入用户数据。',
  personality: '自然、清楚',
  firstMessage: '',
  systemPrompt: '',
};

const qaMessages = [
  { id: 'qa-model-short', role: 'model', content: '这是短消息。', timestamp: 1_786_000_000_000, kind: 'text' },
  { id: 'qa-user-short', role: 'user', content: '右侧气泡也要完整可读。', timestamp: 1_786_000_030_000, kind: 'text' },
  {
    id: 'qa-model-long',
    role: 'model',
    content: '这是一条用于检查换行、留白、装饰遮挡和文字对比度的长消息。\n第二行不能被裁切，也不能贴住气泡边缘。',
    timestamp: 1_786_000_060_000,
    kind: 'text',
  },
  { id: 'qa-user-voice', role: 'user', content: '语音验收', timestamp: 1_786_000_090_000, kind: 'voice', duration: 8, transcript: '语音转写也必须清晰可读。' },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const consoleErrors = [];
const report = { viewport: '390x844', themes: [], bubbles: [], consoleErrors };

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

function buildState(overrides = {}) {
  const channel = overrides.activeChannel || 'wechat';
  const session = {
    id: `qa-${channel}-session`,
    characterId: qaCharacter.id,
    channel,
    messages: qaMessages,
    lastUpdated: qaMessages.at(-1).timestamp,
  };
  return {
    characters: [qaCharacter],
    chatSessions: {
      [`${channel}:${qaCharacter.id}`]: session,
    },
    activeScreen: 'desktop',
    previousScreen: 'desktop',
    activeChatId: null,
    activeChannel: channel,
    theme: 'pastel',
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
    ...overrides,
  };
}

async function applyState(overrides) {
  const state = buildState(overrides);
  await page.evaluate((nextState) => {
    localStorage.setItem('char-phone-framework', JSON.stringify({ state: nextState, version: 78 }));
    localStorage.setItem('xiaophone.firstUseGuideTip.v1', 'seen');
  }, state);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.phone-shell').waitFor({ timeout: 30_000 });
  const unlock = page.locator('.lock-unlock-button');
  if (await unlock.isVisible().catch(() => false)) await unlock.click();
  await page.locator('.phone-stage').waitFor({ timeout: 30_000 });
  const firstUseClose = page.locator('.first-use-tip .guide-close');
  if (await firstUseClose.isVisible().catch(() => false)) await firstUseClose.click({ force: true });
  await page.evaluate(() => document.fonts?.ready);
}

async function screenshotPhone(relativePath) {
  const targetPath = path.join(outputDirectory, relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await page.locator('.phone-stage').screenshot({ path: targetPath });
}

async function inspectDesktop(theme, pageNumber) {
  return page.evaluate(({ activeTheme, activePage }) => {
    const visible = (element) => element instanceof HTMLElement && element.offsetParent !== null;
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
    };
    const overlaps = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
    const shellElement = document.querySelector('.phone-stage');
    const shell = rect(shellElement);
    const appElements = [...document.querySelectorAll('.desktop-canvas .app-button')].filter(visible);
    const appIconElements = appElements.map((element) => element.querySelector('.app-icon')).filter(visible);
    const dockElements = [...document.querySelectorAll('.dock button')].filter(visible);
    const appBoxes = appElements.map(rect);
    const appIconBoxes = appIconElements.map(rect);
    const dockBoxes = dockElements.map(rect);
    const contentBoxes = [
      ...appBoxes,
      ...dockBoxes,
      ...[...document.querySelectorAll('.time-card,.image-bed,.layout-controls,.shell-notification-button,.page-dots')].filter(visible).map(rect),
    ];
    const outOfBounds = contentBoxes.filter((box) => (
      box.left < shell.left - 1 || box.right > shell.right + 1 || box.top < shell.top - 1 || box.bottom > shell.bottom + 1
    ));
    const appOverlaps = appIconBoxes.flatMap((box, index) => appIconBoxes.slice(index + 1).filter((other) => overlaps(box, other)).map((other) => ({ a: box, b: other })));
    const appUnion = appBoxes.length ? {
      left: Math.min(...appBoxes.map((box) => box.left)),
      right: Math.max(...appBoxes.map((box) => box.right)),
    } : null;
    const leftGap = appUnion ? appUnion.left - shell.left : null;
    const rightGap = appUnion ? shell.right - appUnion.right : null;
    const centerDelta = appUnion ? ((appUnion.left + appUnion.right) / 2) - ((shell.left + shell.right) / 2) : null;
    const topControls = [...document.querySelectorAll('.shell-notification-button,.layout-toggle')].filter(visible).map(rect);
    const topBaselineDelta = topControls.length >= 2
      ? Math.max(...topControls.map((box) => box.top)) - Math.min(...topControls.map((box) => box.top))
      : null;
    const splitControlThemes = new Set(['gothic', 'guofeng']);
    return {
      theme: activeTheme,
      page: activePage,
      viewportOverflow: document.documentElement.scrollWidth - window.innerWidth,
      appCount: appBoxes.length,
      dockCount: dockBoxes.length,
      outOfBoundsCount: outOfBounds.length,
      appOverlapCount: appOverlaps.length,
      leftGap,
      rightGap,
      centerDelta,
      topBaselineDelta,
      topControlMode: splitControlThemes.has(activeTheme) ? 'intentional-split-composition' : 'aligned',
      violations: [
        ...(document.documentElement.scrollWidth > window.innerWidth + 1 ? ['viewport-horizontal-overflow'] : []),
        ...(outOfBounds.length ? ['content-outside-phone'] : []),
        ...(appOverlaps.length ? ['app-overlap'] : []),
        ...(leftGap !== null && rightGap !== null && Math.abs(leftGap - rightGap) > 12 ? ['app-grid-not-centered'] : []),
        ...(rightGap !== null && rightGap < 8 ? ['right-safe-gap-too-small'] : []),
        ...(topBaselineDelta !== null && topBaselineDelta > 8 && !splitControlThemes.has(activeTheme) ? ['top-controls-misaligned'] : []),
      ],
    };
  }, { activeTheme: theme, activePage: pageNumber });
}

async function inspectAppearance(theme) {
  return page.evaluate((activeTheme) => {
    const parseColor = (value) => {
      const rgbMatch = value.match(/rgba?\(([^)]+)\)/);
      if (rgbMatch) {
        const parts = rgbMatch[1].split(/[ ,/]+/).filter(Boolean).map(Number);
        return { r: parts[0], g: parts[1], b: parts[2], a: Number.isFinite(parts[3]) ? parts[3] : 1 };
      }
      const srgbMatch = value.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);
      if (!srgbMatch) return null;
      return {
        r: Number(srgbMatch[1]) * 255,
        g: Number(srgbMatch[2]) * 255,
        b: Number(srgbMatch[3]) * 255,
        a: srgbMatch[4] === undefined ? 1 : Number(srgbMatch[4]),
      };
    };
    const composite = (foreground, background) => {
      const alpha = foreground.a + background.a * (1 - foreground.a);
      if (alpha <= 0) return { r: 255, g: 255, b: 255, a: 0 };
      return {
        r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
        g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
        b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
        a: alpha,
      };
    };
    const luminance = ({ r, g, b }) => {
      const channels = [r, g, b].map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const contrast = (foreground, background) => {
      const a = luminance(foreground);
      const b = luminance(background);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    const effectiveBackground = (element) => {
      const layers = [];
      let current = element;
      while (current) {
        const style = getComputedStyle(current);
        if (style.backgroundImage !== 'none') return null;
        const color = parseColor(style.backgroundColor);
        if (color && color.a > 0) layers.push(color);
        if (color && color.a >= 0.999) break;
        current = current.parentElement;
      }
      let result = { r: 255, g: 255, b: 255, a: 1 };
      for (let index = layers.length - 1; index >= 0; index -= 1) result = composite(layers[index], result);
      return result;
    };
    const labels = [...document.querySelectorAll('.themes-screen h1,.themes-screen h2,.appearance-disclosure p,.appearance-disclosure span')]
      .filter((element) => element instanceof HTMLElement && element.offsetParent !== null)
      .map((element) => {
        const style = getComputedStyle(element);
        const foreground = parseColor(style.color);
        const background = effectiveBackground(element);
        const visibleForeground = foreground && background ? composite(foreground, background) : foreground;
        return {
          text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
          fontSize: Number.parseFloat(style.fontSize),
          color: style.color,
          background: background ? `rgb(${background.r}, ${background.g}, ${background.b})` : 'complex-background',
          contrast: visibleForeground && background ? contrast(visibleForeground, background) : null,
        };
      });
    const lowContrast = labels.filter((item) => item.contrast !== null && item.contrast < 4.5);
    const tinyText = labels.filter((item) => item.fontSize < 12);
    return {
      theme: activeTheme,
      labels,
      lowContrast,
      tinyText,
      violations: [
        ...(lowContrast.length ? ['appearance-low-contrast'] : []),
        ...(tinyText.length ? ['appearance-text-under-12px'] : []),
      ],
    };
  }, theme);
}

async function inspectChat(style, channel) {
  return page.evaluate(({ activeStyle, activeChannel }) => {
    const visible = (element) => element instanceof HTMLElement && element.offsetParent !== null;
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
    };
    const screenElement = document.querySelector(activeChannel === 'wechat' ? '.wechat-chat-screen' : '.qq-chat-screen');
    const screen = rect(screenElement);
    const bubbles = [...document.querySelectorAll('.wechat-text-wrap,.wechat-voice-bubble')].filter(visible);
    const details = bubbles.map((bubble) => {
      const box = rect(bubble);
      const styleValue = getComputedStyle(bubble);
      const content = bubble.querySelector('.bubble-content');
      const contentBox = content ? rect(content) : null;
      const contentOutsideBubble = contentBox ? (
        contentBox.left < box.left - 1 || contentBox.right > box.right + 1
        || contentBox.top < box.top - 1 || contentBox.bottom > box.bottom + 1
      ) : false;
      return {
        text: bubble.textContent.trim().replace(/\s+/g, ' ').slice(0, 100),
        box,
        color: styleValue.color,
        backgroundColor: styleValue.backgroundColor,
        backgroundImage: styleValue.backgroundImage,
        fontSize: Number.parseFloat(styleValue.fontSize),
        contentBox,
        contentOutsideBubble,
        outsideScreen: box.left < screen.left - 1 || box.right > screen.right + 1,
      };
    });
    const minLeftGap = Math.min(...details.map((item) => item.box.left - screen.left));
    const minRightGap = Math.min(...details.map((item) => screen.right - item.box.right));
    return {
      style: activeStyle,
      channel: activeChannel,
      bubbleCount: bubbles.length,
      minLeftGap,
      minRightGap,
      details,
      violations: [
        ...(details.some((item) => item.contentOutsideBubble) ? ['bubble-content-clipped'] : []),
        ...(details.some((item) => item.outsideScreen) ? ['bubble-outside-chat-screen'] : []),
        ...(details.some((item) => item.fontSize < 14) ? ['bubble-font-too-small'] : []),
        ...(minRightGap < 4 ? ['bubble-right-gap-too-small'] : []),
      ],
    };
  }, { activeStyle: style, activeChannel: channel });
}

function buildMarkdown() {
  const themeRows = report.themes.map((item) => {
    const allViolations = [...new Set([...item.page1.violations, ...item.page2.violations, ...item.appearance.violations])];
    return `| ${item.theme} | ${allViolations.length ? allViolations.join(', ') : '未发现自动规则问题'} | ${item.page1.centerDelta?.toFixed(1) ?? '-'} | ${item.page1.rightGap?.toFixed(1) ?? '-'} | ${item.appearance.lowContrast.length} |`;
  }).join('\n');
  const bubbleRows = report.bubbles.map((item) => {
    const allViolations = [...new Set([...item.wechat.violations, ...item.qq.violations])];
    return `| ${item.style} | ${allViolations.length ? allViolations.join(', ') : '未发现自动规则问题'} | ${item.wechat.minRightGap.toFixed(1)} | ${item.qq.minRightGap.toFixed(1)} |`;
  }).join('\n');
  return `# 小手机全量视觉基线审计\n\n` +
    `> 这是自动量测基线，不等同于人工审美验收。所有截图来自隔离的临时角色与消息，不读取或修改用户角色卡。\n\n` +
    `## 整机主题（${themes.length} 套）\n\n| 主题 | 自动规则发现 | 首页中心偏差(px) | 首页右侧留白(px) | 外观页低对比文字数 |\n|---|---:|---:|---:|---:|\n${themeRows}\n\n` +
    `## 气泡（${bubbleStyles.length} 套，微信 + QQ）\n\n| 气泡 | 自动规则发现 | 微信右侧最小留白(px) | QQ右侧最小留白(px) |\n|---|---:|---:|---:|\n${bubbleRows}\n\n` +
    `## 证据目录\n\n- 主题：首页、第二页、外观设置页各一张。\n- 气泡：微信与 QQ 真实聊天房间各一张。\n- 详细量测：\`report.json\`。\n`;
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(path.join(outputDirectory, 'themes'), { recursive: true });
await mkdir(path.join(outputDirectory, 'bubbles'), { recursive: true });

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  for (const theme of themes) {
    await applyState({ theme, desktopPage: 0, activeScreen: 'desktop' });
    await page.locator('.desktop-screen').waitFor();
    const page1 = await inspectDesktop(theme, 1);
    await screenshotPhone(path.join('themes', `${theme}-page-1.png`));

    await applyState({ theme, desktopPage: 1, activeScreen: 'desktop' });
    await page.locator('.desktop-screen').waitFor();
    const page2 = await inspectDesktop(theme, 2);
    await screenshotPhone(path.join('themes', `${theme}-page-2.png`));

    await applyState({ theme, activeScreen: 'themes', previousScreen: 'desktop' });
    await page.locator('.themes-screen').waitFor();
    const appearance = await inspectAppearance(theme);
    await screenshotPhone(path.join('themes', `${theme}-appearance.png`));

    report.themes.push({ theme, page1, page2, appearance });
    console.log(`theme ${theme}: captured`);
  }

  for (const style of bubbleStyles) {
    const channels = {};
    for (const channel of ['wechat', 'qq']) {
      await applyState({
        bubbleStyle: style,
        activeScreen: 'chat',
        previousScreen: channel,
        activeChatId: qaCharacter.id,
        activeChannel: channel,
      });
      await page.locator(channel === 'wechat' ? '.wechat-chat-screen' : '.qq-chat-screen').waitFor();
      channels[channel] = await inspectChat(style, channel);
      await screenshotPhone(path.join('bubbles', `${style}-${channel}.png`));
    }
    report.bubbles.push({ style, ...channels });
    console.log(`bubble ${style}: captured`);
  }

  report.consoleErrors = [...new Set(consoleErrors)];
  await writeFile(path.join(outputDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outputDirectory, 'summary.md'), buildMarkdown(), 'utf8');
  console.log(`full appearance audit captured: ${themes.length} themes, ${bubbleStyles.length} bubbles`);
  console.log(outputDirectory);
} finally {
  await browser.close();
}
