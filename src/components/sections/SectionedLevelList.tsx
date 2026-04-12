import { useState } from 'react';
import { LevelItem } from '../levels/LevelItem';
import { AddEditLevelModal } from '../levels/AddEditLevelModal';
import { Button } from '../shared/Button';
import { PlusIcon } from '../shared/Icons';
import type { Level } from '../../types';
import { useT } from '../../i18n/useT';
import { useDataStore } from '../../store/dataStore';
import { useDragContext } from '../../context/DragContext';
import { reorderIds } from '../../utils/reorderIds';

interface SectionedLevelListProps {
  levels: Level[];
  languageId: number;
}

export function SectionedLevelList({ levels, languageId }: SectionedLevelListProps) {
  const t = useT();
  const [showAddLevel, setShowAddLevel] = useState(false);
  const { reorderLevels } = useDataStore();
  const { draggingLevelId } = useDragContext();

  const handleLevelDrop = (targetLevelId: number, position: 'above' | 'below') => {
    if (draggingLevelId === null || draggingLevelId === targetLevelId) return;
    reorderLevels(languageId, reorderIds(levels.map((l) => l.id), draggingLevelId, targetLevelId, position));
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t.levels}</span>
        <Button variant="icon" hoverColor="indigo" onClick={() => setShowAddLevel(true)} title={t.addLevel}>
          <PlusIcon />
        </Button>
      </div>

      {levels.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 px-1 py-2">{t.noLevelsYet}</p>
      ) : (
        levels.map((level) => <LevelItem key={level.id} level={level} onLevelDrop={handleLevelDrop} />)
      )}

      <AddEditLevelModal
        isOpen={showAddLevel}
        onClose={() => setShowAddLevel(false)}
        languageId={languageId}
      />
    </div>
  );
}
