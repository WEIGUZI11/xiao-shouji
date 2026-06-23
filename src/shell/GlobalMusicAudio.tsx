/**
 * Hidden global audio element for the phone shell music player.
 * Main component: GlobalMusicAudio.
 * Dependencies: music player state from useAppStore.
 * Maintenance note: music library UI stays in src/apps/music; this component only keeps playback alive across screens.
 */
import { useEffect, useRef } from 'react';

import { useAppStore } from '../store';

export function GlobalMusicAudio() {
  const { musicTracks, musicPlayer, setMusicPlayer } = useAppStore();
  const currentTrack = musicTracks.find((track) => track.id === musicPlayer.trackId);
  const lastTrackId = useRef<string | undefined>(undefined);

  useEffect(() => {
    const audio = document.getElementById('global-music-audio') as HTMLAudioElement | null;
    if (!audio || !currentTrack?.audioUrl) return;
    if (lastTrackId.current !== currentTrack.id && audio.src !== currentTrack.audioUrl) {
      audio.src = currentTrack.audioUrl;
      lastTrackId.current = currentTrack.id;
    }
    if (musicPlayer.playing) {
      audio.play().catch(() => setMusicPlayer({ playing: false }));
    } else {
      audio.pause();
      audio.muted = false;
      audio.volume = 1;
    }
  }, [currentTrack?.audioUrl, currentTrack?.id, musicPlayer.playing, setMusicPlayer]);

  return (
    <audio
      id="global-music-audio"
      preload="auto"
      className="hidden"
      onLoadedMetadata={(event) => setMusicPlayer({ duration: Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0 })}
      onTimeUpdate={(event) => {
        const audio = event.currentTarget;
        const duration = Number.isFinite(audio.duration) ? audio.duration : musicPlayer.duration;
        setMusicPlayer({ duration, progress: duration > 0 ? (audio.currentTime / duration) * 100 : 0 });
      }}
      onEnded={(event) => {
        if (musicPlayer.repeat) {
          event.currentTarget.currentTime = 0;
          event.currentTarget.play().catch(() => setMusicPlayer({ playing: false }));
          setMusicPlayer({ playing: true, progress: 0 });
          return;
        }
        setMusicPlayer({ playing: false, progress: 100 });
      }}
      onError={() => setMusicPlayer({ playing: false })}
    />
  );
}
