interface LoginScreenProps {
  onLogin: () => void;
  error?: string | null;
}

export function LoginScreen({ onLogin, error }: LoginScreenProps) {
  return (
    <div className="login-screen">
      <h1>🏒 IceVibes</h1>
      <p>Musiksteuerung über deinen eigenen Spotify Premium Account.</p>
      {error && <div className="error-banner">{error}</div>}
      <button className="btn-primary btn-large" onClick={onLogin}>
        Mit Spotify einloggen
      </button>
      <p className="hint">
        Hinweis: Es wird ein Spotify&nbsp;<strong>Premium</strong>-Account benötigt,
        da die Wiedergabesteuerung Premium voraussetzt.
      </p>
    </div>
  );
}
