import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useAppStore, type TheaterScene } from '../../store';
import { TheaterScreen } from './TheaterScreen';

const initialSnapshot = useAppStore.getInitialState();
const originalScenes = initialSnapshot.theaterScenes;
const scene = {
  id: 'saved-scene', title: '历史剧情', theme: '恢复上次主题', characterIds: [], style: 'random',
  length: 'custom', customLengthText: '4000', rollResult: '恢复上次世界输入',
  content: '已保存正文'.repeat(400) + '结尾不能消失', beats: [], source: 'ai', createdAt: 1, updatedAt: 1, favorite: false,
} as TheaterScene;
// Isolated server render: no writes to the player's persisted state.
initialSnapshot.theaterScenes = [scene];
try {
  const html = renderToStaticMarkup(<TheaterScreen />);
  assert.match(html, /aria-label="自定义字数"[^>]*value="4000"/);
  assert.match(html, /恢复上次主题/);
  assert.match(html, /恢复上次世界输入/);
  assert.match(html, /结尾不能消失/);
  assert.equal((html.match(/>继续写<\/button>/g) || []).length, 2, 'continue is accessible above and below the story');
  scene.customLengthText = '旧版自由字数';
  assert.doesNotThrow(() => renderToStaticMarkup(<TheaterScreen />), 'invalid old length must not crash the history screen');
} finally {
  initialSnapshot.theaterScenes = originalScenes;
}
console.log('theater screen restores length/theme/roll and renders full story plus continuation controls');
