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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('hsa.collapsed-groups') ?? '[]'));
    } catch {
      return new Set();
    }
  });

  const toggleGroup = (group: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      localStorage.setItem('hsa.collapsed-groups', JSON.stringify([...next]));
      return next;
    });
  };

  const sortedButtons = [...buttons].sort((a, b) => a.order - b.order);
  const groups = sortedButtons.reduce<Array<{ name: string; buttons: SituationButtonConfig[] }>>(
    (result, button) => {
      const name = button.group?.trim() || 'Weitere Buttons';
      const existing = result.find((group) => group.name === name);
      if (existing) existing.buttons.push(button);
      else result.push({ name, buttons: [button] });
      return result;
    },
    [],
  );

  return (
    <div className="situation-groups">
      {groups.map((group) => (
        <section className="situation-group" key={group.name}>
          <button
            type="button"
            className="situation-group__header"
            onClick={() => toggleGroup(group.name)}
            aria-expanded={!collapsedGroups.has(group.name)}
          >
            <span>{collapsedGroups.has(group.name) ? '▶' : '▼'} {group.name}</span>
            <span className="situation-group__count">{group.buttons.length}</span>
          </button>
          {!collapsedGroups.has(group.name) && (
            <div className="situation-grid">
              {group.buttons.map((button) => {
                const globalIndex = sortedButtons.findIndex((item) => item.id === button.id);
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
                          className={`situation-button__reorder-btn ${globalIndex === 0 ? 'situation-button__reorder-btn--disabled' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (globalIndex > 0) onMove(button.id, 'up');
                          }}
                        >
                          ▲
                        </span>
                        <span
                          role="button"
                          aria-label="Nach unten verschieben"
                          className={`situation-button__reorder-btn ${globalIndex === sortedButtons.length - 1 ? 'situation-button__reorder-btn--disabled' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (globalIndex < sortedButtons.length - 1) onMove(button.id, 'down');
                          }}
                        >
                          ▼
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ))}
      {editMode && (
        <button className="situation-button situation-button--add" onClick={onAdd}>
          + Neuer Button
        </button>
      )}
    </div>
  );
}
