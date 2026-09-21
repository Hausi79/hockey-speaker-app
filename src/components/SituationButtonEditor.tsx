import { useEffect, useState } from 'react';
import type { SituationButtonConfig, SituationButtonMode } from '../storage/types';

interface SituationButtonEditorProps {
  button: SituationButtonConfig;
  onSave: (button: SituationButtonConfig) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const COLOR_PRESETS = [
  '#1db954',
  '#ff4d4f',
  '#3b82f6',
  '#f59e0b',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#6b7280',
];

export function SituationButtonEditor({
  button,
  onSave,
  onDelete,
  onClose,
}: SituationButtonEditorProps) {
  const [label, setLabel] = useState(button.label);
  const [mode, setMode] = useState<SituationButtonMode>(button.mode);
  const [spotifyUri, setSpotifyUri] = useState(button.spotifyUri);
  const [startSeconds, setStartSeconds] = useState(
    Math.round(button.startPositionMs / 1000),
  );
  const [color, setColor] = useState(button.color);

  useEffect(() => {
    setLabel(button.label);
    setMode(button.mode);
    setSpotifyUri(button.spotifyUri);
    setStartSeconds(Math.round(button.startPositionMs / 1000));
    setColor(button.color);
  }, [button]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Button bearbeiten</h2>

        <label>
          Name
          <input value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>

        <label>Typ</label>
        <div className="mode-toggle">
          <button
            type="button"
            className={`mode-toggle__option ${mode === 'track' ? 'mode-toggle__option--selected' : ''}`}
            onClick={() => setMode('track')}
          >
            🎵 Einzeltitel
          </button>
          <button
            type="button"
            className={`mode-toggle__option ${mode === 'playlist' ? 'mode-toggle__option--selected' : ''}`}
            onClick={() => setMode('playlist')}
          >
            📃 Playlist
          </button>
        </div>
        <p className="modal__hint">
          {mode === 'track'
            ? 'Spielt immer denselben Titel (z. B. Tor, Strafe).'
            : 'Wählt bei jedem Tap zufällig einen noch nicht gespielten Titel aus der Playlist (z. B. Einlaufen, Pause).'}
        </p>

        <label>
          {mode === 'track' ? 'Spotify Track-URI' : 'Spotify Playlist-URI'}
          <input
            placeholder={mode === 'track' ? 'spotify:track:...' : 'spotify:playlist:...'}
            value={spotifyUri}
            onChange={(e) => setSpotifyUri(e.target.value)}
          />
        </label>
        <p className="modal__hint">
          Die URI findest du in Spotify über „Teilen&nbsp;→&nbsp;Spotify-URI kopieren“.
        </p>

        <label>
          Startpunkt (Sekunden ab Songbeginn)
          <input
            type="number"
            min={0}
            value={startSeconds}
            onChange={(e) => setStartSeconds(Number(e.target.value))}
          />
        </label>

        <label>Farbe</label>
        <div className="color-presets">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              className={`color-swatch ${color === c ? 'color-swatch--selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={c}
            />
          ))}
        </div>

        <div className="modal__actions">
          <button className="btn-secondary" onClick={() => onDelete(button.id)}>
            Löschen
          </button>
          <div className="modal__actions-right">
            <button className="btn-secondary" onClick={onClose}>
              Abbrechen
            </button>
            <button
              className="btn-primary"
              onClick={() =>
                onSave({
                  ...button,
                  label: label.trim() || button.label,
                  mode,
                  spotifyUri: spotifyUri.trim(),
                  startPositionMs: Math.max(0, startSeconds) * 1000,
                  color,
                })
              }
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
