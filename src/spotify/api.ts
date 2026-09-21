// Thin wrapper around the parts of the Spotify Web API we need for
// playback control. All calls require a valid access token.

import { getValidAccessToken } from './auth';
import type {
  PlaybackState,
  SpotifyDevice,
  SpotifyUserProfile,
} from './types';

const API_BASE = 'https://api.spotify.com/v1';

export type SpotifyApiErrorCode =
  | 'NO_ACTIVE_DEVICE'
  | 'NOT_LOGGED_IN'
  | 'PREMIUM_REQUIRED'
  | 'UNKNOWN';

export class SpotifyApiError extends Error {
  status?: number;
  code?: SpotifyApiErrorCode;

  constructor(message: string, status?: number, code?: SpotifyApiErrorCode) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function authorizedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getValidAccessToken();
  if (!token) {
    throw new SpotifyApiError('Nicht bei Spotify eingeloggt.', undefined, 'NOT_LOGGED_IN');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 204) return res;

  if (res.status === 404) {
    // Spotify returns 404 for player endpoints when no device is active.
    throw new SpotifyApiError(
      'Kein aktives Spotify-Gerät gefunden. Bitte Spotify auf einem Gerät öffnen und Wiedergabe starten.',
      404,
      'NO_ACTIVE_DEVICE',
    );
  }

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message ?? '';
    } catch {
      /* ignore body parse errors */
    }
    throw new SpotifyApiError(
      `Spotify-API-Fehler (${res.status})${detail ? `: ${detail}` : ''}`,
      res.status,
      'UNKNOWN',
    );
  }

  return res;
}

export async function getUserProfile(): Promise<SpotifyUserProfile> {
  const res = await authorizedFetch('/me');
  const json = await res.json();
  return {
    id: json.id,
    displayName: json.display_name ?? json.id,
    product: json.product ?? 'unknown',
  };
}

export async function requirePremium(): Promise<SpotifyUserProfile> {
  const profile = await getUserProfile();
  if (profile.product !== 'premium') {
    throw new SpotifyApiError(
      'Für die Steuerung wird ein Spotify Premium Account benötigt.',
      403,
      'PREMIUM_REQUIRED',
    );
  }
  return profile;
}

export async function getCurrentPlayback(): Promise<PlaybackState | null> {
  const res = await authorizedFetch('/me/player');
  if (res.status === 204) return null;
  const json = await res.json();
  if (!json) return null;

  const item = json.item;
  return {
    isPlaying: !!json.is_playing,
    progressMs: json.progress_ms ?? 0,
    track: item
      ? {
          id: item.id,
          name: item.name,
          artists: (item.artists ?? []).map((a: { name: string }) => a.name).join(', '),
          albumArt: item.album?.images?.[0]?.url ?? null,
          durationMs: item.duration_ms,
          uri: item.uri,
        }
      : null,
    device: json.device
      ? {
          id: json.device.id,
          name: json.device.name,
          type: json.device.type,
          is_active: json.device.is_active,
          volume_percent: json.device.volume_percent,
        }
      : null,
    volumePercent: json.device?.volume_percent ?? null,
  };
}

export async function getDevices(): Promise<SpotifyDevice[]> {
  const res = await authorizedFetch('/me/player/devices');
  const json = await res.json();
  return json.devices ?? [];
}

export async function play(options?: {
  uris?: string[];
  contextUri?: string;
  positionMs?: number;
  deviceId?: string;
}): Promise<void> {
  const query = options?.deviceId ? `?device_id=${options.deviceId}` : '';
  const body: Record<string, unknown> = {};
  if (options?.uris) body.uris = options.uris;
  if (options?.contextUri) body.context_uri = options.contextUri;
  if (options?.positionMs !== undefined) body.position_ms = options.positionMs;

  await authorizedFetch(`/me/player/play${query}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: Object.keys(body).length ? JSON.stringify(body) : undefined,
  });
}

export async function pause(): Promise<void> {
  await authorizedFetch('/me/player/pause', { method: 'PUT' });
}

export async function next(): Promise<void> {
  await authorizedFetch('/me/player/next', { method: 'POST' });
}

export async function previous(): Promise<void> {
  await authorizedFetch('/me/player/previous', { method: 'POST' });
}

export async function seek(positionMs: number): Promise<void> {
  await authorizedFetch(`/me/player/seek?position_ms=${Math.max(0, Math.round(positionMs))}`, {
    method: 'PUT',
  });
}

export async function setVolume(percent: number): Promise<void> {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  await authorizedFetch(`/me/player/volume?volume_percent=${clamped}`, {
    method: 'PUT',
  });
}

/**
 * Plays a track/playlist URI immediately, starting at the given
 * position. This is the core action behind a "Situationsbutton".
 */
export async function playUriAtPosition(
  uri: string,
  positionMs: number,
): Promise<void> {
  const isTrack = uri.includes(':track:');
  await play(
    isTrack
      ? { uris: [uri], positionMs }
      : { contextUri: uri, positionMs },
  );
}
