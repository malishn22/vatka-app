import { useEffect, useMemo, useRef, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useToggleSelection } from '../../hooks/useToggleSelection';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { useDragContext } from '../../context/DragContext';
import { VerbRow } from './VerbRow';
import { AddVerbForm } from './AddVerbForm';
import { EditVerbModal } from './EditVerbModal';
import { ExportModal } from '../wordpairs/ExportModal';
import { ImportModal } from '../wordpairs/ImportModal';
import { Button } from '../shared/Button';
import { Toast } from '../shared/Toast';
import { SearchBar } from '../shared/SearchBar';
import { useT } from '../../i18n/useT';
import type { VerbWithConjugations } from '../../types';

export function VerbsView() {
  const { selectedSectionId, selectedSubsectionId, selectedLanguageId, setSelectedSection, setSelectedSubsection } = useUIStore();
  const { sections, languages, verbs, subsections, wordPairs, fetchVerbs, allLanguageVerbs, allLanguageVerbsLoadedFor, fetchVerbsForLanguage } = useDataStore();
  const { selectedVerbIds, setSelectedVerbIds } = useDragContext();
  const t = useT();
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [editingVerb, setEditingVerb] = useState<VerbWithConjugations | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchGlobal, setSearchGlobal] = useState(false);
  const addFormRef = useRef<HTMLDivElement>(null);

  const { toggle: handleToggleVerbSelect } = useToggleSelection(selectedVerbIds, setSelectedVerbIds);
  useClickOutside(addFormRef, () => setAddFormOpen(false));

  const section = sections.find((s) => s.id === selectedSectionId);
  const language = languages.find((l) => l.id === selectedLanguageId);
  const sectionSubsections = subsections.filter((s) => s.section_id === selectedSectionId);
  const languageSections = sections.filter((s) => s.language_id === selectedLanguageId);

  useEffect(() => {
    if (selectedSectionId !== null) {
      fetchVerbs(selectedSectionId);
    }
  }, [selectedSectionId]);

  useEffect(() => {
    setSearch('');
    setSearchGlobal(false);
  }, [selectedSectionId, selectedSubsectionId, selectedLanguageId]);

  useEffect(() => {
    if (searchGlobal && selectedLanguageId !== null && allLanguageVerbsLoadedFor !== selectedLanguageId) {
      fetchVerbsForLanguage(selectedLanguageId);
    }
  }, [searchGlobal, selectedLanguageId, allLanguageVerbsLoadedFor]);

  const query = search.trim().toLowerCase();
  const sectionScopedVerbs = selectedSubsectionId !== null
    ? verbs.filter((v) => v.subsection_id === selectedSubsectionId)
    : verbs;
  const displayedVerbs = useMemo(() => {
    if (!query) return sectionScopedVerbs;
    const source = searchGlobal ? allLanguageVerbs : sectionScopedVerbs;
    return source.filter(
      (v) =>
        v.infinitive_source.toLowerCase().includes(query) ||
        v.infinitive_target.toLowerCase().includes(query)
    );
  }, [query, searchGlobal, allLanguageVerbs, sectionScopedVerbs]);
  const showGlobalColumns = query.length > 0 && searchGlobal;
  const showSection = selectedSubsectionId === null || showGlobalColumns;

  if (!section) return null;

  return (
    <div>
      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          isGlobal={searchGlobal}
          onGlobalChange={setSearchGlobal}
        />
      </div>

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
                sectionId={section.id}
                subsectionId={selectedSubsectionId}
                languageId={language.id}
                sourceLabel={language.source}
                targetLabel={language.target}
                onAdded={() => setAddFormOpen(false)}
              />
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex gap-2">
                <Button variant="secondary" onClick={() => { setImportModalOpen(true); setAddFormOpen(false); }}>
                  {t.importExcel}
                </Button>
                <Button variant="secondary" onClick={() => { setExportFormat('xlsx'); setAddFormOpen(false); }}>
                  {t.exportExcel}
                </Button>
                <Button variant="secondary" onClick={() => { setExportFormat('csv'); setAddFormOpen(false); }}>
                  {t.exportCsv}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {displayedVerbs.length === 0 && !addFormOpen ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
          <p>{query ? t.searchNoResults : t.noVerbsYet}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {displayedVerbs.map((verb) => {
            const isExternal = showGlobalColumns && verb.section_id !== selectedSectionId;
            return (
              <VerbRow
                key={verb.id}
                verb={verb}
                onEdit={setEditingVerb}
                showSection={showSection}
                sectionName={showGlobalColumns ? sections.find((s) => s.id === verb.section_id)?.name : undefined}
                subsectionName={subsections.find((s) => s.id === verb.subsection_id)?.name}
                isSelected={selectedVerbIds.includes(verb.id)}
                onToggleSelect={(additive) => handleToggleVerbSelect(verb.id, additive)}
                onRowClick={isExternal ? () => {
                  setSelectedSection(verb.section_id);
                  setSelectedSubsection(verb.subsection_id);
                  setSearch('');
                  setSearchGlobal(false);
                } : undefined}
              />
            );
          })}
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
        <ImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          sectionId={section.id}
          language={language}
          subsections={sectionSubsections}
          sections={languageSections}
          sourceLabel={language.source}
          targetLabel={language.target}
          onImported={(count, skipped) => {
            setImportModalOpen(false);
            setToastMsg(t.importResult(count, skipped));
          }}
        />
      )}

      {exportFormat !== null && language && (
        <ExportModal
          isOpen={exportFormat !== null}
          onClose={() => setExportFormat(null)}
          format={exportFormat}
          language={language}
          sections={languageSections}
          currentSectionId={section.id}
          subsections={sectionSubsections}
          wordPairs={wordPairs}
          onSuccess={() => setToastMsg(t.exportedSuccessfully)}
        />
      )}

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </div>
  );
}
