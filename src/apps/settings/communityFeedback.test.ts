import assert from 'node:assert/strict';

import { communityFeedbackUrl, openCommunityFeedback } from './communityFeedback';

assert.equal(communityFeedbackUrl, 'https://discord.gg/VpM25X3edm');

let nativeMessage = '';
assert.equal(openCommunityFeedback({
  ReactNativeWebView: { postMessage: (message) => { nativeMessage = message; } },
}), 'native');
assert.deepEqual(JSON.parse(nativeMessage), {
  type: 'open-url',
  url: communityFeedbackUrl,
});

let browserUrl = '';
assert.equal(openCommunityFeedback({
  location: { assign: (url) => { browserUrl = url; } },
}), 'browser');
assert.equal(browserUrl, communityFeedbackUrl);

console.log('community feedback link ok');
