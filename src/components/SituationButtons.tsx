import { useState } from 'react';
import type { SituationButtonConfig } from '../storage/types';

interface SituationButtonsProps {
  buttons: SituationButtonConfig[];
  editMode: boolean;
  onTrigger: (button: SituationButtonConfig) => void;
  onEdit: (button: SituationButtonConfig) => void;
  onAdd: () => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  triggeringId: string | null;
}

export function SituationButtons({
  buttons,
  editMode,
  onTrigger,
  onEdit,
  onAdd,
  onMove,
  triggeringId,
}: SituationButtonsProps) {
  const [pending, setPending] = useState<string | null>(null);

  return (
    <div className="situation-grid">
      {buttons.map((button, index) => {
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
            {editMode && (
              <span className="situation-button__reorder">
                <span
                  role="button"
                  aria-label="Nach oben verschieben"
                  className={`situation-button__reorder-btn ${index === 0 ? 'situation-button__reorder-btn--disabled' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (index > 0) onMove(button.id, 'up');
                  }}
                >
                  ▲
                </span>
                <span
                  role="button"
                  aria-label="Nach unten verschieben"
                  className={`situation-button__reorder-btn ${index === buttons.length - 1 ? 'situation-button__reorder-btn--disabled' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (index < buttons.length - 1) onMove(button.id, 'down');
                  }}
                >
                  ▼
                </span>
              </span>
            )}
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
