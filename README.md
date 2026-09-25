# Stadion-Speaker – Musiksteuerung für Hockey-Speaker (PWA)

Das App-Logo (`public/icons/logo-cropped.png`) kombiniert einen
Hockey-Puck mit einem Stadion-Speaker und wird als Favicon sowie
PWA-Icon verwendet.

Eine reine Client-seitige Progressive Web App zur Musiksteuerung über
Spotify für Stadion-Speaker: grosse Situationsbuttons (Anpfiff, Tor,
Pause, Timeout, Penalty, ...), die jeweils einen konfigurierten
Spotify-Track/Playlist an einem konfigurierbaren Startpunkt starten,
plus eine lokale Sound-Bibliothek (Buzzer/Jingles) für den Offline-Einsatz.

**Kein Server, keine Cloud-DB, keine App-Store-Veröffentlichung.**
Alles läuft im Browser des Nutzers (Add-to-Home-Screen auf iOS/Android),
alle Konfigurationen werden lokal (IndexedDB) auf dem Gerät gespeichert.

## Voraussetzungen

- Ein **Spotify Premium**-Account des Nutzers (Steuerung via Web API
  funktioniert nur mit Premium).
- Node.js ≥ 18 zum lokalen Entwickeln/Bauen.
- Ein eigenes **Spotify Developer App**-Client-ID (kostenlos, siehe unten).

## 1. Spotify Developer App registrieren

1. Gehe zu https://developer.spotify.com/dashboard und logge dich mit
   deinem Spotify-Account ein.
2. Klicke auf **Create app**.
3. Trage einen beliebigen App-Namen/-Beschreibung ein (z. B.
   "Stadion-Speaker").
4. Bei **Redirect URIs** trägst du die URL ein, unter der die App
   später erreichbar ist, z. B.:
   - Für lokale Entwicklung: `http://127.0.0.1:5173/`
   - Für Produktion (statisches Hosting, z. B. GitHub Pages/Netlify/
     Vercel/Cloudflare Pages): `https://<deine-domain>/`

   Wichtig: Die Redirect-URI muss **exakt** (inkl. Slash am Ende)
   sowohl im Spotify Dashboard als auch in deiner `.env`
   (`VITE_SPOTIFY_REDIRECT_URI`) übereinstimmen.
5. Wähle bei **Which API/SDKs are you planning to use?** die **Web
   API**.
6. Nach dem Erstellen: **Settings** öffnen und die **Client ID**
   kopieren (kein Client Secret nötig – die App nutzt den PKCE-Flow
   rein clientseitig, ganz ohne Backend).

## 2. Projekt konfigurieren

```bash
npm install
cp .env.example .env
```

In `.env` eintragen:

```
VITE_SPOTIFY_CLIENT_ID=<deine Client-ID aus Schritt 1>
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/
```

## 3. Lokal starten

```bash
npm run dev
```

Öffne die angezeigte URL (Standard: `http://127.0.0.1:5173/`) – diese
muss identisch mit der im Spotify Dashboard hinterlegten Redirect-URI
sein.

## 4. Build für Produktion (statisches Hosting)

```bash
npm run build
```

Der Ordner `dist/` kann direkt auf jedem statischen Hosting (GitHub
Pages, Netlify, Vercel, Cloudflare Pages, ...) deployt werden – es wird
kein eigener Server benötigt. Denk daran, für die Produktions-URL:

- eine weitere Redirect-URI im Spotify Dashboard einzutragen, und
- `VITE_SPOTIFY_REDIRECT_URI` beim Build entsprechend zu setzen
  (z. B. als Umgebungsvariable im Hosting-Dashboard).

## 5. Deployment auf GitHub Pages (kostenlos)

Das Repository enthält einen GitHub-Actions-Workflow
(`.github/workflows/deploy.yml`), der bei jedem Push auf `main`
automatisch baut und auf GitHub Pages veröffentlicht.

Einmalige Einrichtung:

1. **Repository-Secrets** anlegen (GitHub → Repo → Settings →
   Secrets and variables → Actions → *New repository secret*):
   - `VITE_SPOTIFY_CLIENT_ID` – deine Client-ID aus Schritt 1
   - `VITE_SPOTIFY_REDIRECT_URI` – die Pages-URL, z. B.
     `https://hausi79.github.io/hockey-speaker-app/`
2. **Pages aktivieren**: GitHub → Repo → Settings → Pages →
   *Build and deployment* → *Source*: **GitHub Actions** auswählen.
3. **Redirect-URI bei Spotify eintragen**: Im Spotify Developer
   Dashboard (Settings der App) die gleiche Pages-URL als weitere
   Redirect-URI hinzufügen (zusätzlich zur lokalen
   `http://127.0.0.1:5173/`).
4. Push auf `main` → die Action baut und deployt automatisch. Der
   Link erscheint danach unter Settings → Pages bzw. im
   Actions-Log (Job "deploy").

Da GitHub Pages die App unter einem Unterpfad ausliefert
(`/hockey-speaker-app/`), ist in `vite.config.ts` bereits
`base: '/hockey-speaker-app/'` gesetzt. Bei einem anderen
Repository-Namen muss dieser Pfad entsprechend angepasst werden.

## Nutzung

1. **Login**: Mit Spotify einloggen (PKCE-OAuth-Flow). Ohne Premium
   wird eine entsprechende Meldung angezeigt.
