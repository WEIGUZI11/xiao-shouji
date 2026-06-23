import assert from 'node:assert/strict';

import {
  DEFAULT_SOFTWARE_AVATAR_LOGO,
  normalizeAppIconOverrides,
  resolveAppIconImage,
  isDefaultSoftwareAvatarLogo,
  updateAppIconOverride,
} from './appIconOverrides';

assert.equal(DEFAULT_SOFTWARE_AVATAR_LOGO, '/default-software-avatar-logo.png');
assert.equal(isDefaultSoftwareAvatarLogo(DEFAULT_SOFTWARE_AVATAR_LOGO), true);
assert.equal(isDefaultSoftwareAvatarLogo(` ${DEFAULT_SOFTWARE_AVATAR_LOGO} `), true);
assert.equal(isDefaultSoftwareAvatarLogo('data:image/png;base64,abc'), false);

assert.deepEqual(
  normalizeAppIconOverrides({
    wechat: ' data:image/png;base64,abc ',
    contacts: '',
    phone: 42,
    __proto__: 'pollution',
  }),
  { wechat: 'data:image/png;base64,abc' },
);

const withWechat = updateAppIconOverride({}, 'wechat', ' data:image/png;base64,abc ');
assert.deepEqual(withWechat, { wechat: 'data:image/png;base64,abc' });
assert.equal(resolveAppIconImage('wechat', withWechat), 'data:image/png;base64,abc');

const cleared = updateAppIconOverride(withWechat, 'wechat', '   ');
assert.deepEqual(cleared, {});
assert.equal(resolveAppIconImage('wechat', cleared), null);

console.log('app icon override helpers ok');
