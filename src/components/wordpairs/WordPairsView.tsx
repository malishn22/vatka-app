import { useEffect, useRef, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useToggleSelection } from '../../hooks/useToggleSelection';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { usePlayStore } from '../../store/playStore';
import { useQuizStore } from '../../store/quizStore';
import { useConjugationPlayStore } from '../../store/conjugationPlayStore';
import { useDragContext } from '../../context/DragContext';
import { WordPairRow } from './WordPairRow';
import { AddWordPairForm } from './AddWordPairForm';
import { VerbsView } from '../verbs/VerbsView';
import { Button } from '../shared/Button';
import { Toast } from '../shared/Toast';
import { useT } from '../../i18n/useT';
import { ExportModal } from './ExportModal';
import { ImportModal } from './ImportModal';
import { PlayModeModal } from '../play/PlayModeModal';
import type { GameMode } from '../../store/uiStore';

export function WordPairsView() {
  const { selectedSectionId, selectedSubsectionId, selectedLanguageId, setView, quizOptionCount, quizDirection, contentTab, setContentTab, conjugationMode, conjugationOptionCount } = useUIStore();
  const { sections, languages, subsections, wordPairs, fetchWordPairs, verbs, fetchVerbs } = useDataStore();
  const { initGame } = usePlayStore();
  const { initQuiz } = useQuizStore();
  const { initConjugationPlay } = useConjugationPlayStore();
  const { selectedPairIds, setSelectedPairIds } = useDragContext();
  const t = useT();
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [playModalOpen, setPlayModalOpen] = useState(false);
  const addFormRef = useRef<HTMLDivElement>(null);

  const { toggle: handleTogglePairSelect } = useToggleSelection(selectedPairIds, setSelectedPairIds);
  useClickOutside(addFormRef, () => setAddFormOpen(false));

  const section = sections.find((s) => s.id === selectedSectionId);
  const language = languages.find((l) => l.id === selectedLanguageId);
  const subsection = subsections.find((s) => s.id === selectedSubsectionId);
  const sectionSubsections = subsections.filter((s) => s.section_id === selectedSectionId);
  const languageSections = sections.filter((s) => s.language_id === selectedLanguageId);

  useEffect(() => {
    if (selectedSectionId !== null) {
      fetchWordPairs(selectedSectionId);
      fetchVerbs(selectedSectionId);
    }
  }, [selectedSectionId]);

  const displayedPairs = selectedSubsectionId !== null
    ? wordPairs.filter((p) => p.subsection_id === selectedSubsectionId)
    : wordPairs;

  const activePairs = displayedPairs.filter((p) => !p.disabled);

  const displayedVerbs = selectedSubsectionId !== null
    ? verbs.filter((v) => v.subsection_id === selectedSubsectionId)
    : verbs;
  const activeVerbs = displayedVerbs.filter((v) => !v.disabled);
  const activeConjugations = activeVerbs.flatMap((v) => v.conjugations);

  const canPlay = activePairs.length >= 2 || activeConjugations.length >= 2;

  const handlePlay = () => {
    if (!canPlay) return;
    setPlayModalOpen(true);
  };

  const handleStartGame = (mode: GameMode) => {
    setPlayModalOpen(false);
    if (mode === 'match') {
      initGame(activePairs);
    } else if (mode === 'quiz') {
      initQuiz(activePairs, quizOptionCount, quizDirection);
    } else if (mode === 'conjugation') {
      initConjugationPlay(activeVerbs, conjugationMode, conjugationOptionCount);
    }
    setView('play');
  };

  if (!section) {
    const hasNoSections = language && languageSections.length === 0;
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500 flex flex-col items-center gap-4">
        <p>{t.selectSectionFromSidebar}</p>
        {hasNoSections && (
          <>
            <Button variant="secondary" onClick={() => setImportModalOpen(true)}>
              {t.import}
            </Button>
            <ImportModal
              isOpen={importModalOpen}
              onClose={() => setImportModalOpen(false)}
              sectionId={0}
              language={language}
              subsections={[]}
              sections={languageSections}
              sourceLabel={language.source}
              targetLabel={language.target}
              onImported={() => { setImportModalOpen(false); }}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{language?.name}</p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            {section.name}{subsection ? ` — ${subsection.name}` : ''}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePlay}
            disabled={!canPlay}
            title={!canPlay ? t.needAtLeastTwoWordPairs : ''}
          >
            {t.play}
          </Button>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-4">
        <button
          onClick={() => setContentTab('wordpairs')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            contentTab === 'wordpairs'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-50 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {t.wordPairsTab} ({displayedPairs.length})
        </button>
        <button
          onClick={() => setContentTab('verbs')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            contentTab === 'verbs'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-50 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {t.verbsTab} ({displayedVerbs.length})
        </button>
      </div>

      {contentTab === 'wordpairs' ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {displayedPairs.length} {displayedPairs.length !== 1 ? t.wordPairs : t.wordPair}
              </p>
              {selectedPairIds.length >= 2 && (
                <button
                  onClick={() => setSelectedPairIds([])}
                  className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                >
                  {selectedPairIds.length} selected ×
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
              {addFormOpen && (
                <div className="absolute right-0 mt-1 w-[480px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                  <AddWordPairForm
                    sectionId={section.id}
                    subsectionId={selectedSubsectionId}
                    sourceLabel={language?.source ?? t.source}
                    targetLabel={language?.target ?? t.target}
                  />
                  <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex gap-2">
                    <Button variant="secondary" onClick={() => setImportModalOpen(true)}>
                      {t.importExcel}
                    </Button>
                    <Button variant="secondary" onClick={() => { setExportFormat('xlsx'); setAddFormOpen(false); }} disabled={wordPairs.length === 0}>
                      {t.exportExcel}
                    </Button>
                    <Button variant="secondary" onClick={() => { setExportFormat('csv'); setAddFormOpen(false); }} disabled={wordPairs.length === 0}>
                      {t.exportCsv}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {displayedPairs.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p>{t.noWordPairsYet}</p>
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {language?.source ?? t.source}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {language?.target ?? t.target}
                    </th>
                    {selectedSubsectionId === null && (
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {t.subsection}
                      </th>
                    )}
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {displayedPairs.map((pair) => (
                    <WordPairRow
                      key={pair.id}
                      pair={pair}
                      showSection={selectedSubsectionId === null}
                      subsections={subsections}
                      isSelected={selectedPairIds.includes(pair.id)}
                      onToggleSelect={(additive) => handleTogglePairSelect(pair.id, additive)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <VerbsView />
      )}

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}

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
          onImported={(count, skipped) => setToastMsg(t.importResult(count, skipped))}
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

      <PlayModeModal
        isOpen={playModalOpen}
        onClose={() => setPlayModalOpen(false)}
        onStart={handleStartGame}
        maxOptions={activePairs.length}
        maxConjugations={activeConjugations.length}
        sourceLang={language?.source ?? ''}
        targetLang={language?.target ?? ''}
      />
    </div>
  );
}
