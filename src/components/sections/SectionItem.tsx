import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { useDragContext } from '../../context/DragContext';
import { useDragSource } from '../../hooks/useDragSource';
import { useDropTarget } from '../../hooks/useDropTarget';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { AddEditSectionModal } from './AddEditSectionModal';
import { Button } from '../shared/Button';
import type { Section } from '../../types';
import { useT } from '../../i18n/useT';
import { PencilIcon, TrashIcon } from '../shared/Icons';

interface SectionItemProps {
  section: Section;
  onSectionDrop?: (targetSectionId: number, position: 'above' | 'below') => void;
  currentPairSectionId?: number | null;
  currentVerbSectionId?: number | null;
}

export function SectionItem({ section, onSectionDrop, currentPairSectionId, currentVerbSectionId }: SectionItemProps) {
  const { selectedSectionId, setSelectedLevel, setSelectedSection, setView } = useUIStore();
  const { deleteSection, updateWordPair, moveVerb, sections } = useDataStore();
  const { draggingPairId, setDraggingPairId, draggingVerbId, setDraggingVerbId, draggingSectionId, setDraggingSectionId } = useDragContext();
  const t = useT();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const isSelected = selectedSectionId === section.id;
  const draggedSection = draggingSectionId !== null ? sections.find(s => s.id === draggingSectionId) : null;
  const canAcceptPairDrop = draggingPairId !== null && currentPairSectionId !== section.id;
  const canAcceptVerbDrop = draggingVerbId !== null && currentVerbSectionId !== section.id;

  const { dragProps, dragSourceClass } = useDragSource({
    id: section.id,
    setDraggingId: setDraggingSectionId,
    isDragging: draggingSectionId === section.id,
  });

  const { dropProps, dropTargetClass } = useDropTarget({
    acceptors: [
      {
        canAccept: canAcceptPairDrop,
        mode: 'content',
        onDrop: async () => {
          if (draggingPairId !== null) {
            await updateWordPair(draggingPairId, { level_id: section.level_id, section_id: section.id });
            setDraggingPairId(null);
          }
        },
      },
      {
        canAccept: canAcceptVerbDrop,
        mode: 'content',
        onDrop: async () => {
          if (draggingVerbId !== null) {
            await moveVerb(draggingVerbId, section.level_id, section.id);
            setDraggingVerbId(null);
          }
        },
      },
      {
        canAccept: draggedSection != null && draggedSection.id !== section.id,
        mode: 'reorder',
        onDrop: (position) => {
          onSectionDrop?.(section.id, position ?? 'below');
          setDraggingSectionId(null);
        },
      },
    ],
    showDashedHint: canAcceptPairDrop || canAcceptVerbDrop,
  });

  const handleSelect = () => {
    setSelectedLevel(section.level_id);
    setSelectedSection(section.id);
    setView('wordpairs');
  };

  return (
    <>
      <div
        className={`group flex items-center justify-between rounded-md px-3 py-1.5 cursor-pointer text-sm transition-colors ${
          isSelected
            ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-medium'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
        } ${dropTargetClass} ${dragSourceClass}`}
        onClick={handleSelect}
        {...dragProps}
        {...dropProps}
      >
        <span className="truncate text-xs">{section.name}</span>
        <span className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
          <Button
            variant="icon"
            hoverColor="indigo"
            onClick={(e) => { e.stopPropagation(); setShowEdit(true); }}
            title={t.edit}
          >
            <PencilIcon size={14} />
          </Button>
          <Button
            variant="icon"
            hoverColor="red"
            onClick={(e) => { e.stopPropagation(); setShowDelete(true); }}
            title={t.delete}
          >
            <TrashIcon size={14} />
          </Button>
        </span>
      </div>

      <AddEditSectionModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        levelId={section.level_id}
        section={section}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteSection(section.id)}
        title={t.deleteSectionTitle}
        message={t.deleteSectionMessage(section.name)}
      />
    </>
  );
}
