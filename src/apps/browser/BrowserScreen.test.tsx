import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useAppStore, type BrowserSearchResult } from '../../store';
import { BrowserScreen } from './BrowserScreen';

// Exercise the real component's click handlers and React state without player storage.
const initial = useAppStore.getInitialState();
const saved = { ...initial };
const originalFetch = globalThis.fetch;
const result: BrowserSearchResult = { title: '测试文章', url: 'https://example.org/test', snippet: '测试正文' };
const search = { id: 'saved-search', query: '最近世界发生了什么大事', summary: '测试摘要', results: [result], source: 'generated' as const, createdAt: 1 };

function findButton(node: React.ReactNode, matches: (props: any) => boolean): any {
  for (const child of React.Children.toArray(node)) {
    if (!React.isValidElement(child)) continue;
    const props = child.props as any;
    if (child.type === 'button' && matches(props)) return props;
    const found = findButton(props.children, matches);
    if (found) return found;
  }
}

function clickSequence(actions: Array<(tree: React.ReactNode) => void>) {
  function Harness() {
    const [step, setStep] = useState(0);
    const tree = BrowserScreen();
    if (step < actions.length) {
      actions[step](tree);
      setStep(step + 1);
    }
    return tree;
  }
  return renderToStaticMarkup(<Harness />);
}

const back = (tree: React.ReactNode) => findButton(tree, (p) => p['aria-label'] === '浏览器返回').onClick();
const close = (tree: React.ReactNode) => findButton(tree, (p) => p['aria-label'] === '返回桌面').onClick();
function seed(records = [search]) {
  initial.browserSearches = records;
  initial.browserBookmarks = [];
  initial.browserHistory = [];
  useAppStore.setState({ activeScreen: 'browser', previousScreen: 'desktop', browserSearches: records, browserHistory: [] });
}

try {
  seed();
  let html = clickSequence([back]);
  assert.match(html, /browser-home-search/);
  assert.doesNotMatch(html, /browser-result-list/);
  assert.equal(useAppStore.getState().activeScreen, 'browser');
  seed();
  clickSequence([back, back]);
  assert.equal(useAppStore.getState().activeScreen, 'desktop');
  assert.deepEqual(useAppStore.getState().browserSearches, [search]);
  seed();
  clickSequence([close]);
  assert.equal(useAppStore.getState().activeScreen, 'desktop');
  seed();
  html = clickSequence([
    (tree) => findButton(tree, (p) => p.className === 'w-full text-left').onClick(),
    back,
  ]);
  assert.match(html, /browser-result-list/);
  assert.doesNotMatch(html, /browser-page-view/);
  seed();
  html = clickSequence([back, (tree) => findButton(tree, (p) => React.Children.toArray(p.children).some((c: any) => c?.props?.children === '书签')).onClick()]);
  assert.match(html, /还没有书签/);
  assert.doesNotMatch(html, /browser-home-search/);
  for (const panel of ['书签', '历史', '浏览器设置']) {
    seed();
    html = clickSequence([
      (tree) => findButton(tree, (p) => p.className === 'w-full text-left').onClick(),
      (tree) => findButton(tree, (p) => p['aria-label'] === panel || React.Children.toArray(p.children).some((c: any) => c?.props?.children === panel)).onClick(),
    ]);
    assert.doesNotMatch(html, /browser-page-view/, `${panel} must replace the open article`);
    assert.match(html, new RegExp(panel));
  }
  seed();
  html = clickSequence([(tree) => findButton(tree, (p) => p.className === 'browser-inline-delete').onClick()]);
  assert.match(html, /role="status"[^>]*>已加入书签/);
  seed([]);
  clickSequence([back]);
  assert.equal(useAppStore.getState().activeScreen, 'desktop');
  seed();
  initial.browserApiBaseUrl = 'https://browser-test.invalid/v1';
  initial.browserSelectedModel = 'test-model';
  initial.browserApiKey = '';
  initial.apiKey = '';
  let completeRequest!: (response: Response) => void;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return new Promise<Response>((resolve) => { completeRequest = resolve; });
  };
  let refresh!: () => Promise<void>;
  clickSequence([(tree) => { refresh = findButton(tree, (p) => p['aria-label'] === '刷新搜索').onClick; }]);
  const pending = refresh();
  await refresh();
  assert.equal(requestCount, 1, 'rapid refresh must submit only one request');
  assert.equal(useAppStore.getState().browserSearches.length, 1, 'duplicate attempt must not create a fallback record');
  completeRequest(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: '摘要', results: [result] }) }, finish_reason: 'stop' }] })));
  await pending;
  assert.equal(useAppStore.getState().browserSearches.length, 2);
  const retry = refresh();
  assert.equal(requestCount, 2, 'search lock must release after completion');
  completeRequest(new Response('failed', { status: 500 }));
  await retry;
  assert.equal(useAppStore.getState().browserSearches[0].source, 'generated');
} finally {
  globalThis.fetch = originalFetch;
  Object.assign(initial, saved);
  useAppStore.setState(saved, true);
}
console.log('browser return, direct desktop exit, article return and saved search preservation passed');
