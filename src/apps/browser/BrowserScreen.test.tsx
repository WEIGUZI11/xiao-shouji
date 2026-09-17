import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useAppStore, type BrowserSearchResult } from '../../store';
import { BrowserScreen } from './BrowserScreen';

// Exercise the real component's click handlers and React state without player storage.
const initial = useAppStore.getInitialState();
const saved = { ...initial };
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
  seed([]);
  clickSequence([back]);
  assert.equal(useAppStore.getState().activeScreen, 'desktop');
} finally {
  Object.assign(initial, saved);
  useAppStore.setState(saved, true);
}
console.log('browser return, direct desktop exit, article return and saved search preservation passed');
