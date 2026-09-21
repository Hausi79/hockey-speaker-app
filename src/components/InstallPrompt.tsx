import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'hsa.install_hint_dismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * Simple onboarding hint that explains how to add the PWA to the home
 * screen. Uses the native `beforeinstallprompt` event on Android/Chrome
 * and shows manual instructions on iOS Safari (which has no such event).
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1',
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (dismissed || isStandalone()) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    (deferredPrompt as unknown as { prompt: () => void }).prompt();
    dismiss();
  };

  return (
    <div className="install-hint">
      {deferredPrompt ? (
        <>
          <span>Installiere die App für den schnellen Zugriff.</span>
          <button className="btn-secondary" onClick={install}>
            Installieren
          </button>
        </>
      ) : isIos() ? (
        <span>
          Zum Home-Bildschirm hinzufügen: Teilen-Symbol antippen →
          „Zum Home-Bildschirm“.
        </span>
      ) : (
        <span>Tipp: Über das Browsermenü „Zum Startbildschirm hinzufügen“ wählen.</span>
      )}
      <button className="install-hint__close" onClick={dismiss} aria-label="Schließen">
        ✕
      </button>
    </div>
  );
}
