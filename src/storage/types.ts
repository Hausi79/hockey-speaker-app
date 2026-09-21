// Local configuration types. Everything here is persisted client-side
// only (IndexedDB) - no server, no cloud sync.

export interface SituationButtonConfig {
  id: string;
  /** Order of appearance in the grid. */
  order: number;
  label: string;
  /** Hex color for the button background, for quick visual distinction. */
  color: string;
  /** Spotify track or playlist URI, e.g. spotify:track:xxxx */
  spotifyUri: string;
  /** Where playback should start, in milliseconds (skips intros etc.). */
  startPositionMs: number;
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
  { order: 0, label: 'Anpfiff', color: '#1db954', spotifyUri: '', startPositionMs: 0 },
  { order: 1, label: 'Tor', color: '#ff4d4f', spotifyUri: '', startPositionMs: 0 },
  { order: 2, label: 'Pause', color: '#3b82f6', spotifyUri: '', startPositionMs: 0 },
  { order: 3, label: 'Timeout', color: '#f59e0b', spotifyUri: '', startPositionMs: 0 },
  { order: 4, label: 'Penalty', color: '#a855f7', spotifyUri: '', startPositionMs: 0 },
  { order: 5, label: 'Sieg', color: '#ec4899', spotifyUri: '', startPositionMs: 0 },
];
