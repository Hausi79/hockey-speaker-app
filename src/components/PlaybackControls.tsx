interface PlaybackControlsProps {
  isPlaying: boolean;
  volumePercent: number | null;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onVolumeChange: (percent: number) => void;
}

export function PlaybackControls({
  isPlaying,
  volumePercent,
  onPlayPause,
  onNext,
  onPrevious,
  onVolumeChange,
}: PlaybackControlsProps) {
  return (
    <div className="playback-controls">
      <div className="playback-controls__buttons">
        <button className="btn-control" onClick={onPrevious} aria-label="Zurück">
          ⏮
        </button>
        <button className="btn-control btn-control--main" onClick={onPlayPause} aria-label="Play/Pause">
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="btn-control" onClick={onNext} aria-label="Vor">
          ⏭
        </button>
      </div>
      <div className="playback-controls__volume">
        <span>🔊</span>
        <input
          type="range"
          min={0}
          max={100}
          value={volumePercent ?? 50}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
        />
        <span>{volumePercent ?? '–'}%</span>
      </div>
    </div>
  );
}
