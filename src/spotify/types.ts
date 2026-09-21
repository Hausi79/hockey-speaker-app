// Shared Spotify-related types used across the app.

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms when the access token expires. */
  expiresAt: number;
}

export interface SpotifyUserProfile {
  id: string;
  displayName: string;
  product: string; // "premium" | "free" | "open" ...
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  volume_percent: number | null;
}

export interface SpotifyTrackInfo {
  id: string;
  name: string;
  artists: string;
  albumArt: string | null;
  durationMs: number;
  uri: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  progressMs: number;
  track: SpotifyTrackInfo | null;
  device: SpotifyDevice | null;
  volumePercent: number | null;
}
