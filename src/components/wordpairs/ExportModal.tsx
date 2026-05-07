import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import type { WordPair, Section, Level, Language } from '../../types';
import { useExcelExport, fetchWordPairsRaw, fetchSectionsRaw, type ExportPayload } from '../../hooks/useExcelExport';
import { useT } from '../../i18n/useT';

type ExportFormat = 'xlsx' | 'csv';
type ExportStep = 'select-levels' | 'select-pairs';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  format: ExportFormat;
  language: Language;
  levels: Level[];
  currentLevelId: number;
  sections: Section[];
  wordPairs: WordPair[];
  onSuccess: () => void;
}

export function ExportModal({
  isOpen,
  onClose,
  format,
  language,
  levels,
  currentLevelId,
  sections,
  wordPairs,
  onSuccess,
}: ExportModalProps) {
  const t = useT();
  const currentLevel = levels.find(l => l.id === currentLevelId);

  // Step 1 state
  const [step, setStep] = useState<ExportStep>('select-levels');
  const [selectedLevelIds, setSelectedLevelIds] = useState<Set<number>>(new Set());

  // Step 2 state
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [allPairs, setAllPairs] = useState<WordPair[]>([]);
  const [allSubsections, setAllSubsections] = useState<Section[]>([]);
  const [levelMap, setLevelMap] = useState<Map<number, string>>(new Map());

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select-levels');
      setSelectedLevelIds(new Set(levels.map(l => l.id)));
      setSearch('');
      setSelectedIds(new Set());
      setExportError(null);
      setAllPairs([]);
      setAllSubsections([]);
    }
  }, [isOpen, levels]);

  const toggleLevel = (id: number) => {
    setSelectedLevelIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNext = async () => {
    setIsLoading(true);
    try {
      const combinedPairs: WordPair[] = [];
      const combinedSubsections: Section[] = [];
      const seenSubsectionIds = new Set<number>();
      const newLevelMap = new Map<number, string>();

      for (const lv of levels) {
        if (!selectedLevelIds.has(lv.id)) continue;
        newLevelMap.set(lv.id, lv.name);

        const pairs = lv.id === currentLevelId ? wordPairs : await fetchWordPairsRaw(lv.id);
        combinedPairs.push(...pairs);

        const subs = lv.id === currentLevelId ? sections : await fetchSectionsRaw(lv.id);
        for (const sub of subs) {
          if (!seenSubsectionIds.has(sub.id)) {
            combinedSubsections.push(sub);
            seenSubsectionIds.add(sub.id);
          }
        }
      }

      setAllPairs(combinedPairs);
      setAllSubsections(combinedSubsections);
      setLevelMap(newLevelMap);
      setSelectedIds(new Set(combinedPairs.map(p => p.id)));
      setStep('select-pairs');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 derived
  const subsectionMap = useMemo(
    () => new Map<number, string>(allSubsections.map(s => [s.id, s.name])),
    [allSubsections]
  );

  const filteredPairs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPairs;
    return allPairs.filter(
      p => p.source.toLowerCase().includes(q) || p.target.toLowerCase().includes(q)
    );
  }, [allPairs, search]);

  const togglePair = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected = filteredPairs.length > 0 && filteredPairs.every(p => selectedIds.has(p.id));

  const selectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredPairs.forEach(p => next.add(p.id));
      return next;
    });
  };

  const deselectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredPairs.forEach(p => next.delete(p.id));
      return next;
    });
  };

  const { exportXlsx, exportCsv } = useExcelExport({
    wordPairs,
    sections,
    level: currentLevel ?? levels[0],
    language,
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const selectedPairs = allPairs.filter(p => selectedIds.has(p.id));
      const referencedSubsectionIds = new Set(
        selectedPairs.map(p => p.section_id).filter((id): id is number => id !== null)
      );
      const referencedLevelIds = new Set(selectedPairs.map(p => p.level_id));
      const filteredSubsections = allSubsections.filter(s => referencedSubsectionIds.has(s.id));
      const filteredLevels = levels.filter(l => referencedLevelIds.has(l.id));
      const payload: ExportPayload = {
        wordPairs: selectedPairs,
        sections: filteredSubsections,
        levels: filteredLevels,
        fileLabel: filteredLevels.length === 1 ? (filteredLevels[0].name) : language.name,
      };
      if (format === 'xlsx') await exportXlsx(payload);
      else await exportCsv(payload);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExporting(false);
    }
  };

  // --- Step 1: Select Sections (levels) ---
  if (step === 'select-levels') {
    const footer = (
      <>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>{t.cancel}</Button>
        <Button variant="primary" onClick={handleNext} disabled={isLoading || selectedLevelIds.size === 0}>
          {isLoading ? '...' : 'Next →'}
        </Button>
      </>
    );

    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t.exportModalTitle} footer={footer}>
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.exportScope}</p>
          <div className="flex flex-col gap-1.5">
            {levels.map(lv => (
              <label key={lv.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLevelIds.has(lv.id)}
                  onChange={() => toggleLevel(lv.id)}
                  className="accent-indigo-500"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  {lv.name}
                  {lv.id === currentLevelId && (
                    <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">(current)</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      </Modal>
    );
  }

  // --- Step 2: Select Pairs ---
  const footer = (
    <>
      <Button variant="secondary" onClick={() => setStep('select-levels')} disabled={isExporting}>
        ← Back
      </Button>
      <Button variant="primary" onClick={handleExport} disabled={isExporting || selectedIds.size === 0}>
        {isExporting ? '...' : (format === 'xlsx' ? t.exportExcel : t.exportCsv)}
      </Button>
    </>
  );

  const showSectionCol = selectedLevelIds.size > 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.exportModalTitle} footer={footer} size="lg">
      <div className="flex flex-col gap-3">
        {exportError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Export failed: {exportError}
          </p>
        )}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t.exportSearchPlaceholder}
          className="w-full text-sm px-3 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />

        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={selectAllFiltered}
              disabled={allFilteredSelected}
              className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-40 disabled:cursor-default"
            >
              {t.exportSelectAll}
            </button>
            <button
              onClick={deselectAllFiltered}
              disabled={filteredPairs.every(p => !selectedIds.has(p.id))}
              className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-40 disabled:cursor-default"
            >
              {t.exportDeselectAll}
            </button>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t.exportSelectedCount(selectedIds.size, allPairs.length)}
          </span>
        </div>

        <div className="overflow-y-auto max-h-72 rounded border border-gray-200 dark:border-gray-700">
          {filteredPairs.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">—</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <tbody>
                {filteredPairs.map(pair => {
                  const subsecName = pair.section_id != null ? subsectionMap.get(pair.section_id) : undefined;
                  const secName = levelMap.get(pair.level_id);
                  return (
                    <tr
                      key={pair.id}
                      className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => togglePair(pair.id)}
                    >
                      <td className="px-3 py-2 w-6">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(pair.id)}
                          onChange={() => togglePair(pair.id)}
                          onClick={e => e.stopPropagation()}
                          className="accent-indigo-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{pair.source}</td>
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{pair.target}</td>
                      {showSectionCol && (
                        <td className="px-3 py-2 text-gray-400 dark:text-gray-500 text-xs">{secName ?? ''}</td>
                      )}
                      <td className="px-3 py-2 text-gray-400 dark:text-gray-500 text-xs">{subsecName ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
}
