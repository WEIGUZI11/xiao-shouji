import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const consoleErrors = [];
let forwardedImagePayload = null;

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
await page.route('**/api/image/proxy', async (route) => {
  forwardedImagePayload = route.request().postDataJSON();
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [{ b64_json: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z3m8AAAAASUVORK5CYII=' }] }),
  });
});

try {
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '解锁' }).click();
  const dismissGuide = page.getByRole('button', { name: '知道了' });
  if (await dismissGuide.isVisible().catch(() => false)) await dismissGuide.click();
  await page.getByRole('button', { name: '设置' }).click();
  await page.getByRole('button', { name: '生图配置' }).click();
  await page.getByRole('button', { name: '自定义', exact: true }).click();
  await page.getByRole('button', { name: /高级生图参数/ }).click();
  await page.getByRole('button', { name: 'OpenAI', exact: true }).click();

  await page.getByPlaceholder('https://your-image-api.example/v1/images/generations').fill('https://api.openai.com/v1');
  await page.getByPlaceholder('只保存在本机浏览器里').fill('test-redacted-key');
  await page.getByPlaceholder('先拉取模型；自定义接口也可手动填写').fill('gpt-image-1.5');
  await page.getByRole('button', { name: '小图测试' }).click();
  await page.getByText(/小图测试成功/).waitFor({ timeout: 15000 });

  assert(forwardedImagePayload, 'image request did not use the same-origin proxy');
  assert.equal(forwardedImagePayload.url, 'https://api.openai.com/v1/images/generations');
  const upstreamBody = JSON.parse(forwardedImagePayload.init.body);
  assert.equal(upstreamBody.model, 'gpt-image-1.5');
  assert.equal(upstreamBody.size, '1024x1024');
  assert.equal(upstreamBody.quality, 'low');
  assert.equal('response_format' in upstreamBody, false);

  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    testImageVisible: Boolean(document.querySelector('img[alt="生图测试结果"]')),
  }));
  assert(layout.width <= layout.viewport, `horizontal overflow: ${layout.width} > ${layout.viewport}`);
  assert.equal(layout.testImageVisible, true);

  await page.setViewportSize({ width: 390, height: 600 });
  assert.equal(await page.getByRole('button', { name: '小图测试' }).isVisible(), true);
  assert.deepEqual(consoleErrors, []);
  console.log('v1.12 browser UI regression passed');
} finally {
  await browser.close();
}
