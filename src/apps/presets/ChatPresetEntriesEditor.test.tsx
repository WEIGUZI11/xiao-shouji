import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ChatPresetEntriesEditor } from './ChatPresetEntriesEditor';

const markup = renderToStaticMarkup(
  <ChatPresetEntriesEditor
    entries={[
      { id: 'entry-a', name: '怪兽活动规则', role: 'system', content: '保持人物行动连续。', enabled: true },
      { id: 'entry-b', name: '思维链测试', role: 'assistant', content: '不要默认开启。', enabled: false },
    ]}
    onChange={() => undefined}
  />,
);

assert.match(markup, /共 2 条 · 已开启 1 条/);
assert.match(markup, /＋ 新增/);
assert.match(markup, /搜索条目/);
assert.match(markup, /怪兽活动规则/);
assert.match(markup, /思维链测试/);
assert.match(markup, /关闭 怪兽活动规则/);
assert.match(markup, /删除 怪兽活动规则/);
assert.match(markup, /复制 怪兽活动规则/);
assert.match(markup, /拖动 怪兽活动规则/);
assert.doesNotMatch(markup, /window\.confirm/);

const pinnedMarkup = renderToStaticMarkup(
  <ChatPresetEntriesEditor
    entries={[{ id: 'personaDescription', name: 'user 设定', role: 'system', content: '', enabled: true }]}
    onChange={() => undefined}
  />,
);
assert.match(pinnedMarkup, /图钉是人物、用户、世界信息和聊天记录的动态插槽/);
assert.doesNotMatch(pinnedMarkup, /删除 user 设定/);
assert.doesNotMatch(pinnedMarkup, /复制 user 设定/);
assert.match(pinnedMarkup, /拖动 user 设定/);

const largeMarkup = renderToStaticMarkup(
  <ChatPresetEntriesEditor
    entries={Array.from({ length: 31 }, (_, index) => ({ id: `entry-${index}`, name: `条目 ${index + 1}`, role: 'system' as const, content: '', enabled: true }))}
    onChange={() => undefined}
  />,
);
assert.match(largeMarkup, /再显示 30 条（剩余 1 条）/);
assert.doesNotMatch(largeMarkup, /31\. 条目 31/);

console.log('chat preset entry editor ok');
