import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ChatBubble } from './ChatBubble';
import { parseOpenMojiEmotionText } from '../wechatInteraction';

const textMarkup = renderToStaticMarkup(
  <ChatBubble
    role="user"
    content="今晚一起吃饭吗"
    kind="text"
    channel="wechat"
    timestamp={1_720_000_000_000}
  />,
);

assert.match(textMarkup, /今晚一起吃饭吗/);
assert.match(textMarkup, /wechat-text-user/);

const transferMarkup = renderToStaticMarkup(
  <ChatBubble
    role="model"
    content="转账"
    kind="transfer"
    channel="wechat"
    amount="42"
    note="奶茶钱"
    status="pending"
  />,
);

assert.match(transferMarkup, /奶茶钱/);
assert.match(transferMarkup, /￥42/);
assert.match(transferMarkup, /点击收款/);

assert.deepEqual(parseOpenMojiEmotionText('[emotion] OpenMoji pack: happy and nervous'), {
  title: 'OpenMoji emotion',
  body: 'happy and nervous',
});

const emotionMarkup = renderToStaticMarkup(
  <ChatBubble
    role="model"
    content="[emotion] OpenMoji pack: happy and nervous"
    kind="text"
    channel="wechat"
  />,
);

assert.match(emotionMarkup, /wechat-emotion-card/);
assert.match(emotionMarkup, /happy and nervous/);

const selectedMarkup = renderToStaticMarkup(
  <ChatBubble
    role="model"
    content="可以删掉这一条"
    kind="text"
    channel="wechat"
    selectionMode
    selected
  />,
);

assert.match(selectedMarkup, /wechat-selection-dot/);
assert.match(selectedMarkup, /取消选择消息/);

for (const kind of ['theater', 'call-note']) {
  const theaterMarkup = renderToStaticMarkup(
    <ChatBubble
      role="model"
      content="【小剧场】雨夜重逢\n两个人终于把误会说开。"
      kind={kind}
      channel="wechat"
      showTools
      onDelete={() => undefined}
      onCopy={() => undefined}
      onToggleFavorite={() => undefined}
    />,
  );
  assert.match(theaterMarkup, /wechat-theater-card/);
  assert.match(theaterMarkup, /展开全文/);
  assert.match(theaterMarkup, /删除/);
}

console.log('chat bubble component ok');
