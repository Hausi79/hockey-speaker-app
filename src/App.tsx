import { useCallback, useEffect, useState } from 'react';
import { useSpotifyAuth } from './hooks/useSpotifyAuth';
import { usePlaybackState } from './hooks/usePlaybackState';
import {
  deleteSituationButton,
  getSituationButtons,
  saveSituationButton,
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

  useEffect(() => {
    if (auth.status === 'logged-in') {
      getSituationButtons().then(setButtons);
    }
  }, [auth.status]);

  const handleTrigger = useCallback(
    async (button: SituationButtonConfig) => {
      setActionError(null);
      setTriggeringId(button.id);
      try {
        await spotify.playUriAtPosition(button.spotifyUri, button.startPositionMs);
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
    [],
  );

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
      spotifyUri: '',
      startPositionMs: 0,
    };
    setEditingButton(draft);
  }, [buttons.length]);

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
        <h1>🏒 Stadion-Speaker</h1>
        <div className="app-header__actions">
          <button
            className={`btn-secondary ${editMode ? 'btn-secondary--active' : ''}`}
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? 'Fertig' : 'Buttons bearbeiten'}
          </button>
          <button className="btn-secondary" onClick={auth.logout}>
            Logout
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

      <NowPlaying playback={playbackState.playback} />

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
