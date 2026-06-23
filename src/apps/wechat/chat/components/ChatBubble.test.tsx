import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ChatBubble } from './ChatBubble';

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

console.log('chat bubble component ok');
