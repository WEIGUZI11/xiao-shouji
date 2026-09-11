import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';

const selectedThemes = [
  'gothic',
  'concept-20',
  'concept-33',
  'concept-57',
  'concept-58',
];

const outputDirectory = path.resolve('qa-screenshots/selected-concepts');
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const consoleErrors = [];
const report = [];

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
  await page.locator('.phone-shell').waitFor({ timeout: 30_000 });
  const unlock = page.getByRole('button', { name: '解锁' });
  if (await unlock.isVisible().catch(() => false)) await unlock.click();
  const dismissGuide = page.getByRole('button', { name: '知道了' });
  if (await dismissGuide.isVisible().catch(() => false)) await dismissGuide.click();

  for (const themeId of selectedThemes) {
    await page.locator('.dock button[data-screen="themes"]').click();
    const themeDisclosure = page.getByRole('button', { name: /整机主题/ });
    if (await themeDisclosure.getAttribute('aria-expanded') !== 'true') await themeDisclosure.click();

    if (themeId === selectedThemes[0]) {
      const pickerState = await page.locator('.appearance-choice-list').evaluate((list) => ({
        columns: getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length,
        cardCount: list.querySelectorAll('.theme-choice-card').length,
      }));
      assert.equal(pickerState.columns, 2, 'theme picker should use a compact two-column grid');
      assert.equal(pickerState.cardCount > 1, true, 'theme picker should show more than one selectable theme');
      await page.screenshot({ path: path.join(outputDirectory, 'themes-two-column.png'), fullPage: true });
    }

    const themeChoice = page.locator(`[data-theme-preview="${themeId}"]`);
    await themeChoice.scrollIntoViewIfNeeded();
    await themeChoice.click();
    assert.equal(await themeChoice.getAttribute('aria-pressed'), 'true', `${themeId} did not become selected`);
    assert.equal(await page.locator(`.theme-${themeId}`).count(), 1, `${themeId} class was not applied to the phone stage`);

    await page.getByRole('button', { name: '返回', exact: true }).click();
    await page.locator('.desktop-screen').waitFor();
    await page.waitForTimeout(180);

    const state = await page.evaluate((activeTheme) => {
      const viewportWidth = window.innerWidth;
      const pageWidth = document.documentElement.scrollWidth;
      const shell = document.querySelector('.phone-shell')?.getBoundingClientRect();
      const imageBed = document.querySelector('.image-bed');
      const imageBedBox = imageBed?.getBoundingClientRect();
      const timeCardBox = document.querySelector('.time-card')?.getBoundingClientRect();
      const appButtons = [...document.querySelectorAll('.desktop-canvas .app-button')]
        .filter((node) => node instanceof HTMLElement && node.offsetParent !== null);
      const dockButtons = [...document.querySelectorAll('.dock button')]
        .filter((node) => node instanceof HTMLElement && node.offsetParent !== null);
      const fitsShell = (box) => !box || !shell || (
        box.left >= shell.left - 1
        && box.right <= shell.right + 1
        && box.top >= shell.top - 1
        && box.bottom <= shell.bottom + 1
      );

      return {
        theme: activeTheme,
        pageWidth,
        viewportWidth,
        appCount: appButtons.length,
        dockCount: dockButtons.length,
        hasImageBed: Boolean(imageBed),
        hasBundledImage: Boolean(imageBed?.querySelector('img')),
        imageBedLabel: imageBed?.textContent?.trim() || '',
        imageBedFitsShell: fitsShell(imageBedBox),
        timeCardFitsShell: fitsShell(timeCardBox),
        appButtonsFitShell: appButtons.every((button) => fitsShell(button.getBoundingClientRect())),
        dockButtonsFitShell: dockButtons.every((button) => fitsShell(button.getBoundingClientRect())),
      };
    }, themeId);

    assert(state.pageWidth <= state.viewportWidth, `${themeId} has horizontal overflow: ${state.pageWidth} > ${state.viewportWidth}`);
    assert.equal(state.appCount, themeId === 'gothic' ? 7 : 8, `${themeId} should show every first-page app`);
    assert.equal(state.dockCount, 4, `${themeId} should show all 4 dock apps`);
    assert.equal(state.hasImageBed, true, `${themeId} is missing the custom image slot`);
    assert.equal(state.hasBundledImage, false, `${themeId} must not bake a fixed image into the custom image slot`);
    assert.match(state.imageBedLabel, /自定义图片/, `${themeId} custom image slot is not labelled clearly`);
    assert.equal(state.imageBedFitsShell, true, `${themeId} custom image slot leaves the phone shell`);
    assert.equal(state.timeCardFitsShell, true, `${themeId} time card leaves the phone shell`);
    assert.equal(state.appButtonsFitShell, true, `${themeId} has an app button outside the phone shell`);
    assert.equal(state.dockButtonsFitShell, true, `${themeId} has a dock button outside the phone shell`);

    await page.screenshot({ path: path.join(outputDirectory, `${themeId}.png`), fullPage: true });

    await page.locator('.page-dots button[aria-label="第 2 页"]').click();
    assert.equal(await page.locator('.page-dots button[aria-label="第 2 页"]').getAttribute('aria-current'), 'page', `${themeId} should open desktop page 2`);
    const secondPageState = await page.evaluate(() => {
      const visibleApps = [...document.querySelectorAll('.desktop-canvas .app-button')]
        .filter((node) => node instanceof HTMLElement && node.offsetParent !== null);
      const controls = document.querySelector('.layout-controls')?.getBoundingClientRect();
      const boxes = visibleApps.map((node) => node.getBoundingClientRect());
      const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const iconVisible = (button) => {
        const icon = button.querySelector('.app-icon');
        const art = button.querySelector('.gothic-app-art');
        const artStyle = art ? getComputedStyle(art) : null;
        const svg = button.querySelector('svg');
        const svgStyle = svg ? getComputedStyle(svg) : null;
        return Boolean(
          (artStyle && artStyle.display !== 'none' && artStyle.backgroundImage !== 'none')
          || (svgStyle && svgStyle.display !== 'none' && svgStyle.opacity !== '0')
          || icon?.querySelector('img')
        );
      };
      return {
        appCount: visibleApps.length,
        iconsVisible: visibleApps.every(iconVisible),
        overlapsControls: Boolean(controls && boxes.some((box) => overlaps(box, controls))),
        overlapsApps: boxes.some((box, index) => boxes.some((other, otherIndex) => otherIndex > index && overlaps(box, other))),
      };
    });
    assert.equal(secondPageState.appCount, themeId === 'gothic' ? 13 : 12, `${themeId} should show every second-page app`);
    assert.equal(secondPageState.iconsVisible, true, `${themeId} has a blank second-page app icon`);
    assert.equal(secondPageState.overlapsControls, false, `${themeId} second-page apps overlap the layout control`);
    assert.equal(secondPageState.overlapsApps, false, `${themeId} second-page apps overlap each other`);
    await page.screenshot({ path: path.join(outputDirectory, `${themeId}-page-2.png`), fullPage: true });
    await page.locator('.page-dots button[aria-label="第 1 页"]').click();
    assert.equal(await page.locator('.page-dots button[aria-label="第 1 页"]').getAttribute('aria-current'), 'page', `${themeId} should return to desktop page 1`);

    await page.locator('.app-button[data-screen="wechat"]').click();
    await page.locator('.phone-shell.screen-wechat').waitFor();
    const wechatState = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      hasTopbar: Boolean(document.querySelector('.wechat-topbar')),
      hasBackButton: Boolean(document.querySelector('.shell-app-back-button')),
    }));
    assert(wechatState.pageWidth <= wechatState.viewportWidth, `${themeId} WeChat screen has horizontal overflow`);
    assert.equal(wechatState.hasTopbar, true, `${themeId} WeChat topbar is missing`);
    assert.equal(wechatState.hasBackButton, true, `${themeId} WeChat desktop back button is missing`);
    await page.screenshot({ path: path.join(outputDirectory, `${themeId}-wechat.png`), fullPage: true });
    await page.locator('.wechat-topbar .wechat-icon-button').first().click();
    await page.locator('.desktop-screen').waitFor();

    report.push(state);
  }

  assert.deepEqual(consoleErrors, [], `console errors:\n${consoleErrors.join('\n')}`);
  await writeFile(
    path.join(outputDirectory, 'report.json'),
    `${JSON.stringify({ viewport: '390x844', themes: report, consoleErrors }, null, 2)}\n`,
    'utf8',
  );
  console.log(`selected theme visual regression passed (${report.length} themes)`);
  console.log(outputDirectory);
} finally {
  await browser.close();
}
