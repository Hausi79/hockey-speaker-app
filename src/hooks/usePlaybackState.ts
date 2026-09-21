import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentPlayback } from '../spotify/api';
import type { PlaybackState } from '../spotify/types';

const POLL_INTERVAL_MS = 3000;

/**
 * Polls the Spotify playback state periodically so the UI (track,
 * progress, device) stays roughly in sync without needing a backend
 * or websocket.
 */
export function usePlaybackState(enabled: boolean) {
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const state = await getCurrentPlayback();
      setPlayback(state);
      setLastError(null);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Fehler beim Laden des Status.');
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    timerRef.current = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [enabled, refresh]);

  return { playback, lastError, refresh };
}
