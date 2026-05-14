import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { useDragContext } from '../../context/DragContext';
import { VerbRow } from './VerbRow';
import { AddVerbForm } from './AddVerbForm';
import { EditVerbModal } from './EditVerbModal';
import { VerbExportModal } from './VerbExportModal';
import { VerbImportModal } from './VerbImportModal';
import { Button } from '../shared/Button';
import { Toast } from '../shared/Toast';
import { useT } from '../../i18n/useT';
import type { VerbWithConjugations } from '../../types';

export function VerbsView() {
  const { selectedLevelId, selectedSectionId, selectedLanguageId } = useUIStore();
  const { levels, languages, verbs, sections, fetchVerbs } = useDataStore();
  const { selectedVerbIds, setSelectedVerbIds } = useDragContext();
  const t = useT();
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [editingVerb, setEditingVerb] = useState<VerbWithConjugations | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const addFormRef = useRef<HTMLDivElement>(null);

  const handleToggleVerbSelect = (id: number, additive: boolean) => {
    if (additive) {
      setSelectedVerbIds(
        selectedVerbIds.includes(id)
          ? selectedVerbIds.filter((x) => x !== id)
          : [...selectedVerbIds, id]
      );
    } else {
      setSelectedVerbIds(selectedVerbIds.length === 1 && selectedVerbIds[0] === id ? [] : [id]);
    }
  };

  const level = levels.find((l) => l.id === selectedLevelId);
  const language = languages.find((l) => l.id === selectedLanguageId);
  const levelSections = sections.filter((s) => s.level_id === selectedLevelId);
  const languageLevels = levels.filter((l) => l.language_id === selectedLanguageId);

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
  const showSection = selectedSectionId === null;

  if (!level) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {displayedVerbs.length} {displayedVerbs.length !== 1 ? t.verbs : t.verb}
          </p>
          {selectedVerbIds.length >= 2 && (
            <button
              onClick={() => setSelectedVerbIds([])}
              className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
            >
              {selectedVerbIds.length} selected ×
            </button>
          )}
        </div>
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
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex gap-2">
                <Button variant="secondary" onClick={() => { setImportModalOpen(true); setAddFormOpen(false); }}>
                  {t.importVerbs}
                </Button>
                <Button variant="secondary" onClick={() => { setExportFormat('xlsx'); setAddFormOpen(false); }} disabled={verbs.length === 0}>
                  {t.exportExcel}
                </Button>
                <Button variant="secondary" onClick={() => { setExportFormat('csv'); setAddFormOpen(false); }} disabled={verbs.length === 0}>
                  {t.exportCsv}
                </Button>
              </div>
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
            <VerbRow
              key={verb.id}
              verb={verb}
              onEdit={setEditingVerb}
              showSection={showSection}
              sectionName={sections.find((s) => s.id === verb.section_id)?.name}
              isSelected={selectedVerbIds.includes(verb.id)}
              onToggleSelect={(additive) => handleToggleVerbSelect(verb.id, additive)}
            />
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

      {language && (
        <VerbImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          levelId={level.id}
          language={language}
          sections={levelSections}
          levels={languageLevels}
          sourceLabel={language.source}
          targetLabel={language.target}
          onImported={(count, skipped) => {
            setImportModalOpen(false);
            setToastMsg(t.verbsImportResult(count, skipped));
          }}
        />
      )}

      {exportFormat !== null && language && (
        <VerbExportModal
          isOpen={exportFormat !== null}
          onClose={() => setExportFormat(null)}
          format={exportFormat}
          language={language}
          levels={languageLevels}
          currentLevelId={level.id}
          sections={levelSections}
          verbs={verbs}
          onSuccess={() => setToastMsg(t.exportedSuccessfully)}
        />
      )}

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </div>
  );
}
