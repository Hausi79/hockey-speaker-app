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
    let reason = '';
    try {
      const body = await res.json();
      detail = body?.error?.message ?? '';
      reason = body?.error?.reason ?? '';
    } catch {
      /* ignore body parse errors */
    }
    throw new SpotifyApiError(
      `Spotify-API-Fehler (${res.status})${detail ? `: ${detail}` : ''}${reason ? ` [reason: ${reason}]` : ''}`,
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

/**
 * Resolves which device a play command should target. Spotify can
 * reject player commands with a vague 403 "Restriction violated" when
 * no explicit device_id is sent and multiple devices are available
 * (e.g. Mac + phone both have Spotify open) - so we always resolve
 * and pass an explicit device_id instead of relying on the implicit
 * "currently active device".
 */
async function resolveTargetDeviceId(): Promise<string> {
  const devices = await getDevices();
  if (devices.length === 0) {
    throw new SpotifyApiError(
      'Kein Spotify-Gerät gefunden. Bitte Spotify auf einem Gerät öffnen.',
      404,
      'NO_ACTIVE_DEVICE',
    );
  }
  const active = devices.find((d) => d.is_active);
  return (active ?? devices[0]).id;
}

/**
 * Explicitly transfers playback to a device before issuing play
 * commands. Spotify Connect commands can otherwise fail with a vague
 * 403 "Restriction violated" if the target device isn't cleanly
 * marked active yet (a known Spotify Web API quirk, especially with
 * the macOS desktop app).
 */
async function transferPlaybackTo(deviceId: string): Promise<void> {
  await authorizedFetch('/me/player', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  });
  // Give Spotify Connect a brief moment to complete the transfer
  // before sending the actual play command.
  await new Promise((resolve) => setTimeout(resolve, 300));
}

export async function play(options?: {
  uris?: string[];
  contextUri?: string;
  offsetUri?: string;
  positionMs?: number;
  deviceId?: string;
}): Promise<void> {
  const deviceId = options?.deviceId ?? (await resolveTargetDeviceId());
  await transferPlaybackTo(deviceId);
  const query = `?device_id=${deviceId}`;
  const body: Record<string, unknown> = {};
  if (options?.uris) body.uris = options.uris;
  if (options?.contextUri) body.context_uri = options.contextUri;
  if (options?.offsetUri) body.offset = { uri: options.offsetUri };
  if (options?.positionMs !== undefined) body.position_ms = options.positionMs;

  await authorizedFetch(`/me/player/play${query}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: Object.keys(body).length ? JSON.stringify(body) : undefined,
  });
}

/**
 * Fetches the album URI a track belongs to. Used as a workaround for
 * playing single tracks (see playUriAtPosition below).
 */
async function getTrackAlbumUri(trackUri: string): Promise<string> {
  const trackId = trackUri.split(':').pop();
  const res = await authorizedFetch(`/tracks/${trackId}`);
  const data = (await res.json()) as { album?: { uri?: string } };
  const albumUri = data.album?.uri;
  if (!albumUri) {
    throw new SpotifyApiError('Konnte Album des Titels nicht ermitteln.', 500, 'UNKNOWN');
  }
  return albumUri;
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
 * Always resolves and sends an explicit device_id (see
 * resolveTargetDeviceId) to avoid a vague 403 "Restriction violated"
 * that Spotify can return when the target device is ambiguous.
 *
 * For single tracks, some Spotify Connect clients (observed on the
 * macOS desktop app) silently fail to start playback when using the
 * `uris` request field directly, leaving the device with no active
 * item at all. As a workaround, single tracks are instead played via
 * their album as `context_uri` with an `offset` pointing at the exact
 * track - this is reliably accepted by all tested clients.
 */
export async function playUriAtPosition(
  uri: string,
  positionMs: number,
): Promise<void> {
  const deviceId = await resolveTargetDeviceId();
  const isTrack = uri.includes(':track:');
  if (isTrack) {
    const albumUri = await getTrackAlbumUri(uri);
    await play({ contextUri: albumUri, offsetUri: uri, positionMs, deviceId });
  } else {
    await play({ contextUri: uri, positionMs, deviceId });
  }
}

/**
 * Fetches all track URIs contained in a playlist (paginated, 100 per
 * page), used to pick a random not-yet-played track for playlist-mode
 * situation buttons.
 */
export async function getPlaylistTrackUris(playlistUri: string): Promise<string[]> {
  const tracks = await getPlaylistTracks(playlistUri);
  return tracks.map((t) => t.uri);
}

export interface PlaylistTrackInfo {
  uri: string;
  name: string;
  artists: string;
}

/**
 * Fetches all tracks contained in a playlist (paginated, 100 per
 * page), including display name/artists so the editor UI can show a
 * per-track list (e.g. to configure individual start positions).
 */
export async function getPlaylistTracks(playlistUri: string): Promise<PlaylistTrackInfo[]> {
  const playlistId = playlistUri.split(':').pop();
  if (!playlistId) {
    throw new SpotifyApiError('Ungültige Playlist-URI.', undefined, 'UNKNOWN');
  }

  const tracks: PlaylistTrackInfo[] = [];
  // Note: the legacy `/playlists/{id}/tracks` endpoint returns 403
  // Forbidden for newer Spotify apps; `/items` is its replacement and
  // uses `item` (not `track`) as the field name for the playlist entry.
  let path: string | null =
    `/playlists/${playlistId}/items?fields=items(item(uri,name,artists(name))),next&limit=100`;

  while (path) {
    const res = await authorizedFetch(path);
    const json = await res.json();
    for (const entry of json.items ?? []) {
      const item = entry?.item;
      if (item?.uri) {
        tracks.push({
          uri: item.uri,
          name: item.name ?? item.uri,
          artists: (item.artists ?? []).map((a: { name: string }) => a.name).join(', '),
        });
      }
    }
    // `next` is a full URL from Spotify; strip the API base to reuse authorizedFetch.
    path = json.next ? (json.next as string).replace(API_BASE, '') : null;
  }

  return tracks;
}
