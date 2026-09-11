import assert from 'node:assert/strict';

import { collectImageAssetReferences, IMAGE_ASSET_SCHEME, isImageAssetReference } from './imageAssetStore';

const first = `${IMAGE_ASSET_SCHEME}one`;
const second = `${IMAGE_ASSET_SCHEME}two`;
const refs = collectImageAssetReferences({
  gallery: [{ url: first }],
  chat: { image: second },
  duplicate: first,
  ignored: 'data:image/png;base64,abc',
});

assert.deepEqual(Array.from(refs).sort(), [first, second]);
assert.equal(isImageAssetReference(first), true);
assert.equal(isImageAssetReference('https://example.test/image.png'), false);

console.log('image asset reference scan ok');
