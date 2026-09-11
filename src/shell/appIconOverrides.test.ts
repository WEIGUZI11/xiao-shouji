import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DEFAULT_SOFTWARE_AVATAR_LOGO,
  hasPersistedAppIconOverride,
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
assert.equal(hasPersistedAppIconOverride(JSON.stringify({ state: { appIconOverrides: withWechat } }), 'wechat', withWechat.wechat), true);
assert.equal(hasPersistedAppIconOverride('{broken', 'wechat', withWechat.wechat), false);
assert.equal(hasPersistedAppIconOverride(null, 'wechat', withWechat.wechat), false);

const desktopSource = readFileSync(new URL('./Desktop.tsx', import.meta.url), 'utf8');
assert.match(desktopSource, /<PersistentImage[\s\S]{0,120}src=\{iconUrl\}/, 'desktop and dock should resolve persisted app icon assets');
assert.match(desktopSource, /fallback=\{<>\s*<span className="gothic-app-art"/, 'broken custom icons should restore the built-in themed artwork');

console.log('app icon override helpers ok');
