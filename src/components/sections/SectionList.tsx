import { useState } from 'react';
import { SectionItem } from './SectionItem';
import { AddEditSectionModal } from './AddEditSectionModal';
import { Button } from '../shared/Button';
import { PlusIcon } from '../shared/Icons';
import type { Section } from '../../types';
import { useT } from '../../i18n/useT';
import { useDataStore } from '../../store/dataStore';
import { useDragContext } from '../../context/DragContext';
import { reorderIds } from '../../utils/reorderIds';

interface SectionListProps {
  sections: Section[];
  languageId: number;
}

export function SectionList({ sections, languageId }: SectionListProps) {
  const t = useT();
  const [showAddSection, setShowAddSection] = useState(false);
  const { reorderSections } = useDataStore();
  const { draggingSectionId } = useDragContext();

  const handleSectionDrop = (targetSectionId: number, position: 'above' | 'below') => {
    if (draggingSectionId === null || draggingSectionId === targetSectionId) return;
    reorderSections(languageId, reorderIds(sections.map((s) => s.id), draggingSectionId, targetSectionId, position));
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t.sections}</span>
        <Button variant="icon" hoverColor="indigo" onClick={() => setShowAddSection(true)} title={t.addSection}>
          <PlusIcon />
        </Button>
      </div>

      {sections.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 px-1 py-2">{t.noSectionsYet}</p>
      ) : (
        sections.map((section) => <SectionItem key={section.id} section={section} onSectionDrop={handleSectionDrop} />)
      )}

      <AddEditSectionModal
        isOpen={showAddSection}
        onClose={() => setShowAddSection(false)}
        languageId={languageId}
      />
    </div>
  );
}
