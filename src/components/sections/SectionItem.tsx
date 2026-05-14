import { useState, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { useDragContext } from '../../context/DragContext';
import { useDragSource } from '../../hooks/useDragSource';
import { useDropTarget } from '../../hooks/useDropTarget';
import { reorderIds } from '../../utils/reorderIds';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { AddEditSectionModal } from './AddEditSectionModal';
import { SubsectionItem } from './SubsectionItem';
import { AddEditSubsectionModal } from './AddEditSubsectionModal';
import { Button } from '../shared/Button';
import type { Section } from '../../types';
import { useT } from '../../i18n/useT';
import { PencilIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon, PlusIcon } from '../shared/Icons';

interface SectionItemProps {
  section: Section;
  onSectionDrop?: (targetSectionId: number, position: 'above' | 'below') => void;
}

export function SectionItem({ section, onSectionDrop }: SectionItemProps) {
  const { selectedSectionId, setSelectedSection, setSelectedSubsection, setView } = useUIStore();
  const { deleteSection, fetchSubsections, subsections, wordPairs, verbs, updateWordPair, moveVerb, reorderSubsections, moveSubsection } = useDataStore();
  const { draggingPairIds, setDraggingPairIds, setSelectedPairIds, draggingVerbIds, setDraggingVerbIds, setSelectedVerbIds, draggingSubsectionId, setDraggingSubsectionId, draggingSectionId, setDraggingSectionId } = useDragContext();
  const t = useT();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddSubsection, setShowAddSubsection] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isSelected = selectedSectionId === section.id;
  const sectionSubsections = subsections.filter((s) => s.section_id === section.id);

  const subsectionBelongsToThisSection = draggingSubsectionId !== null
    ? subsections.find((s) => s.id === draggingSubsectionId)?.section_id === section.id
    : false;

  const canAcceptPairDrop = draggingPairIds.length > 0 && draggingPairIds.some((id) => {
    const p = wordPairs.find((wp) => wp.id === id);
    return p ? (p.section_id !== section.id || p.subsection_id != null) : false;
  });

  const canAcceptVerbDrop = draggingVerbIds.length > 0 && draggingVerbIds.some((id) => {
    const v = verbs.find((vb) => vb.id === id);
    return v ? (v.section_id !== section.id || v.subsection_id != null) : false;
  });

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
          if (draggingPairIds.length > 0) {
            await Promise.all(draggingPairIds.map((id) => updateWordPair(id, { section_id: section.id, subsection_id: null })));
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
            await Promise.all(draggingVerbIds.map((id) => moveVerb(id, section.id, null)));
            setDraggingVerbIds([]);
            setSelectedVerbIds([]);
          }
        },
      },
      {
        canAccept: draggingSubsectionId !== null && !subsectionBelongsToThisSection,
        mode: 'content',
        onDrop: async () => {
          if (draggingSubsectionId !== null) {
            const movedSubsectionId = draggingSubsectionId;
            await moveSubsection(movedSubsectionId, section.id);
            setDraggingSubsectionId(null);
            setSelectedSection(section.id);
            setSelectedSubsection(movedSubsectionId);
          }
        },
      },
      {
        canAccept: draggingSectionId !== null && draggingSectionId !== section.id,
        mode: 'reorder',
        onDrop: (position) => {
          onSectionDrop?.(section.id, position ?? 'below');
          setDraggingSectionId(null);
        },
      },
    ],
    showDashedHint: canAcceptPairDrop || canAcceptVerbDrop,
  });

  useEffect(() => {
    if (isSelected && !expanded) {
      setExpanded(true);
      fetchSubsections(section.id);
    }
  }, [isSelected]);

  const handleSelect = () => {
    setSelectedSection(section.id);
    setView('wordpairs');
    if (!expanded) {
      setExpanded(true);
      fetchSubsections(section.id);
    }
  };

  const handleSubsectionDrop = async (targetSubsectionId: number, position: 'above' | 'below') => {
    if (draggingSubsectionId === null || draggingSubsectionId === targetSubsectionId) return;
    const ids = sectionSubsections.map((s) => s.id);
    const isSameSection = ids.includes(draggingSubsectionId);

    if (!isSameSection) {
      await moveSubsection(draggingSubsectionId, section.id);
      const updatedIds = useDataStore.getState().subsections
        .filter((s) => s.section_id === section.id)
        .sort((a, b) => a.position - b.position)
        .map((s) => s.id);
      await reorderSubsections(section.id, reorderIds(updatedIds, draggingSubsectionId, targetSubsectionId, position));
    } else {
      await reorderSubsections(section.id, reorderIds(ids, draggingSubsectionId, targetSubsectionId, position));
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !expanded;
    setExpanded(next);
    if (next) fetchSubsections(section.id);
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
            <span className="truncate">{section.name}</span>
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
            {sectionSubsections.map((subsection) => (
              <SubsectionItem key={subsection.id} subsection={subsection} onSubsectionDrop={handleSubsectionDrop} />
            ))}
            <Button
              variant="icon"
              hoverColor="indigo"
              onClick={() => setShowAddSubsection(true)}
              title={t.addSubsection}
              className="p-1.5"
            >
              <PlusIcon size={16} />
            </Button>
          </div>
        )}
      </div>

      <AddEditSectionModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        languageId={section.language_id}
        section={section}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteSection(section.id)}
        title={t.deleteSectionTitle}
        message={t.deleteSectionMessage(section.name)}
      />

      <AddEditSubsectionModal
        isOpen={showAddSubsection}
        onClose={() => setShowAddSubsection(false)}
        sectionId={section.id}
      />
    </>
  );
}
