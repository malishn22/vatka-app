import { useEffect, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { usePlayStore } from '../../store/playStore';
import { WordPairRow } from './WordPairRow';
import { AddWordPairForm } from './AddWordPairForm';
import { Button } from '../shared/Button';
import { Toast } from '../shared/Toast';
import { useT } from '../../i18n/useT';
import { ExportModal } from './ExportModal';

export function WordPairsView() {
  const { selectedLevelId, selectedSectionId, selectedLanguageId, setView } = useUIStore();
  const { levels, languages, sections, wordPairs, fetchWordPairs } = useDataStore();
  const { initGame } = usePlayStore();
  const t = useT();
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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
    initGame(activePairs);
    setView('play');
  };

  if (!level) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">
        <p>{t.selectLevelFromSidebar}</p>
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

          <div className="relative">
            <Button
              variant="secondary"
              onClick={() => setExportOpen((o) => !o)}
              disabled={wordPairs.length === 0}
            >
              {t.export}
            </Button>
            {exportOpen && (
              <div
                className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10"
                onMouseLeave={() => setExportOpen(false)}
              >
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => { setExportFormat('xlsx'); setExportOpen(false); }}
                >
                  {t.exportExcel}
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => { setExportFormat('csv'); setExportOpen(false); }}
                >
                  {t.exportCsv}
                </button>
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

      <AddWordPairForm
        levelId={level.id}
        sectionId={selectedSectionId}
        sourceLabel={language?.source ?? t.source}
        targetLabel={language?.target ?? t.target}
      />
      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}

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
          unsectionedLabel={t.unsectioned}
          onSuccess={() => setToastMsg(t.exportedSuccessfully)}
        />
      )}
    </div>
  );
}
