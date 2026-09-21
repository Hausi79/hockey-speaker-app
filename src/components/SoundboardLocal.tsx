import { useEffect, useRef, useState } from 'react';
import { addLocalSound, deleteLocalSound, getLocalSounds } from '../storage/db';
import type { LocalSound } from '../storage/types';

export function SoundboardLocal() {
  const [sounds, setSounds] = useState<LocalSound[]>([]);
  const [objectUrls, setObjectUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const list = await getLocalSounds();
    setSounds(list);
    setObjectUrls((prev) => {
      // Revoke old URLs to avoid memory leaks, then build fresh ones.
      Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
      const next: Record<string, string> = {};
      for (const sound of list) {
        next[sound.id] = URL.createObjectURL(sound.blob);
      }
      return next;
    });
  };

  useEffect(() => {
    load();
    return () => {
      setObjectUrls((prev) => {
        Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
        return prev;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const label = file.name.replace(/\.[^/.]+$/, '');
      await addLocalSound(file, label);
    }
    await load();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const play = (id: string) => {
    const url = objectUrls[id];
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch(() => {
      /* autoplay restrictions – user tap already satisfies this in practice */
    });
  };

  const remove = async (id: string) => {
    await deleteLocalSound(id);
    await load();
  };

  return (
    <div className="soundboard">
      <div className="soundboard__header">
        <h3>Lokale Sounds (Buzzer, Jingles)</h3>
        <label className="btn-secondary btn-file">
          + Datei hinzufügen
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>
      <p className="hint">
        Läuft komplett offline und unabhängig vom Spotify-Login – ideal für Buzzer/Signale.
      </p>
      <div className="soundboard__grid">
        {sounds.map((sound) => (
          <div key={sound.id} className="sound-tile">
            <button className="sound-tile__play" onClick={() => play(sound.id)}>
              🔊 {sound.label}
            </button>
            <button
              className="sound-tile__delete"
              onClick={() => remove(sound.id)}
              aria-label="Löschen"
            >
              ✕
            </button>
          </div>
        ))}
        {sounds.length === 0 && <p className="hint">Noch keine lokalen Sounds hinzugefügt.</p>}
      </div>
    </div>
  );
}
