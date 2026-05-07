import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { VerbRow } from './VerbRow';
import { AddVerbForm } from './AddVerbForm';
import { EditVerbModal } from './EditVerbModal';
import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';
import type { VerbWithConjugations } from '../../types';

export function VerbsView() {
  const { selectedLevelId, selectedSectionId, selectedLanguageId } = useUIStore();
  const { levels, languages, verbs, fetchVerbs } = useDataStore();
  const t = useT();
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [editingVerb, setEditingVerb] = useState<VerbWithConjugations | null>(null);
  const addFormRef = useRef<HTMLDivElement>(null);

  const level = levels.find((l) => l.id === selectedLevelId);
  const language = languages.find((l) => l.id === selectedLanguageId);

  useEffect(() => {
    if (selectedLevelId !== null) {
      fetchVerbs(selectedLevelId);
    }
  }, [selectedLevelId]);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      setTimeout(() => {
        const target = e.target as Node;
        if (!document.contains(target)) return;
        if (addFormRef.current && !addFormRef.current.contains(target)) {
          setAddFormOpen(false);
        }
      }, 0);
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const displayedVerbs = selectedSectionId !== null
    ? verbs.filter((v) => v.section_id === selectedSectionId)
    : verbs;

  if (!level) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {displayedVerbs.length} {displayedVerbs.length !== 1 ? t.verbs : t.verb}
        </p>
        <div className="relative" ref={addFormRef}>
          <Button
            variant="secondary"
            onClick={() => setAddFormOpen((o) => !o)}
            className="!rounded-full w-9 h-9 !px-0 !py-0 flex items-center justify-center"
          >
            +
          </Button>
          {addFormOpen && language && (
            <div className="absolute right-0 mt-1 w-[640px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
              <AddVerbForm
                levelId={level.id}
                sectionId={selectedSectionId}
                languageId={language.id}
                sourceLabel={language.source}
                targetLabel={language.target}
                onAdded={() => setAddFormOpen(false)}
              />
            </div>
          )}
        </div>
      </div>

      {displayedVerbs.length === 0 && !addFormOpen ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
          <p>{t.noVerbsYet}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {displayedVerbs.map((verb) => (
            <VerbRow key={verb.id} verb={verb} onEdit={setEditingVerb} />
          ))}
        </div>
      )}

      {editingVerb && language && (
        <EditVerbModal
          verb={editingVerb}
          languageId={language.id}
          sourceLabel={language.source}
          targetLabel={language.target}
          onClose={() => setEditingVerb(null)}
        />
      )}
    </div>
  );
}
