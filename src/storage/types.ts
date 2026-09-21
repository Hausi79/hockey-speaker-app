// Local configuration types. Everything here is persisted client-side
// only (IndexedDB) - no server, no cloud sync.

export type SituationButtonMode = 'track' | 'playlist';

export interface SituationButtonConfig {
  id: string;
  /** Order of appearance in the grid. */
  order: number;
  label: string;
  /** Hex color for the button background, for quick visual distinction. */
  color: string;
  /**
   * 'track': always plays the exact same song (e.g. Tor, Gegentor,
   * Strafe). 'playlist': picks a random not-yet-played song from the
   * playlist each time (e.g. Einlaufen, Pause, Spielunterbruch), so the
   * same song doesn't repeat within a game.
   */
  mode: SituationButtonMode;
  /** Spotify track or playlist URI, e.g. spotify:track:xxxx / spotify:playlist:xxxx */
  spotifyUri: string;
  /**
   * Where playback should start, in milliseconds (skips intros etc.).
   * For 'track' mode this is the only start position used. For
   * 'playlist' mode this is the fallback used when a track has no
   * entry in trackStartPositions.
   */
  startPositionMs: number;
  /**
   * Playlist mode only: per-track start position overrides, keyed by
   * Spotify track URI. Lets each song in the playlist skip its own
   * intro length instead of sharing a single start position.
   */
  trackStartPositions?: Record<string, number>;
}

/**
 * Tracks which songs of a playlist-mode button have already been
 * played during the current game, so they aren't repeated. Reset via
 * the "Neues Spiel" action.
 */
export interface PlaylistProgress {
  /** Same id as the SituationButtonConfig it belongs to. */
  buttonId: string;
  playedTrackUris: string[];
}

export interface LocalSound {
  id: string;
  order: number;
  label: string;
  /** Original file name, shown in the UI. */
  fileName: string;
  /** The audio data itself, stored locally in IndexedDB. */
  blob: Blob;
  mimeType: string;
}

export const DEFAULT_SITUATION_BUTTONS: Omit<SituationButtonConfig, 'id'>[] = [
  { order: 0, label: 'Einlaufen', color: '#1db954', mode: 'playlist', spotifyUri: '', startPositionMs: 0 },
  { order: 1, label: 'Tor', color: '#ff4d4f', mode: 'track', spotifyUri: '', startPositionMs: 0 },
  { order: 2, label: 'Gegentor', color: '#7f1d1d', mode: 'track', spotifyUri: '', startPositionMs: 0 },
  { order: 3, label: 'Pause', color: '#3b82f6', mode: 'playlist', spotifyUri: '', startPositionMs: 0 },
  { order: 4, label: 'Spielunterbruch', color: '#0ea5e9', mode: 'playlist', spotifyUri: '', startPositionMs: 0 },
  { order: 5, label: 'Strafe', color: '#a855f7', mode: 'track', spotifyUri: '', startPositionMs: 0 },
  { order: 6, label: 'Strafe Gegner', color: '#6b21a8', mode: 'track', spotifyUri: '', startPositionMs: 0 },
  { order: 7, label: 'Sieg', color: '#ec4899', mode: 'track', spotifyUri: '', startPositionMs: 0 },
  { order: 8, label: 'Spielende', color: '#f59e0b', mode: 'track', spotifyUri: '', startPositionMs: 0 },
];
