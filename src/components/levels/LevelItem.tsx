import { useState, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { useDragContext } from '../../context/DragContext';
import { useDragSource } from '../../hooks/useDragSource';
import { useDropTarget } from '../../hooks/useDropTarget';
import { reorderIds } from '../../utils/reorderIds';
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
  const { selectedLevelId, setSelectedLevel, setSelectedSection, setView } = useUIStore();
  const { deleteLevel, fetchSections, sections, wordPairs, verbs, updateWordPair, moveVerb, reorderSections, moveSection } = useDataStore();
  const { draggingPairIds, setDraggingPairIds, setSelectedPairIds, draggingVerbIds, setDraggingVerbIds, setSelectedVerbIds, draggingSectionId, setDraggingSectionId, draggingLevelId, setDraggingLevelId } = useDragContext();
  const t = useT();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isSelected = selectedLevelId === level.id;
  const levelSections = sections.filter((s) => s.level_id === level.id);

  // Look up dragged section's current location
  const sectionBelongsToThisLevel = draggingSectionId !== null
    ? sections.find((s) => s.id === draggingSectionId)?.level_id === level.id
    : false;

  // Accept pair drop if any dragged pair belongs to a different level OR has a section assigned
  const canAcceptPairDrop = draggingPairIds.length > 0 && draggingPairIds.some((id) => {
    const p = wordPairs.find((wp) => wp.id === id);
    return p ? (p.level_id !== level.id || p.section_id != null) : false;
  });

  // Accept verb drop if any dragged verb belongs to a different level OR has a section assigned
  const canAcceptVerbDrop = draggingVerbIds.length > 0 && draggingVerbIds.some((id) => {
    const v = verbs.find((vb) => vb.id === id);
    return v ? (v.level_id !== level.id || v.section_id != null) : false;
  });

  const { dragProps, dragSourceClass } = useDragSource({
    id: level.id,
    setDraggingId: setDraggingLevelId,
    isDragging: draggingLevelId === level.id,
  });

  const { dropProps, dropTargetClass } = useDropTarget({
    acceptors: [
      {
        canAccept: canAcceptPairDrop,
        mode: 'content',
        onDrop: async () => {
          if (draggingPairIds.length > 0) {
            await Promise.all(draggingPairIds.map((id) => updateWordPair(id, { level_id: level.id, section_id: null })));
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
            await Promise.all(draggingVerbIds.map((id) => moveVerb(id, level.id, null)));
            setDraggingVerbIds([]);
            setSelectedVerbIds([]);
          }
        },
      },
      {
        canAccept: draggingSectionId !== null && !sectionBelongsToThisLevel,
        mode: 'content',
        onDrop: async () => {
          if (draggingSectionId !== null) {
            const movedSectionId = draggingSectionId;
            await moveSection(movedSectionId, level.id);
            setDraggingSectionId(null);
            setSelectedLevel(level.id);
            setSelectedSection(movedSectionId);
          }
        },
      },
      {
        canAccept: draggingLevelId !== null && draggingLevelId !== level.id,
        mode: 'reorder',
        onDrop: (position) => {
          onLevelDrop?.(level.id, position ?? 'below');
          setDraggingLevelId(null);
        },
      },
    ],
    showDashedHint: canAcceptPairDrop || canAcceptVerbDrop,
  });

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

  const handleSectionDrop = async (targetSectionId: number, position: 'above' | 'below') => {
    if (draggingSectionId === null || draggingSectionId === targetSectionId) return;
    const ids = levelSections.map((s) => s.id);
    const isSameLevel = ids.includes(draggingSectionId);

    if (!isSameLevel) {
      // Cross-level: move the section to this level first
      await moveSection(draggingSectionId, level.id);
      const updatedIds = useDataStore.getState().sections
        .filter((s) => s.level_id === level.id)
        .sort((a, b) => a.position - b.position)
        .map((s) => s.id);
      await reorderSections(level.id, reorderIds(updatedIds, draggingSectionId, targetSectionId, position));
    } else {
      await reorderSections(level.id, reorderIds(ids, draggingSectionId, targetSectionId, position));
    }
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
          } ${dropTargetClass} ${dragSourceClass}`}
          onClick={handleSelect}
          {...dragProps}
          {...dropProps}
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
              <SectionItem key={section.id} section={section} onSectionDrop={handleSectionDrop} />
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
