import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../mobile-export/App.js', import.meta.url), 'utf8');
const appConfig = JSON.parse(readFileSync(new URL('../mobile-export/app.json', import.meta.url), 'utf8'));
const androidGradle = readFileSync(
  new URL('../mobile-export/android-local-backup/app/build.gradle', import.meta.url),
  'utf8',
);

assert.match(
  app,
  /const SMALL_PHONE_STORAGE_ORIGIN = 'https:\/\/small-phone\.local\/';/,
  'APK must keep the historical WebView origin so upgrades can read existing localStorage and IndexedDB data.',
);
assert.match(
  app,
  /useState\(SMALL_PHONE_STORAGE_ORIGIN\)/,
  'APK must start on the stable historical storage origin.',
);
assert.match(
  app,
  /source=\{\{ html: WEB_HTML, baseUrl: storageOrigin \}\}/,
  'APK WebView must use the guarded storage-origin state.',
);
assert.doesNotMatch(
  app,
  /source=\{\{ html: WEB_HTML, baseUrl: 'file:\/\/\/android_asset\/' \}\}/,
  'file:///android_asset/ must never replace the historical storage origin.',
);
assert.match(app, /message\?\.type === 'small-phone-switch-storage-origin'/, 'APK must expose explicit recovery access to the broken 1.16.1 origin.');
assert.equal(appConfig.expo.version, '1.16.4');
assert.equal(appConfig.expo.android.versionCode, 38);
assert.match(androidGradle, /versionCode 38/);
assert.match(androidGradle, /versionName "1\.16\.4"/);

console.log('mobile storage origin and Android version guard ok');
