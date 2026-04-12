import { useState, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { useDragContext } from '../../context/DragContext';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { AddEditLevelModal } from './AddEditLevelModal';
import { SectionItem } from '../sections/SectionItem';
import { AddEditSectionModal } from '../sections/AddEditSectionModal';
import { Button } from '../shared/Button';
import type { Level } from '../../types';
import { useT } from '../../i18n/useT';
import { PencilIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon, PlusIcon } from '../shared/Icons';

interface LevelItemProps {
  level: Level;
  onLevelDrop?: (targetLevelId: number, position: 'above' | 'below') => void;
}

export function LevelItem({ level, onLevelDrop }: LevelItemProps) {
  const { selectedLevelId, setSelectedLevel, setView } = useUIStore();
  const { deleteLevel, fetchSections, sections, wordPairs, updateWordPair, reorderSections, moveSection } = useDataStore();
  const { draggingPairId, setDraggingPairId, draggingSectionId, setDraggingSectionId, draggingLevelId, setDraggingLevelId } = useDragContext();
  const t = useT();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);

  const isSelected = selectedLevelId === level.id;
  const levelSections = sections.filter((s) => s.level_id === level.id);

  // Look up dragged pair's current location
  const draggedPair = draggingPairId !== null ? wordPairs.find((p) => p.id === draggingPairId) : null;
  const pairBelongsToThisLevel = draggedPair?.level_id === level.id;

  // Look up dragged section's current location
  const draggedSection = draggingSectionId !== null ? sections.find((s) => s.id === draggingSectionId) : null;
  const sectionBelongsToThisLevel = draggedSection?.level_id === level.id;

  // Level drag gating
  const canAcceptLevelDrop = draggingLevelId !== null && draggingLevelId !== level.id;

  // Gating
  const canAcceptPairDrop = draggingPairId !== null && !pairBelongsToThisLevel;
  const canAcceptSectionDrop = draggingSectionId !== null && !sectionBelongsToThisLevel;
  const canAcceptDrop = canAcceptPairDrop || canAcceptSectionDrop || canAcceptLevelDrop;
  const showDashedHint = canAcceptPairDrop;

  useEffect(() => {
    if (isSelected && !expanded) {
      setExpanded(true);
      fetchSections(level.id);
    }
  }, [isSelected]);

  const handleSelect = () => {
    setSelectedLevel(level.id);
    setView('wordpairs');
    if (!expanded) {
      setExpanded(true);
      fetchSections(level.id);
    }
  };

  const handleSectionDrop = (targetSectionId: number, position: 'above' | 'below') => {
    if (draggingSectionId === null || draggingSectionId === targetSectionId) return;
    const ids = levelSections.map((s) => s.id);
    const fromIndex = ids.indexOf(draggingSectionId);
    if (fromIndex === -1) return;
    ids.splice(fromIndex, 1);
    const targetIdx = ids.indexOf(targetSectionId);
    if (targetIdx === -1) return;
    const insertIdx = position === 'below' ? targetIdx + 1 : targetIdx;
    ids.splice(insertIdx, 0, draggingSectionId);
    reorderSections(level.id, ids);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !expanded;
    setExpanded(next);
    if (next) fetchSections(level.id);
  };

  return (
    <>
      <div className="flex flex-col">
        <div
          className={`group flex items-center justify-between rounded-md px-2 py-2 cursor-pointer text-sm transition-colors ${
            isSelected
              ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-medium'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          } ${isDragOver ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/40' : ''} ${showDashedHint && !isDragOver ? 'border border-dashed border-indigo-300 dark:border-indigo-600' : ''} ${draggingLevelId === level.id ? 'opacity-50' : ''} ${dropPosition === 'above' ? 'border-t-2 border-t-indigo-500' : ''} ${dropPosition === 'below' ? 'border-b-2 border-b-indigo-500' : ''}`}
          onClick={handleSelect}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(level.id));
            setDraggingLevelId(level.id);
          }}
          onDragEnd={() => setDraggingLevelId(null)}
          onDragOver={(e) => {
            if (!canAcceptDrop) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (canAcceptPairDrop || canAcceptSectionDrop) {
              setIsDragOver(true);
            } else if (canAcceptLevelDrop) {
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
            if (draggingLevelId !== null && draggingLevelId !== level.id) {
              onLevelDrop?.(level.id, pos ?? 'below');
              setDraggingLevelId(null);
              return;
            }
            if (draggingSectionId !== null && !sectionBelongsToThisLevel) {
              await moveSection(draggingSectionId, level.id);
              setDraggingSectionId(null);
              return;
            }
            if (draggingPairId !== null) {
              await updateWordPair(draggingPairId, { level_id: level.id, section_id: null });
              setDraggingPairId(null);
            }
          }}
        >
          <div className="flex items-center gap-1 min-w-0">
            <span
              className="text-gray-400 dark:text-gray-500 flex-shrink-0 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={handleToggleExpand}
            >
              {expanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
            </span>
            <span className="truncate">{level.name}</span>
          </div>
          <span className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
            <Button
              variant="icon"
              hoverColor="indigo"
              onClick={(e) => { e.stopPropagation(); setShowEdit(true); }}
              title={t.edit}
            >
              <PencilIcon />
            </Button>
            <Button
              variant="icon"
              hoverColor="red"
              onClick={(e) => { e.stopPropagation(); setShowDelete(true); }}
              title={t.delete}
            >
              <TrashIcon />
            </Button>
          </span>
        </div>

        {expanded && (
          <div className="pl-4 flex flex-col gap-0.5 mt-0.5">
            {levelSections.map((section) => (
              <SectionItem key={section.id} section={section} onSectionDrop={handleSectionDrop} currentPairSectionId={draggedPair?.section_id} />
            ))}
            <Button
              variant="icon"
              hoverColor="indigo"
              onClick={() => setShowAddSection(true)}
              title={t.addSection}
              className="p-1.5"
            >
              <PlusIcon size={16} />
            </Button>
          </div>
        )}
      </div>

      <AddEditLevelModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        languageId={level.language_id}
        level={level}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteLevel(level.id)}
        title={t.deleteLevelTitle}
        message={t.deleteLevelMessage(level.name)}
      />

      <AddEditSectionModal
        isOpen={showAddSection}
        onClose={() => setShowAddSection(false)}
        levelId={level.id}
      />
    </>
  );
}
