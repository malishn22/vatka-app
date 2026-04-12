import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { useDragContext } from '../../context/DragContext';
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
}

export function SectionItem({ section, onSectionDrop, currentPairSectionId }: SectionItemProps) {
  const { selectedSectionId, setSelectedLevel, setSelectedSection, setView } = useUIStore();
  const { deleteSection, updateWordPair, sections } = useDataStore();
  const { draggingPairId, setDraggingPairId, draggingSectionId, setDraggingSectionId } = useDragContext();
  const t = useT();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);

  const isSelected = selectedSectionId === section.id;

  // Can this section accept the current drag?
  const canAcceptPairDrop = draggingPairId !== null && currentPairSectionId !== section.id;
  const draggedSection = draggingSectionId !== null ? sections.find(s => s.id === draggingSectionId) : null;
  const canAcceptSectionDrop = draggedSection != null && draggedSection.id !== section.id;
  const showDashedHint = draggingPairId !== null && currentPairSectionId !== section.id;

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
        } ${isDragOver ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/40' : ''} ${showDashedHint && !isDragOver ? 'border border-dashed border-indigo-300 dark:border-indigo-600' : ''} ${draggingSectionId === section.id ? 'opacity-50' : ''} ${dropPosition === 'above' ? 'border-t-2 border-t-indigo-500' : ''} ${dropPosition === 'below' ? 'border-b-2 border-b-indigo-500' : ''}`}
        onClick={handleSelect}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(section.id));
          setDraggingSectionId(section.id);
        }}
        onDragEnd={() => setDraggingSectionId(null)}
        onDragOver={(e) => {
          if (!canAcceptPairDrop && !canAcceptSectionDrop) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (canAcceptPairDrop) {
            setIsDragOver(true);
          } else if (canAcceptSectionDrop) {
            const rect = e.currentTarget.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            setDropPosition(e.clientY < mid ? 'above' : 'below');
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
            setDropPosition(null);
          }
        }}
        onDrop={async (e) => {
          e.preventDefault();
          setIsDragOver(false);
          const pos = dropPosition;
          setDropPosition(null);
          if (draggingSectionId !== null && draggingSectionId !== section.id) {
            onSectionDrop?.(section.id, pos ?? 'below');
            setDraggingSectionId(null);
            return;
          }
          if (draggingPairId !== null) {
            await updateWordPair(draggingPairId, { level_id: section.level_id, section_id: section.id });
            setDraggingPairId(null);
          }
        }}
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
