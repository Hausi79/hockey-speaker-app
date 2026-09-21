import { useEffect, useState } from 'react';
import type { SituationButtonConfig, SituationButtonMode } from '../storage/types';
import { getSpotifyUriType, normalizeSpotifyUri } from '../spotify/uri';

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
  const [spotifyInput, setSpotifyInput] = useState(button.spotifyUri);
  const [startSeconds, setStartSeconds] = useState(
    Math.round(button.startPositionMs / 1000),
  );
  const [color, setColor] = useState(button.color);

  useEffect(() => {
    setLabel(button.label);
    setMode(button.mode);
    setSpotifyInput(button.spotifyUri);
    setStartSeconds(Math.round(button.startPositionMs / 1000));
    setColor(button.color);
  }, [button]);

  const normalizedUri = normalizeSpotifyUri(spotifyInput);
  const detectedType = normalizedUri ? getSpotifyUriType(normalizedUri) : 'unknown';
  const expectedType = mode === 'track' ? 'track' : 'playlist';
  const isUriInvalid = spotifyInput.trim().length > 0 && !normalizedUri;
  const isTypeMismatch =
    normalizedUri !== null && detectedType !== 'unknown' && detectedType !== expectedType;

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
          {mode === 'track' ? 'Spotify-Track-Link oder -URI' : 'Spotify-Playlist-Link oder -URI'}
          <input
            placeholder={
              mode === 'track'
                ? 'https://open.spotify.com/track/... oder spotify:track:...'
                : 'https://open.spotify.com/playlist/... oder spotify:playlist:...'
            }
            value={spotifyInput}
            onChange={(e) => setSpotifyInput(e.target.value)}
          />
        </label>
        <p className="modal__hint">
          Einfach den normalen „Link kopieren“ aus Spotify (Teilen) einfügen –
          die App wandelt ihn automatisch in die richtige URI um.
        </p>
        {isUriInvalid && (
          <p className="modal__hint modal__hint--error">
            Das sieht nicht nach einem gültigen Spotify-Link/URI aus.
          </p>
        )}
        {isTypeMismatch && (
          <p className="modal__hint modal__hint--error">
            Das ist ein {detectedType === 'track' ? 'Einzeltitel' : 'Playlist'}-Link,
            der Button ist aber auf „{expectedType === 'track' ? 'Einzeltitel' : 'Playlist'}“
            eingestellt. Bitte Typ oben anpassen oder passenden Link einfügen.
          </p>
        )}

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
              disabled={isUriInvalid || isTypeMismatch}
              onClick={() =>
                onSave({
                  ...button,
                  label: label.trim() || button.label,
                  mode,
                  spotifyUri: normalizedUri ?? '',
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
