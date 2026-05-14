import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { useDragContext } from '../../context/DragContext';
import { useDragSource } from '../../hooks/useDragSource';
import { useDropTarget } from '../../hooks/useDropTarget';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { AddEditSubsectionModal } from './AddEditSubsectionModal';
import { Button } from '../shared/Button';
import type { Subsection } from '../../types';
import { useT } from '../../i18n/useT';
import { PencilIcon, TrashIcon } from '../shared/Icons';

interface SubsectionItemProps {
  subsection: Subsection;
  onSubsectionDrop?: (targetSubsectionId: number, position: 'above' | 'below') => void;
}

export function SubsectionItem({ subsection, onSubsectionDrop }: SubsectionItemProps) {
  const { selectedSubsectionId, setSelectedSection, setSelectedSubsection, setView } = useUIStore();
  const { deleteSubsection, updateWordPair, moveVerb, subsections } = useDataStore();
  const { draggingPairIds, setDraggingPairIds, setSelectedPairIds, draggingVerbIds, setDraggingVerbIds, setSelectedVerbIds, draggingSubsectionId, setDraggingSubsectionId } = useDragContext();
  const t = useT();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const isSelected = selectedSubsectionId === subsection.id;
  const draggedSubsection = draggingSubsectionId !== null ? subsections.find(s => s.id === draggingSubsectionId) : null;
  const canAcceptPairDrop = draggingPairIds.length > 0;
  const canAcceptVerbDrop = draggingVerbIds.length > 0;

  const { dragProps, dragSourceClass } = useDragSource({
    id: subsection.id,
    setDraggingId: setDraggingSubsectionId,
    isDragging: draggingSubsectionId === subsection.id,
  });

  const { dropProps, dropTargetClass } = useDropTarget({
    acceptors: [
      {
        canAccept: canAcceptPairDrop,
        mode: 'content',
        onDrop: async () => {
          if (draggingPairIds.length > 0) {
            await Promise.all(draggingPairIds.map((id) => updateWordPair(id, { section_id: subsection.section_id, subsection_id: subsection.id })));
            setDraggingPairIds([]);
            setSelectedPairIds([]);
          }
        },
      },
      {
        canAccept: canAcceptVerbDrop,
        mode: 'content',
        onDrop: async () => {
          if (draggingVerbIds.length > 0) {
            await Promise.all(draggingVerbIds.map((id) => moveVerb(id, subsection.section_id, subsection.id)));
            setDraggingVerbIds([]);
            setSelectedVerbIds([]);
          }
        },
      },
      {
        canAccept: draggedSubsection != null && draggedSubsection.id !== subsection.id,
        mode: 'reorder',
        onDrop: (position) => {
          onSubsectionDrop?.(subsection.id, position ?? 'below');
          setDraggingSubsectionId(null);
        },
      },
    ],
    showDashedHint: canAcceptPairDrop || canAcceptVerbDrop,
  });

  const handleSelect = () => {
    setSelectedSection(subsection.section_id);
    setSelectedSubsection(subsection.id);
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
        <span className="truncate text-xs">{subsection.name}</span>
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

      <AddEditSubsectionModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        sectionId={subsection.section_id}
        subsection={subsection}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteSubsection(subsection.id)}
        title={t.deleteSubsectionTitle}
        message={t.deleteSubsectionMessage(subsection.name)}
      />
    </>
  );
}