2. **Wiedergabe**: Aktueller Song (Titel, Künstler, Cover, Fortschritt)
   wird angezeigt, inkl. Play/Pause, Skip vor/zurück, Lautstärke.
   Voraussetzung: Auf irgendeinem Gerät (Handy, Lautsprecher, Desktop)
   muss die Spotify-App aktiv/geöffnet sein, damit ein "aktives Gerät"
   existiert – sonst erscheint ein entsprechender Hinweis. Über den
   **"⏹ Musik aus"**-Button direkt neben der Titelanzeige lässt sich
   die laufende Musik jederzeit sofort stoppen (z. B. wenn vergessen
   wurde, sie beim Spielstart zu pausieren) – danach kann über die
   Situationsbuttons wieder normal gestartet werden.
3. **Situationsbuttons**: Im Bearbeiten-Modus lässt sich die
   Reihenfolge der Buttons über die ▲▼-Pfeile an jedem Button anpassen.
   Ausserdem jedem Button einen
   Namen, eine Farbe, einen **Typ** sowie einen Spotify-Link zuweisen:
   - **🎵 Einzeltitel**: spielt immer denselben Song (z. B. Tor,
     Gegentor, Strafe, Strafe Gegner, Sieg, Spielende).
   - **📃 Playlist**: wählt bei jedem Tap zufällig einen noch nicht
     gespielten Titel aus der Playlist (z. B. Einlaufen, Pause,
     Spielunterbruch), damit sich Songs innerhalb eines Spiels nicht
     wiederholen.

   Für die URI reicht der normale **"Link kopieren"** aus dem
   Spotify-Teilen-Menü (z. B. `https://open.spotify.com/track/...`
   oder `.../playlist/...`) – die App erkennt und normalisiert ihn
   automatisch. Klassische `spotify:track:...`/`spotify:playlist:...`
   URIs funktionieren weiterhin ebenfalls.

   Zusätzlich ein Startpunkt in Sekunden (z. B. Intro von 15s
   überspringen). Bei **Einzeltitel** ist das ein einzelnes Feld; bei
   **Playlist** zeigt der Editor alle Songs der Playlist einzeln an,
   sodass für jeden Titel ein eigener Startpunkt hinterlegt werden
   kann (unterschiedliche Songs haben ja meist unterschiedlich lange
   Intros). Ein Tap im Normalmodus startet sofort den zugeordneten
   bzw. ausgewählten Song an der (für ihn) konfigurierten Position.
   Für viele Buttons können ausserdem optionale Gruppen wie
   „Pre-Game“ oder „Game“ vergeben werden. Die Gruppen erscheinen als
   auf- und zuklappbare Bereiche, damit die Anzeige übersichtlich bleibt.
4. **Neues Spiel**: Der Button "🆕 Neues Spiel" im Header setzt den
   "bereits gespielt"-Verlauf aller Playlist-Buttons zurück, damit zu
   Beginn des nächsten Spiels wieder alle Titel zur Auswahl stehen.
5. **Lokale Sounds**: Buzzer/Jingles als Audiodatei hochladen – diese
   werden lokal (IndexedDB) gespeichert und laufen komplett offline,
   unabhängig vom Spotify-Login.
6. **Installation**: Beim ersten Besuch erscheint ein Hinweis, die App
   "Zum Home-Bildschirm" hinzuzufügen (iOS: Teilen → Zum
   Home-Bildschirm; Android/Chrome: Installieren-Button oder
   Browsermenü).

## Architektur / Technische Entscheidungen

- **Vite + React + TypeScript**: leichtgewichtig, schneller Dev-Server,
  gute PWA-Plugin-Unterstützung (`vite-plugin-pwa`), TypeScript sichert
  die Spotify-API-Typen ab. React eignet sich gut für die
  konfigurierbare Button-UI mit mehreren Zuständen (Edit-Mode, Modal,
  Polling).
- **Spotify OAuth PKCE** (`src/spotify/auth.ts`): kein Client Secret,
  kein Backend nötig – Tokens (Access/Refresh) liegen in
  `localStorage` auf dem Gerät des Nutzers.
- **Spotify Web API Wrapper** (`src/spotify/api.ts`): Playback-Status,
  Play/Pause/Skip/Volume/Seek sowie Premium-Check.
- **IndexedDB via `idb`** (`src/storage/db.ts`): speichert
  Situationsbutton-Konfigurationen und lokale Sound-Dateien (als Blob)
  dauerhaft im Browser – keine Cloud, kein Server.
- **PWA-Basics**: `manifest.json` (via `vite-plugin-pwa`), Service
  Worker cached die App-Shell (UI) für Offline-Fähigkeit. Die
  Spotify-Steuerung selbst benötigt weiterhin Internet.

## Bekannte Grenzen (MVP)

- Playback-Status wird per Polling (alle 3s) abgefragt (kein
  Web-Playback-SDK/Streaming im Browser integriert).
- Situationsbuttons akzeptieren Track- oder Playlist-URIs im Format
  `spotify:track:...` bzw. `spotify:playlist:...`. Bei Playlist-Buttons
  wird der "bereits gespielt"-Verlauf lokal (IndexedDB) pro Button
  gespeichert; "Neues Spiel" setzt ihn zurück.
- Es wird kein eigenes Spotify-Gerät im Browser erzeugt – es muss ein
  vorhandenes aktives Gerät (Handy/Lautsprecher/Desktop-App) verwendet
  werden.
