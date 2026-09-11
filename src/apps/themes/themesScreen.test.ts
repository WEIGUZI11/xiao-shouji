import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screenSource = readFileSync(new URL('./ThemesScreen.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');
const bubbleCssSource = readFileSync(new URL('../../themes/bubbles/index.css', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8');

for (const label of [
  'rounded',
  'system',
  'serif',
  'pixel',
  'zen-maru',
  'zcool-happy',
  'zcool-xiaowei',
  'zcool-qingke',
  'ma-shan-zheng',
  'long-cang',
  'zen-old-mincho',
]) {
  assert.match(screenSource, new RegExp(`id: '${label}'`), `font selector should expose ${label}`);
}

for (const sampleClass of [
  '.font-choice-sample-rounded',
  '.font-choice-sample-system',
  '.font-choice-sample-serif',
  '.font-choice-sample-pixel',
  '.font-choice-sample-zen-maru',
  '.font-choice-sample-zcool-happy',
  '.font-choice-sample-zcool-xiaowei',
  '.font-choice-sample-zcool-qingke',
  '.font-choice-sample-ma-shan-zheng',
  '.font-choice-sample-long-cang',
  '.font-choice-sample-zen-old-mincho',
]) {
  assert.match(cssSource, new RegExp(sampleClass.replace('.', '\\.')), `CSS should style ${sampleClass}`);
}

for (const bundledFont of [
  'lxgwmarkergothic',
  'zhuquefangsong',
  'dotgothic16',
  'zenmarugothic',
  'zcoolkuaile',
  'zcoolxiaowei',
  'zcoolqingkehuangyou',
  'mashanzheng',
  'longcang',
  'zenoldmincho',
]) {
  assert.match(cssSource, new RegExp(`assets/fonts/${bundledFont}/`), `CSS should bundle ${bundledFont}`);
}
assert.match(screenSource, /aria-pressed=\{fontStyle === item\.id\}/, 'selected font should expose visible pressed state');
assert.match(screenSource, /套 · 本地/, 'font selector should explain that bundled fonts work locally');
assert.match(screenSource, /softwareIconsExpanded,\s*setSoftwareIconsExpanded\]\s*=\s*useState\(false\)/, 'software icon list should stay collapsed by default');
assert.match(screenSource, /fontsExpanded,\s*setFontsExpanded\]\s*=\s*useState\(false\)/, 'font list should stay collapsed by default');
assert.match(screenSource, /themesExpanded,\s*setThemesExpanded\]\s*=\s*useState\(false\)/, 'theme list should stay collapsed by default');
assert.match(screenSource, /saveImageAsset\(await readCustomImageFile\(file\)\)/, 'custom software icons should validate and store uploaded bytes');
assert.match(screenSource, /<PersistentImage src=\{customIcon\}/, 'software icon previews should resolve persistent image references');
assert.doesNotMatch(screenSource, /聊天背景/, 'global theme screen should not own character chat backgrounds');
assert.match(screenSource, /className="sr-only"/, 'software icon file inputs should remain user-clickable through labels');
assert.match(screenSource, /fallback=\{React\.cloneElement/, 'broken software icon previews should fall back to the real app glyph');
assert.match(screenSource, /底部位置/, 'theme screen should expose global phone bottom layout controls');
assert.match(screenSource, /bottomLayoutExpanded,\s*setBottomLayoutExpanded\]\s*=\s*useState\(false\)/, 'bottom layout choices should stay collapsed by default');
assert.match(screenSource, /setChatBottomLayout\('lifted'\)/, 'theme screen should let users lift all bottom controls');
assert.match(cssSource, /\.phone-shell\.phone-bottom-lift/, 'CSS should apply lifted bottom layout from the phone shell');
assert.match(cssSource, /\.phone-shell\.phone-bottom-lift :is\(\.dock,\s*\.page-dots/, 'CSS should lift desktop dock and page dots globally');
assert.match(screenSource, /气泡美化/, 'theme screen should expose chat-bubble appearance choices');
assert.match(screenSource, /同时作用于微信和 QQ/, 'theme screen should explain that bubble skins affect both chat apps');
assert.match(screenSource, /bubbleStylesExpanded,\s*setBubbleStylesExpanded\]\s*=\s*useState\(false\)/, 'bubble picker should stay collapsed by default');
assert.match(screenSource, /bubbleStyleOptions\.length - 1/, 'bubble picker should disclose the live readable-skin count');
assert.match(screenSource, /bubbleStyleOptions\.map/, 'theme screen should render bubble styles from the shared option list');
assert.match(screenSource, /setBubbleStyle\(item\.id\)/, 'theme screen should persist the selected bubble skin');
assert.match(screenSource, /data-theme-preview=\{item\.id\}/, 'whole-phone theme cards should render differentiated previews');
assert.match(screenSource, /setTheme\(item\.id\)/, 'whole-phone theme cards should switch only the selected existing theme');
assert.doesNotMatch(screenSource, /主题小物|setOrnamentPack|ornamentPack/, 'discarded small-object mixing controls must stay removed');
assert.doesNotMatch(mainSource, /themes\/(?:alcheris-pixel|lotus-letter)\/index\.css/, 'removed low-readability themes must not load');
assert.doesNotMatch(mainSource, /themes\/(?:frosting-cloud|tidal-post-office)\/index\.css/, 'deleted whole-phone themes must not load');
assert.match(mainSource, /themes\/selected-concepts\/index\.css/, 'selected numbered concept CSS must load with the other whole-phone themes');
for (const bubbleClass of ['lunar-halo', 'black-wing-gaze', 'holographic-jelly', 'tidal-stamp']) {
  assert.match(bubbleCssSource, new RegExp(`\\.phone-stage\\.bubble-style-${bubbleClass}`), `bubble CSS should style ${bubbleClass}`);
}
assert.match(screenSource, /bubble-choice-number/, 'numbered bubble cards should display their design number');
assert.match(bubbleCssSource, /\.wechat-reply-line/, 'bubble skins should cover quoted replies');
assert.match(bubbleCssSource, /\.wechat-typing/, 'bubble skins should cover typing state');
assert.match(bubbleCssSource, /\.bubble-ornament/, 'bubble skins should provide real ornament layers');
for (const componentName of ['wechat-message-time', 'wechat-recalled-text', 'wechat-call-note']) {
  assert.match(bubbleCssSource, new RegExp(`\\.${componentName}`), `bubble skins should cover ${componentName}`);
}
assert.match(mainSource, /themes\/bubbles\/index\.css/, 'bubble skin CSS must load after the theme styles');
