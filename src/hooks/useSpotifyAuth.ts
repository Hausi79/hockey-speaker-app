import { useCallback, useEffect, useState } from 'react';
import {
  clearTokens,
  handleRedirectCallback,
  isLoggedIn,
  startLogin,
  SpotifyAuthError,
} from '../spotify/auth';
import { requirePremium, SpotifyApiError } from '../spotify/api';
import type { SpotifyUserProfile } from '../spotify/types';

interface AuthState {
  status: 'checking' | 'logged-out' | 'logged-in' | 'error';
  profile: SpotifyUserProfile | null;
  error: string | null;
}

export function useSpotifyAuth() {
  const [state, setState] = useState<AuthState>({
    status: 'checking',
    profile: null,
    error: null,
  });

  const verifyPremium = useCallback(async () => {
    try {
      const profile = await requirePremium();
      setState({ status: 'logged-in', profile, error: null });
    } catch (err) {
      const message =
        err instanceof SpotifyApiError || err instanceof SpotifyAuthError
          ? err.message
          : 'Unbekannter Fehler beim Login.';
      setState({ status: 'error', profile: null, error: message });
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await handleRedirectCallback();
      } catch (err) {
        setState({
          status: 'error',
          profile: null,
          error: err instanceof Error ? err.message : 'Login fehlgeschlagen.',
        });
        return;
      }

      if (isLoggedIn()) {
        await verifyPremium();
      } else {
        setState({ status: 'logged-out', profile: null, error: null });
      }
    })();
  }, [verifyPremium]);

  const login = useCallback(() => {
    startLogin().catch((err) => {
      setState({
        status: 'error',
        profile: null,
        error: err instanceof Error ? err.message : 'Login fehlgeschlagen.',
      });
    });
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setState({ status: 'logged-out', profile: null, error: null });
  }, []);

  return { ...state, login, logout, retry: verifyPremium };
}
