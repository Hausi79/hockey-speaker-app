import type { PlaybackState } from '../spotify/types';

interface NowPlayingProps {
  playback: PlaybackState | null;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function NowPlaying({ playback }: NowPlayingProps) {
  if (!playback || !playback.track) {
    return (
      <div className="now-playing now-playing--empty">
        <p>Keine aktive Wiedergabe.</p>
      </div>
    );
  }

  const { track, progressMs, isPlaying } = playback;
  const progressPercent = track.durationMs
    ? Math.min(100, (progressMs / track.durationMs) * 100)
    : 0;

  return (
    <div className="now-playing">
      {track.albumArt && (
        <img className="now-playing__cover" src={track.albumArt} alt="" />
      )}
      <div className="now-playing__info">
        <div className="now-playing__title">{track.name}</div>
        <div className="now-playing__artist">{track.artists}</div>
        <div className="now-playing__progress-track">
          <div
            className="now-playing__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="now-playing__time">
          {formatMs(progressMs)} / {formatMs(track.durationMs)}{' '}
          {isPlaying ? '▶' : '⏸'}
        </div>
      </div>
    </div>
  );
}
