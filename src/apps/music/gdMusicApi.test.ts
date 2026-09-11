import assert from 'node:assert/strict';

import {
  buildGdMusicLyricUrl,
  buildGdMusicPicUrl,
  buildGdMusicSearchUrl,
  buildGdMusicUrlCandidates,
  defaultGdMusicAdvancedSettings,
  extractGdMusicLyrics,
  extractGdMusicPlayUrl,
  gdMusicQualityOptions,
  normalizeGdMusicBaseUrl,
  normalizeGdMusicSearchResults,
  normalizeGdMusicSources,
} from './gdMusicApi';

const baseUrl = normalizeGdMusicBaseUrl('');
const keyword = '\u5C4B\u9876';
const title = '\u5C4B\u9876';
const artistA = '\u5468\u6770\u4F26';
const artistB = '\u6E29\u5C9A';
const album = '\u7537\u5973\u60C5\u6B4C\u5BF9\u5531\u51A0\u519B';

assert.equal(baseUrl, 'https://music-api.gdstudio.xyz/api.php');
assert.deepEqual(normalizeGdMusicSources('netease\uFF0Cbilibili\u3001joox netease'), ['netease', 'bilibili', 'joox']);
assert.deepEqual(defaultGdMusicAdvancedSettings, {
  gdBaseUrl: 'https://music-api.gdstudio.xyz/api.php',
  gdSources: 'netease,bilibili,joox',
  gdQuality: '320',
  neteaseBaseUrl: '',
  qqBaseUrl: '',
});
assert.deepEqual(
  gdMusicQualityOptions.map((option) => option.value),
  ['320', '999', '740', '192', '128'],
);
assert.equal(gdMusicQualityOptions[0].label, '\u6807\u51C6 320kbps\uFF08\u63A8\u8350\uFF09');

assert.equal(
  buildGdMusicSearchUrl({ baseUrl, source: 'netease', keyword, count: 20, page: 1 }),
  'https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=%E5%B1%8B%E9%A1%B6&count=20&pages=1',
);

const results = normalizeGdMusicSearchResults({
  value: [
    {
      id: '5257138',
      name: title,
      artist: [artistA, artistB],
      album,
      pic_id: '109951165671182684',
      url_id: '5257138',
      lyric_id: '5257138',
      source: 'netease',
    },
    { id: '', name: 'bad' },
  ],
});

assert.equal(results.length, 1);
assert.equal(results[0].title, title);
assert.equal(results[0].artist, `${artistA} / ${artistB}`);
assert.equal(results[0].album, album);
assert.equal(results[0].gdSource, 'netease');
assert.equal(results[0].sourceId, '5257138');
assert.equal(results[0].coverId, '109951165671182684');
assert.equal(results[0].lyricId, '5257138');

assert.deepEqual(
  buildGdMusicUrlCandidates({ baseUrl, source: 'netease', id: '5257138', qualities: ['999', '320'] }),
  [
    'https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=5257138&br=999',
    'https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=5257138&br=320',
  ],
);

assert.equal(
  buildGdMusicPicUrl({ baseUrl, source: 'netease', id: '109951165671182684', size: 300 }),
  'https://music-api.gdstudio.xyz/api.php?types=pic&source=netease&id=109951165671182684&size=300',
);
assert.equal(
  buildGdMusicPicUrl({ baseUrl, source: 'bilibili', id: '//i0.hdslb.com/cover.jpg', size: 300 }),
  'https://i0.hdslb.com/cover.jpg',
);
assert.equal(
  buildGdMusicLyricUrl({ baseUrl, source: 'netease', id: '5257138' }),
  'https://music-api.gdstudio.xyz/api.php?types=lyric&source=netease&id=5257138',
);

assert.deepEqual(
  extractGdMusicPlayUrl({ url: 'http://example.test/song.mp3', br: 320, size: 1234 }),
  { audioUrl: 'http://example.test/song.mp3', quality: '320', size: 1234 },
);
assert.equal(
  extractGdMusicLyrics({ lyric: '[00:01]\u4E00\u53E5\u6B4C\u8BCD', tlyric: '[00:01]translation' }),
  '[00:01]\u4E00\u53E5\u6B4C\u8BCD\n[translation]\n[00:01]translation',
);

console.log('gd music api helpers ok');
