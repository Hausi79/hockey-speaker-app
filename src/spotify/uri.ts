// Helpers to accept both native Spotify URIs (spotify:track:xxx) and
// regular share links (https://open.spotify.com/track/xxx) from
// users, since Spotify's UI doesn't always expose "Copy Spotify URI"
// directly anymore.

export type SpotifyUriType = 'track' | 'playlist' | 'album' | 'unknown';

/**
 * Normalizes user input into a canonical `spotify:<type>:<id>` URI.
 * Accepts:
 * - Already-canonical URIs: `spotify:track:ID`
 * - Share links: `https://open.spotify.com/track/ID?si=...`
 * - Share links with locale prefix: `https://open.spotify.com/intl-de/track/ID`
 * Returns null if the input doesn't look like a Spotify track/playlist/album reference.
 */
export function normalizeSpotifyUri(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const uriMatch = trimmed.match(/^spotify:(track|playlist|album):([A-Za-z0-9]+)$/);
  if (uriMatch) {
    return `spotify:${uriMatch[1]}:${uriMatch[2]}`;
  }

  try {
    const url = new URL(trimmed);
    if (!/(^|\.)open\.spotify\.com$/.test(url.hostname)) return null;

    // Path looks like /track/ID, /playlist/ID, or /intl-de/track/ID
    const parts = url.pathname.split('/').filter(Boolean);
    const typeIndex = parts.findIndex((p) => p === 'track' || p === 'playlist' || p === 'album');
    if (typeIndex === -1 || !parts[typeIndex + 1]) return null;

    const type = parts[typeIndex] as 'track' | 'playlist' | 'album';
    const id = parts[typeIndex + 1];
    return `spotify:${type}:${id}`;
  } catch {
    return null;
  }
}

export function getSpotifyUriType(uri: string): SpotifyUriType {
  const match = uri.match(/^spotify:(track|playlist|album):/);
  return (match?.[1] as SpotifyUriType) ?? 'unknown';
}
