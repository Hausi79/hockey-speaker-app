import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpotifyAuth } from './hooks/useSpotifyAuth';
import { usePlaybackState } from './hooks/usePlaybackState';
import {
  deleteSituationButton,
  getPlayedTrackUris,
  getSituationButtons,
  markTrackAsPlayed,
  replaceSituationButtons,
  resetAllPlaylistProgress,
  resetTrackProgress,
  saveSituationButton,
  saveSituationButtons,
} from './storage/db';
import type { SituationButtonConfig } from './storage/types';
import * as spotify from './spotify/api';
import { SpotifyApiError } from './spotify/api';
import { LoginScreen } from './components/LoginScreen';
import { NowPlaying } from './components/NowPlaying';
import { PlaybackControls } from './components/PlaybackControls';
import { SituationButtons } from './components/SituationButtons';
import { SituationButtonEditor } from './components/SituationButtonEditor';
import { SoundboardLocal } from './components/SoundboardLocal';
import { InstallPrompt } from './components/InstallPrompt';
import { ErrorBanner } from './components/ErrorBanner';
import './index.css';

export default function App() {
  const auth = useSpotifyAuth();
  const playbackState = usePlaybackState(auth.status === 'logged-in');

  const [buttons, setButtons] = useState<SituationButtonConfig[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editingButton, setEditingButton] = useState<SituationButtonConfig | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (auth.status === 'logged-in') {
      getSituationButtons().then(setButtons);
    }
  }, [auth.status]);

  /**
   * Picks the next track from the button's playlist that hasn't been
   * played yet this game - either randomly ('random' mode, the
   * default) or the next one in playlist order ('sequential' mode).
   * Once every track has been played, the history is cleared (keeping
   * only the last played track, to avoid an immediate repeat) and
   * playback continues from a fresh cycle.
   */
  const playRandomFromPlaylist = useCallback(
    async (button: SituationButtonConfig) => {
      const allTrackUris = await spotify.getPlaylistTrackUris(button.spotifyUri);
      if (allTrackUris.length === 0) {
        throw new SpotifyApiError('Die Playlist enthält keine Titel.', undefined, 'UNKNOWN');
      }

      const played = await getPlayedTrackUris(button.id);
      let candidates = allTrackUris.filter((uri) => !played.includes(uri));

      if (candidates.length === 0) {
        // All tracks played: start a fresh cycle, but avoid repeating
        // the very last played track immediately if there are
        // alternatives.
        const lastPlayed = played[played.length - 1];
        candidates = allTrackUris.filter((uri) => uri !== lastPlayed);
        if (candidates.length === 0) candidates = allTrackUris;
        await resetTrackProgress(button.id, lastPlayed ? [lastPlayed] : []);
      }

      const pick =
        button.playlistPlaybackOrder === 'sequential'
          ? candidates[0]
          : candidates[Math.floor(Math.random() * candidates.length)];
      const positionMs = button.trackStartPositions?.[pick] ?? button.startPositionMs;
      await spotify.playUriAtPosition(pick, positionMs);
      await markTrackAsPlayed(button.id, pick);
    },
    [],
  );

  const handleTrigger = useCallback(
    async (button: SituationButtonConfig) => {
      setActionError(null);
      setTriggeringId(button.id);
      try {
        if (button.mode === 'playlist') {
          await playRandomFromPlaylist(button);
        } else {
          await spotify.playUriAtPosition(button.spotifyUri, button.startPositionMs);
        }
      } catch (err) {
        setActionError(
          err instanceof SpotifyApiError
            ? err.message
            : 'Song konnte nicht gestartet werden.',
        );
      } finally {
        setTriggeringId(null);
      }
    },
    [playRandomFromPlaylist],
  );

  const handleNewGame = useCallback(async () => {
    if (!window.confirm('Neues Spiel starten? Der "bereits gespielt"-Verlauf aller Playlist-Buttons wird zurückgesetzt.')) {
      return;
    }
    await resetAllPlaylistProgress();
  }, []);

  const handleSaveButton = useCallback(async (button: SituationButtonConfig) => {
    await saveSituationButton(button);
    setButtons(await getSituationButtons());
    setEditingButton(null);
  }, []);

  const handleDeleteButton = useCallback(async (id: string) => {
    await deleteSituationButton(id);
    setButtons(await getSituationButtons());
    setEditingButton(null);
  }, []);

  const handleAddButton = useCallback(async () => {
    const draft: SituationButtonConfig = {
      id: crypto.randomUUID(),
      order: buttons.length,
      label: 'Neuer Button',
      color: '#6b7280',
      mode: 'track',
      spotifyUri: '',
      startPositionMs: 0,
    };
    setEditingButton(draft);
  }, [buttons.length]);

  const handleMoveButton = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      setButtons((current) => {
        const sorted = [...current].sort((a, b) => a.order - b.order);
        const index = sorted.findIndex((b) => b.id === id);
        const swapWith = direction === 'up' ? index - 1 : index + 1;
        if (index === -1 || swapWith < 0 || swapWith >= sorted.length) return current;

        const a = sorted[index];
        const b = sorted[swapWith];
        const updatedA = { ...a, order: b.order };
        const updatedB = { ...b, order: a.order };
        sorted[index] = updatedB;
        sorted[swapWith] = updatedA;

        saveSituationButtons([updatedA, updatedB]);
        return sorted;
      });
    },
    [],
  );

  const handleExportConfig = useCallback(async () => {
    setShowConfigMenu(false);
    const json = JSON.stringify(buttons, null, 2);
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `icevibes-buttons-${date}.json`;

    const picker = (window as typeof window & {
      showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>;
    }).showSaveFilePicker;

    if (picker) {
      try {
        const handle = await picker({
          suggestedName: fileName,
          types: [
            {
              description: 'IceVibes Konfiguration',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return;
      } catch (err) {
        // User cancelled the picker - do nothing. Any other error falls
        // back to the plain download below.
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [buttons]);

  const handleImportClick = useCallback(() => {
    setShowConfigMenu(false);
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('Ungültiges Format');
      }
      const valid = parsed.every(
        (b) => b && typeof b.id === 'string' && typeof b.label === 'string' && typeof b.mode === 'string',
      );
      if (!valid) {
        throw new Error('Ungültiges Format');
      }
      if (
        !window.confirm(
          `${parsed.length} Button(s) importieren? Die bestehende Konfiguration wird überschrieben.`,
        )
      ) {
        return;
      }
      await replaceSituationButtons(parsed as SituationButtonConfig[]);
      setButtons(await getSituationButtons());
    } catch {
      setActionError('Import fehlgeschlagen: Datei ist keine gültige IceVibes-Konfiguration.');
    }
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!playbackState.playback) return;
    try {
      if (playbackState.playback.isPlaying) {
        await spotify.pause();
      } else {
        await spotify.play();
      }
      await playbackState.refresh();
    } catch (err) {
      setActionError(err instanceof SpotifyApiError ? err.message : 'Steuerung fehlgeschlagen.');
    }
  }, [playbackState]);

  const handleStop = useCallback(async () => {
    setActionError(null);
    if (!playbackState.playback?.isPlaying) return;
    try {
      await spotify.pause();
      await playbackState.refresh();
    } catch (err) {
      setActionError(err instanceof SpotifyApiError ? err.message : 'Musik konnte nicht gestoppt werden.');
    }
  }, [playbackState]);

  if (auth.status === 'checking') {
    return (
      <div className="app-shell app-shell--center">
        <p>Lade…</p>
      </div>
    );
  }

  if (auth.status !== 'logged-in') {
    return (
      <div className="app-shell app-shell--center">
        <InstallPrompt />
        <LoginScreen onLogin={auth.login} error={auth.error} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <InstallPrompt />
      <header className="app-header">
        <h1>🏒 IceVibes</h1>
        <div className="app-header__actions">
          <button
            className="btn-secondary btn-icon"
            onClick={handleNewGame}
            aria-label="Neues Spiel"
            title="Neues Spiel"
          >
            🆕
          </button>
          <button
            className={`btn-secondary btn-icon ${editMode ? 'btn-secondary--active' : ''}`}
            onClick={() => setEditMode((v) => !v)}
            aria-label={editMode ? 'Bearbeiten beenden' : 'Buttons bearbeiten'}
            title={editMode ? 'Bearbeiten beenden' : 'Buttons bearbeiten'}
          >
            {editMode ? '✅' : '⚙️'}
          </button>
          <div className="config-menu-wrapper">
            <button
              className="btn-secondary btn-icon"
              onClick={() => setShowConfigMenu((v) => !v)}
              aria-label="Konfiguration exportieren/importieren"
              title="Konfiguration exportieren/importieren"
            >
              📁
            </button>
            {showConfigMenu && (
              <>
                <div className="config-menu__backdrop" onClick={() => setShowConfigMenu(false)} />
                <div className="config-menu">
                  <button className="config-menu__item" onClick={handleExportConfig}>
                    ⬆️ Exportieren
                  </button>
                  <button className="config-menu__item" onClick={handleImportClick}>
                    ⬇️ Importieren
                  </button>
                </div>
              </>
            )}
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="visually-hidden"
              onChange={handleImportFile}
            />
          </div>
          <button
            className="btn-secondary btn-icon"
            onClick={auth.logout}
            aria-label="Logout"
            title="Logout"
          >
            ⎋
          </button>
        </div>
      </header>

      {auth.profile && (
        <p className="hint">Angemeldet als {auth.profile.displayName} (Premium)</p>
      )}

      {playbackState.lastError && (
        <ErrorBanner message={playbackState.lastError} onRetry={playbackState.refresh} />
      )}
      {actionError && <ErrorBanner message={actionError} />}

      <NowPlaying playback={playbackState.playback} onStop={handleStop} />

      <PlaybackControls
        isPlaying={playbackState.playback?.isPlaying ?? false}
        volumePercent={playbackState.playback?.volumePercent ?? null}
        onPlayPause={handlePlayPause}
        onNext={() => spotify.next().then(playbackState.refresh)}
        onPrevious={() => spotify.previous().then(playbackState.refresh)}
        onVolumeChange={(v) => spotify.setVolume(v).then(playbackState.refresh)}
      />

      <section>
        <h2>Situationsbuttons</h2>
        <SituationButtons
          buttons={buttons}
          editMode={editMode}
          onTrigger={handleTrigger}
          onEdit={setEditingButton}
          onAdd={handleAddButton}
          onMove={handleMoveButton}
          triggeringId={triggeringId}
        />
      </section>

      <section>
        <SoundboardLocal />
      </section>

      {editingButton && (
        <SituationButtonEditor
          button={editingButton}
          onSave={handleSaveButton}
          onDelete={handleDeleteButton}
          onClose={() => setEditingButton(null)}
        />
      )}
    </div>
  );
}
