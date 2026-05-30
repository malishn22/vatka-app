import { useState } from 'react';
import type React from 'react';
import { useDataStore } from '../../store/dataStore';
import { useDragContext } from '../../context/DragContext';
import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';
import { PencilIcon, TrashIcon, EyeIcon, EyeOffIcon, ChevronDownIcon, ChevronRightIcon } from '../shared/Icons';
import { SectionBadge } from '../shared/SectionBadge';
import type { VerbWithConjugations } from '../../types';

interface VerbRowProps {
  verb: VerbWithConjugations;
  onEdit: (verb: VerbWithConjugations) => void;
  showSection?: boolean;
  sectionName?: string;
  subsectionName?: string;
  isSelected?: boolean;
  onToggleSelect?: (additive: boolean) => void;
  onRowClick?: () => void;
}

export function VerbRow({ verb, onEdit, showSection, sectionName, subsectionName, isSelected = false, onToggleSelect, onRowClick }: VerbRowProps) {
  const { deleteVerb, toggleVerbDisabled } = useDataStore();
  const { draggingVerbIds, setDraggingVerbIds, selectedVerbIds, setSelectedVerbIds } = useDragContext();
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  const isDisabled = Boolean(verb.disabled);

  const formTypeGroups = verb.conjugations.reduce<Record<string, { person: string; form: string }[]>>((acc, c) => {
    if (!acc[c.form_type]) acc[c.form_type] = [];
    acc[c.form_type].push({ person: c.person, form: c.form });
    return acc;
  }, {});

  const formTypeNames = Object.keys(formTypeGroups);

  const isPartOfDrag = draggingVerbIds.length > 0 && (draggingVerbIds.includes(verb.id) || isSelected);

  const dragProps = {
    draggable: true as const,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      const ids = selectedVerbIds.includes(verb.id) ? selectedVerbIds : [verb.id];
      if (!selectedVerbIds.includes(verb.id)) {
        setSelectedVerbIds([verb.id]);
      }
      setDraggingVerbIds(ids);
      e.dataTransfer.setData('text/plain', JSON.stringify(ids));
    },
    onDragEnd: () => {
      setDraggingVerbIds([]);
    },
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.stopPropagation();
      onToggleSelect?.(true);
    } else if (onRowClick) {
      onRowClick();
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <div
      className={`rounded-lg overflow-hidden
        ${isDisabled ? 'opacity-40' : ''}
        ${isPartOfDrag ? 'opacity-50' : ''}
        ${isSelected
          ? 'ring-2 ring-indigo-400 border border-indigo-400'
          : 'border border-gray-200 dark:border-gray-700'
        }
      `}
    >
      {/* Header */}
      <div
        {...dragProps}
        className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 cursor-grab hover:bg-gray-50 dark:hover:bg-gray-700 group"
        onClick={handleHeaderClick}
      >
        <span className="text-gray-400">
          {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>
        <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-1">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {verb.infinitive_source}
          </span>
          <span className="text-gray-400 dark:text-gray-500">&rarr;</span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {verb.infinitive_target}
          </span>
          {verb.auxiliary && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded ml-1">
              {verb.auxiliary}
            </span>
          )}
          {verb.case_preposition && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
              {verb.case_preposition}
            </span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
            {formTypeNames.length} {formTypeNames.length === 1 ? t.formType : t.formTypes} &middot; {verb.conjugations.length} {t.forms}
          </span>
        </div>
        {showSection && (
          <span className="flex-shrink-0 flex items-center gap-1.5">
            {sectionName && <SectionBadge name={sectionName} />}
            <SectionBadge name={subsectionName} />
          </span>
        )}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="icon"
            hoverColor="indigo"
            onClick={() => toggleVerbDisabled(verb.id)}
            title={isDisabled ? t.enablePair : t.disablePair}
          >
            {isDisabled ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
          <Button variant="icon" hoverColor="indigo" onClick={() => onEdit(verb)} title={t.edit}>
            <PencilIcon />
          </Button>
          <Button variant="icon" hoverColor="red" onClick={() => deleteVerb(verb.id)} title={t.delete}>
            <TrashIcon />
          </Button>
        </div>
      </div>

      {/* Expanded conjugation details */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3">
          {formTypeNames.map((formType) => (
            <div key={formType} className="mb-3 last:mb-0">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1.5">
                {formType}
              </p>
              <div className="overflow-x-auto">
                <div className="flex gap-4 text-sm min-w-0">
                  {formTypeGroups[formType].map((entry, i) => (
                    <div key={i} className="flex flex-col items-start min-w-[70px]">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{entry.person}</span>
                      <span className="text-gray-800 dark:text-gray-200 font-medium">{entry.form}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
