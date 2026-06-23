import assert from 'node:assert/strict';
import {
  buildVideoCallOpeningLine,
  getVideoCallDefaultScene,
  getVideoCallDurationLabel,
  getVideoCallPhaseText,
} from './videoCallLogic';

assert.match(getVideoCallPhaseText('ready', 'Alice'), /Alice/);
assert.match(getVideoCallPhaseText('calling', 'Alice'), /Alice/);
assert.match(getVideoCallPhaseText('connected', 'Alice'), /Alice/);
assert.match(getVideoCallPhaseText('ended', 'Alice'), /Alice/);

assert.match(
  getVideoCallDefaultScene({ name: 'Alice', description: 'Brave knight', personality: '', firstMessage: '' }),
  /镜头|画面|背景/,
);
assert.equal(
  getVideoCallDefaultScene({ name: 'Alice', description: 'Brave knight', personality: '', firstMessage: 'Camera on?' }),
  '镜头轻轻晃了一下，画面从模糊慢慢对上焦。背景里有一点生活里的光和声音。',
);
assert.equal(
  buildVideoCallOpeningLine({ name: 'Alice', firstMessage: 'Camera on?' }),
  '喂？我是Alice。镜头能看到我吗？',
);
assert.doesNotMatch(
  getVideoCallDefaultScene({
    name: 'Alice',
    description: '<character_design_complex> # SFW - character setup',
    personality: '',
    firstMessage: '',
  }),
  /character_design|SFW|character setup/,
);
assert.equal(getVideoCallDurationLabel(null, 1000), '00:00');
assert.equal(getVideoCallDurationLabel(1000, 66_000), '01:05');

console.log('video call logic tests passed');
