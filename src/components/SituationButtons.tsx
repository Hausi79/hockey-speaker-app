import { useState } from 'react';
import type { SituationButtonConfig } from '../storage/types';

interface SituationButtonsProps {
  buttons: SituationButtonConfig[];
  editMode: boolean;
  onTrigger: (button: SituationButtonConfig) => void;
  onEdit: (button: SituationButtonConfig) => void;
  onAdd: () => void;
  triggeringId: string | null;
}

export function SituationButtons({
  buttons,
  editMode,
  onTrigger,
  onEdit,
  onAdd,
  triggeringId,
}: SituationButtonsProps) {
  const [pending, setPending] = useState<string | null>(null);

  return (
    <div className="situation-grid">
      {buttons.map((button) => {
        const isUnconfigured = !button.spotifyUri;
        return (
          <button
            key={button.id}
            className={`situation-button ${triggeringId === button.id ? 'situation-button--active' : ''}`}
            style={{ background: button.color }}
            onClick={() => {
              if (editMode) {
                onEdit(button);
                return;
              }
              if (isUnconfigured) {
                onEdit(button);
                return;
              }
              setPending(button.id);
              onTrigger(button);
              setTimeout(() => setPending(null), 400);
            }}
          >
            <span className="situation-button__label">
              {button.mode === 'playlist' ? '📃 ' : ''}
              {button.label}
            </span>
            {editMode && <span className="situation-button__badge">✏️ Bearbeiten</span>}
            {!editMode && isUnconfigured && (
              <span className="situation-button__badge">Nicht konfiguriert</span>
            )}
            {pending === button.id && <span className="situation-button__pulse" />}
          </button>
        );
      })}
      {editMode && (
        <button className="situation-button situation-button--add" onClick={onAdd}>
          + Neuer Button
        </button>
      )}
    </div>
  );
}
