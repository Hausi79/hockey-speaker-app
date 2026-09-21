// Spotify OAuth 2.0 Authorization Code Flow with PKCE.
// Fully client-side: no backend/server involved, tokens are kept in
// localStorage on the user's own device.

import type { SpotifyTokens } from './types';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined;
const REDIRECT_URI =
  (import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string | undefined) ??
  window.location.origin + window.location.pathname;

const SCOPES = [
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ');

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

const STORAGE_TOKENS = 'hsa.spotify.tokens';
const STORAGE_VERIFIER = 'hsa.spotify.pkce_verifier';

export class SpotifyAuthError extends Error {}

function assertClientId(): string {
  if (!CLIENT_ID) {
    throw new SpotifyAuthError(
      'Keine Spotify Client-ID konfiguriert. Bitte VITE_SPOTIFY_CLIENT_ID in .env setzen (siehe README).',
    );
  }
  return CLIENT_ID;
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(length: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const random = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(random, (v) => chars[v % chars.length]).join('');
}

async function sha256(input: string): Promise<ArrayBuffer> {
  const data = new TextEncoder().encode(input);
  return crypto.subtle.digest('SHA-256', data);
}

export function getStoredTokens(): SpotifyTokens | null {
  const raw = localStorage.getItem(STORAGE_TOKENS);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SpotifyTokens;
  } catch {
    return null;
  }
}

function storeTokens(tokens: SpotifyTokens): void {
  localStorage.setItem(STORAGE_TOKENS, JSON.stringify(tokens));
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_TOKENS);
  localStorage.removeItem(STORAGE_VERIFIER);
}

/** Starts the PKCE login flow by redirecting the browser to Spotify. */
export async function startLogin(): Promise<void> {
  const clientId = assertClientId();
  const verifier = randomString(64);
  localStorage.setItem(STORAGE_VERIFIER, verifier);
  const challenge = base64UrlEncode(await sha256(verifier));

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.assign(`${AUTHORIZE_URL}?${params.toString()}`);
}

/**
 * Checks the current URL for an OAuth redirect (`?code=...`) and, if
 * present, exchanges the code for tokens. Cleans the URL afterwards.
 * Returns true if a callback was handled (success or failure).
 */
export async function handleRedirectCallback(): Promise<boolean> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (!code && !error) return false;

  // Clean the query string so refreshes don't retrigger the exchange.
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('error');
  window.history.replaceState({}, document.title, url.toString());

  if (error) {
    throw new SpotifyAuthError(`Spotify-Login abgelehnt: ${error}`);
  }
  if (!code) return false;

  const verifier = localStorage.getItem(STORAGE_VERIFIER);
  if (!verifier) {
    throw new SpotifyAuthError(
      'PKCE-Verifier fehlt (evtl. Browserdaten gelöscht). Bitte erneut einloggen.',
    );
  }

  const clientId = assertClientId();
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new SpotifyAuthError(`Token-Austausch fehlgeschlagen (${res.status})`);
  }

  const json = await res.json();
  storeTokens({
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  });

  return true;
}

async function refreshTokens(refreshToken: string): Promise<SpotifyTokens> {
  const clientId = assertClientId();
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new SpotifyAuthError(`Token-Erneuerung fehlgeschlagen (${res.status})`);
  }

  const json = await res.json();
  const tokens: SpotifyTokens = {
    accessToken: json.access_token,
    // Spotify may omit refresh_token on refresh; keep the old one then.
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  storeTokens(tokens);
  return tokens;
}

/**
 * Returns a valid access token, refreshing it first if it is expired
 * (or about to expire within 60s). Returns null if the user is not
 * logged in at all.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  if (Date.now() < tokens.expiresAt - 60_000) {
    return tokens.accessToken;
  }

  try {
    const refreshed = await refreshTokens(tokens.refreshToken);
    return refreshed.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getStoredTokens() !== null;
}

export function logout(): void {
  clearTokens();
}
