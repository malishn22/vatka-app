import { useState } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useDragContext } from '../../context/DragContext';
import { useDragSource } from '../../hooks/useDragSource';
import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';
import { PencilIcon, TrashIcon, EyeIcon, EyeOffIcon, ChevronDownIcon, ChevronRightIcon } from '../shared/Icons';
import type { VerbWithConjugations } from '../../types';

interface VerbRowProps {
  verb: VerbWithConjugations;
  onEdit: (verb: VerbWithConjugations) => void;
  showSection?: boolean;
  sectionName?: string;
}

export function VerbRow({ verb, onEdit, showSection, sectionName }: VerbRowProps) {
  const { deleteVerb, toggleVerbDisabled } = useDataStore();
  const { draggingVerbId, setDraggingVerbId } = useDragContext();
  const { dragProps, dragSourceClass } = useDragSource({ id: verb.id, setDraggingId: setDraggingVerbId, isDragging: draggingVerbId === verb.id });
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  const isDisabled = Boolean(verb.disabled);

  // Group conjugations by tense
  const tenseGroups = verb.conjugations.reduce<Record<string, { person: string; form: string }[]>>((acc, c) => {
    if (!acc[c.tense]) acc[c.tense] = [];
    acc[c.tense].push({ person: c.person, form: c.form });
    return acc;
  }, {});

  const tenseNames = Object.keys(tenseGroups);

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${isDisabled ? 'opacity-40' : ''} ${dragSourceClass}`}>
      {/* Header */}
      <div
        {...dragProps}
        className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 cursor-grab hover:bg-gray-50 dark:hover:bg-gray-700 group"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-400">
          {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {verb.infinitive_source}
          </span>
          <span className="text-gray-400 dark:text-gray-500 mx-2">&rarr;</span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {verb.infinitive_target}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-3">
            {tenseNames.length} {tenseNames.length === 1 ? t.tense : t.tenses} &middot; {verb.conjugations.length} {t.forms}
          </span>
          {showSection && (
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
              &middot; {sectionName ?? '—'}
            </span>
          )}
        </div>
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
          {tenseNames.map((tense) => (
            <div key={tense} className="mb-3 last:mb-0">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1.5">
                {tense}
              </p>
              <div className="overflow-x-auto">
                <div className="flex gap-4 text-sm min-w-0">
                  {tenseGroups[tense].map((entry, i) => (
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
