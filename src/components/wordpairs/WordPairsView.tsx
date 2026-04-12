import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { usePlayStore } from '../../store/playStore';
import { useQuizStore } from '../../store/quizStore';
import { WordPairRow } from './WordPairRow';
import { AddWordPairForm } from './AddWordPairForm';
import { Button } from '../shared/Button';
import { Toast } from '../shared/Toast';
import { useT } from '../../i18n/useT';
import { ExportModal } from './ExportModal';
import { ImportModal } from './ImportModal';
import { PlayModeModal } from '../play/PlayModeModal';
import type { GameMode } from '../../store/uiStore';

export function WordPairsView() {
  const { selectedLevelId, selectedSectionId, selectedLanguageId, setView, quizOptionCount, quizDirection } = useUIStore();
  const { levels, languages, sections, wordPairs, fetchWordPairs } = useDataStore();
  const { initGame } = usePlayStore();
  const { initQuiz } = useQuizStore();
  const t = useT();
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [playModalOpen, setPlayModalOpen] = useState(false);
  const addFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (addFormRef.current && !addFormRef.current.contains(e.target as Node)) {
        setAddFormOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const level = levels.find((l) => l.id === selectedLevelId);
  const language = languages.find((l) => l.id === selectedLanguageId);
  const section = sections.find((s) => s.id === selectedSectionId);
  const levelSections = sections.filter((s) => s.level_id === selectedLevelId);
  const languageLevels = levels.filter((l) => l.language_id === selectedLanguageId);

  useEffect(() => {
    if (selectedLevelId !== null) {
      fetchWordPairs(selectedLevelId);
    }
  }, [selectedLevelId]);

  const displayedPairs = selectedSectionId !== null
    ? wordPairs.filter((p) => p.section_id === selectedSectionId)
    : wordPairs;

  const activePairs = displayedPairs.filter((p) => !p.disabled);

  const handlePlay = () => {
    if (activePairs.length < 2) return;
    setPlayModalOpen(true);
  };

  const handleStartGame = (mode: GameMode) => {
    setPlayModalOpen(false);
    if (mode === 'match') {
      initGame(activePairs);
    } else {
      initQuiz(activePairs, quizOptionCount, quizDirection);
    }
    setView('play');
  };

  if (!level) {
    const hasNoLevels = language && languageLevels.length === 0;
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500 flex flex-col items-center gap-4">
        <p>{t.selectLevelFromSidebar}</p>
        {hasNoLevels && (
          <>
            <Button variant="secondary" onClick={() => setImportModalOpen(true)}>
              {t.import}
            </Button>
            <ImportModal
              isOpen={importModalOpen}
              onClose={() => setImportModalOpen(false)}
              levelId={0}
              language={language}
              sections={[]}
              levels={languageLevels}
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{language?.name}</p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            {level.name}{section ? ` — ${section.name}` : ''}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {displayedPairs.length} {displayedPairs.length !== 1 ? t.wordPairs : t.wordPair}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePlay}
            disabled={activePairs.length < 2}
            title={activePairs.length < 2 ? t.needAtLeastTwoWordPairs : ''}
          >
            {t.play}
          </Button>

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
                  levelId={level.id}
                  sectionId={selectedSectionId}
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
                {selectedSectionId === null && (
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {t.section}
                  </th>
                )}
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {displayedPairs.map((pair) => (
                <WordPairRow key={pair.id} pair={pair} showSection={selectedSectionId === null} sections={sections} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}

      {language && (
        <ImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          levelId={level.id}
          language={language}
          sections={levelSections}
          levels={languageLevels}
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
          levels={languageLevels}
          currentLevelId={level.id}
          sections={levelSections}
          wordPairs={wordPairs}
          onSuccess={() => setToastMsg(t.exportedSuccessfully)}
        />
      )}

      <PlayModeModal
        isOpen={playModalOpen}
        onClose={() => setPlayModalOpen(false)}
        onStart={handleStartGame}
        maxOptions={activePairs.length}
        sourceLang={language?.source ?? ''}
        targetLang={language?.target ?? ''}
      />
    </div>
  );
}
