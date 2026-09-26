// IndexedDB persistence layer (via the tiny `idb` helper). No server,
// no cloud - everything stays in the browser on the device.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  DEFAULT_SITUATION_BUTTONS,
  type LocalSound,
  type PlaylistProgress,
  type SituationButtonConfig,
} from './types';

interface HockeySpeakerDB extends DBSchema {
  situationButtons: {
    key: string;
    value: SituationButtonConfig;
    indexes: { order: number };
  };
  localSounds: {
    key: string;
    value: LocalSound;
    indexes: { order: number };
  };
  playlistProgress: {
    key: string;
    value: PlaylistProgress;
  };
}

const DB_NAME = 'hockey-speaker-app';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<HockeySpeakerDB>> | null = null;

function getDb(): Promise<IDBPDatabase<HockeySpeakerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HockeySpeakerDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const buttons = db.createObjectStore('situationButtons', { keyPath: 'id' });
          buttons.createIndex('order', 'order');

          const sounds = db.createObjectStore('localSounds', { keyPath: 'id' });
          sounds.createIndex('order', 'order');
        }
        if (oldVersion < 2) {
          db.createObjectStore('playlistProgress', { keyPath: 'buttonId' });
        }
      },
    });
  }
  return dbPromise;
}

function newId(): string {
  return crypto.randomUUID();
}

// --- Situation buttons -----------------------------------------------

export async function getSituationButtons(): Promise<SituationButtonConfig[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('situationButtons', 'order');
  if (all.length === 0) {
    // First run: seed with sensible defaults so the UI isn't empty.
    const seeded: SituationButtonConfig[] = DEFAULT_SITUATION_BUTTONS.map((b) => ({
      ...b,
      id: newId(),
    }));
    const tx = db.transaction('situationButtons', 'readwrite');
    await Promise.all(seeded.map((b) => tx.store.put(b)));
    await tx.done;
    return seeded;
  }
  return all;
}

export async function saveSituationButton(button: SituationButtonConfig): Promise<void> {
  const db = await getDb();
  await db.put('situationButtons', button);
}

/** Persists a full set of buttons at once, used when reordering. */
export async function saveSituationButtons(buttons: SituationButtonConfig[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('situationButtons', 'readwrite');
  await Promise.all(buttons.map((b) => tx.store.put(b)));
  await tx.done;
}

/**
 * Replaces the entire set of situation buttons with the given list,
 * deleting any existing ones first. Used for config import.
 */
export async function replaceSituationButtons(buttons: SituationButtonConfig[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('situationButtons', 'readwrite');
  await tx.store.clear();
  await Promise.all(buttons.map((b) => tx.store.put(b)));
  await tx.done;
}

export async function createSituationButton(
  data: Omit<SituationButtonConfig, 'id'>,
): Promise<SituationButtonConfig> {
  const button: SituationButtonConfig = { ...data, id: newId() };
  await saveSituationButton(button);
  return button;
}

export async function deleteSituationButton(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('situationButtons', id);
}

// --- Local sounds -------------------------------------------------------

export async function getLocalSounds(): Promise<LocalSound[]> {
  const db = await getDb();
  return db.getAllFromIndex('localSounds', 'order');
}

export async function addLocalSound(
  file: File,
  label: string,
): Promise<LocalSound> {
  const db = await getDb();
  const existing = await db.getAllFromIndex('localSounds', 'order');
  const sound: LocalSound = {
    id: newId(),
    order: existing.length,
    label,
    fileName: file.name,
    blob: file,
    mimeType: file.type || 'audio/mpeg',
  };
  await db.put('localSounds', sound);
  return sound;
}

export async function deleteLocalSound(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('localSounds', id);
}

// --- Playlist progress (per-game "already played" tracking) ------------

export async function getPlayedTrackUris(buttonId: string): Promise<string[]> {
  const db = await getDb();
  const progress = await db.get('playlistProgress', buttonId);
  return progress?.playedTrackUris ?? [];
}

export async function markTrackAsPlayed(buttonId: string, trackUri: string): Promise<void> {
  const db = await getDb();
  const existing = await db.get('playlistProgress', buttonId);
  const playedTrackUris = existing ? [...existing.playedTrackUris, trackUri] : [trackUri];
  await db.put('playlistProgress', { buttonId, playedTrackUris });
}

export async function resetTrackProgress(buttonId: string, keepUris: string[] = []): Promise<void> {
  const db = await getDb();
  await db.put('playlistProgress', { buttonId, playedTrackUris: keepUris });
}

/** Clears the "already played" history for all playlist buttons ("Neues Spiel"). */
export async function resetAllPlaylistProgress(): Promise<void> {
  const db = await getDb();
  await db.clear('playlistProgress');
}
