import type { Character } from '../../store';

export type VideoCallPhase = 'ready' | 'calling' | 'connected' | 'ended';

export function getVideoCallPhaseText(phase: VideoCallPhase, characterName = '对方') {
  if (phase === 'ready') return `等待呼唤 ${characterName}`;
  if (phase === 'calling') return `正在呼唤 ${characterName}`;
  if (phase === 'connected') return `已接通 ${characterName}`;
  return `已结束和 ${characterName} 的视频通话`;
}

export function getVideoCallDefaultScene(_character?: Pick<Character, 'name' | 'description' | 'personality' | 'firstMessage'> | null) {
  return '镜头轻轻晃了一下，画面从模糊慢慢对上焦。背景里有一点生活里的光和声音。';
}

export function buildVideoCallOpeningLine(character?: Pick<Character, 'name' | 'firstMessage'> | null) {
  const name = character?.name || '对方';
  return `喂？我是${name}。镜头能看到我吗？`;
}

export function getVideoCallDurationLabel(startedAt: number | null, now: number) {
  if (!startedAt) return '00:00';
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}
