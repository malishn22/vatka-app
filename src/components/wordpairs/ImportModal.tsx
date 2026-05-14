import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import type { Section, Language, Level } from '../../types';
import { useExcelImport, type ParsedSpreadsheetResult } from '../../hooks/useExcelImport';
import { useDataStore } from '../../store/dataStore';
import { useT } from '../../i18n/useT';

interface ImportRow {
  id: string;
  source: string;
  target: string;
  sectionName: string;     // level name — editable
  subsectionName: string;  // subsection name — editable
  isDuplicate: boolean;
  disabled: boolean;
}

interface ImportVerbRow {
  id: string;
  infinitive_source: string;
  infinitive_target: string;
  conjugations: { form_type: string; person: string; form: string }[];
  conjugationCount: number;
  sectionName: string;
  subsectionName: string;
  isDuplicate: boolean;
  disabled: boolean;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelId: number;
  language: Language;
  sections: Section[];     // subsections of the current level
  levels: Level[];         // all levels in this language
  sourceLabel: string;
  targetLabel: string;
  onImported: (count: number, skipped: number) => void;
}

export function ImportModal({
  isOpen,
  onClose,
  levelId,
  language,
  sections,
  levels,
  sourceLabel,
  targetLabel,
  onImported,
}: ImportModalProps) {
  const t = useT();
  const { addWordPair, addVerb, addSection, addLevel, wordPairExistsInLanguage, verbExistsInLanguage, fetchWordPairs, fetchVerbs } = useDataStore();

  const [step, setStep] = useState<'select-file' | 'preview'>('select-file');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [verbRows, setVerbRows] = useState<ImportVerbRow[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('select-file');
      setRows([]);
      setVerbRows([]);
      setIsChecking(false);
      setIsImporting(false);
      setImportError(null);
    }
  }, [isOpen]);

  const handleParsed = useCallback(async (result: ParsedSpreadsheetResult) => {
    const parsed = result.pairs;
    const parsedVerbs = result.verbs;
    setIsChecking(true);
    setImportError(null);
    try {
      const built: ImportRow[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const { source, target, section, subsection } = parsed[i];
        const isDuplicate = await wordPairExistsInLanguage(language.id, source, target);
        built.push({
          id: `p-${i}`,
          source,
          target,
          sectionName: section ?? '',
          subsectionName: subsection ?? '',
          isDuplicate,
          disabled: parsed[i].disabled ?? false,
        });
      }
      setRows(built);

      const builtVerbs: ImportVerbRow[] = [];
      for (let i = 0; i < parsedVerbs.length; i++) {
        const v = parsedVerbs[i];
        const isDuplicate = await verbExistsInLanguage(language.id, v.infinitive_source, v.infinitive_target);
        builtVerbs.push({
          id: `v-${i}`,
          infinitive_source: v.infinitive_source,
          infinitive_target: v.infinitive_target,
          conjugations: v.conjugations,
          conjugationCount: v.conjugations.length,
          sectionName: v.section ?? '',
          subsectionName: v.subsection ?? '',
          isDuplicate,
          disabled: v.disabled ?? false,
        });
      }
      setVerbRows(builtVerbs);

      setStep('preview');
    } finally {
      setIsChecking(false);
    }
  }, [language.id, wordPairExistsInLanguage, verbExistsInLanguage]);

  const { triggerImport, fileInputProps } = useExcelImport(
    handleParsed,
    { source: sourceLabel, target: targetLabel },
    (message) => setImportError(message),
  );

  const updateRowSection = (id: string, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, sectionName: value } : r));
  };

  const updateRowSubsection = (id: string, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, subsectionName: value } : r));
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportError(null);
    let imported = 0;
    let skipped = 0;

    try {
      // Per-level subsection caches: levelId → Map<subsectionNameLower, subsectionId>
      const subsectionCaches = new Map<number, Map<string, number>>();

      // Pre-populate current level's subsections (only if a real level is selected)
      if (levelId > 0) {
        subsectionCaches.set(
          levelId,
          new Map(sections.map(s => [s.name.toLowerCase(), s.id]))
        );
      }

      // Cache for auto-created levels: levelNameLower → levelId
      const levelCache = new Map<string, number>(
        levels.map(l => [l.name.toLowerCase(), l.id])
      );
      let defaultLevelId: number | null = null;

      const writtenLevelIds = new Set<number>();

      const nextLevelPos = () => {
        const lvls = useDataStore.getState().levels.filter(l => l.language_id === language.id);
        return lvls.length ? Math.max(...lvls.map(l => l.position)) + 1 : 0;
      };
      const nextSectionPos = (lvlId: number) => {
        const secs = useDataStore.getState().sections.filter(s => s.level_id === lvlId);
        return secs.length ? Math.max(...secs.map(s => s.position)) + 1 : 0;
      };

      for (const row of rows) {
        if (row.isDuplicate) { skipped++; continue; }

        // Resolve target level from section name
        let targetLevelId = levelId;
        if (row.sectionName.trim()) {
          const key = row.sectionName.trim().toLowerCase();
          if (levelCache.has(key)) {
            targetLevelId = levelCache.get(key)!;
          } else {
            // Auto-create the level
            await addLevel({ language_id: language.id, section_id: null, name: row.sectionName.trim(), position: nextLevelPos() });
            const newLevel = useDataStore.getState().levels.find(
              l => l.language_id === language.id && l.name.toLowerCase() === key
            );
            if (newLevel) {
              levelCache.set(key, newLevel.id);
              targetLevelId = newLevel.id;
            }
          }
        } else if (levelId === 0) {
          // No section name and no selected level — create a default level once
          if (defaultLevelId === null) {
            const defaultName = language.name;
            const existingDefault = useDataStore.getState().levels.find(
              l => l.language_id === language.id && l.name.toLowerCase() === defaultName.toLowerCase()
            );
            if (existingDefault) {
              defaultLevelId = existingDefault.id;
            } else {
              await addLevel({ language_id: language.id, section_id: null, name: defaultName, position: nextLevelPos() });
              const created = useDataStore.getState().levels.find(
                l => l.language_id === language.id && l.name.toLowerCase() === defaultName.toLowerCase()
              );
              defaultLevelId = created?.id ?? 0;
            }
          }
          targetLevelId = defaultLevelId!;
        }

        // Ensure subsection cache exists for target level
        if (!subsectionCaches.has(targetLevelId)) {
          subsectionCaches.set(targetLevelId, new Map());
        }
        const subsectionCache = subsectionCaches.get(targetLevelId)!;

        // Resolve subsection
        let resolvedSubsectionId: number | null = null;
        if (row.subsectionName.trim()) {
          const key = row.subsectionName.trim().toLowerCase();
          if (subsectionCache.has(key)) {
            resolvedSubsectionId = subsectionCache.get(key)!;
          } else {
            await addSection({ level_id: targetLevelId, name: row.subsectionName.trim(), position: nextSectionPos(targetLevelId) });
            const newSection = useDataStore.getState().sections.find(
              s => s.level_id === targetLevelId && s.name.toLowerCase() === key
            );
            if (newSection) {
              subsectionCache.set(key, newSection.id);
              resolvedSubsectionId = newSection.id;
            }
          }
        }

        await addWordPair({ level_id: targetLevelId, section_id: resolvedSubsectionId, source: row.source, target: row.target, disabled: row.disabled });
        writtenLevelIds.add(targetLevelId);
        imported++;
      }

      // Import verbs
      let verbsImported = 0;
      let verbsSkipped = 0;
      for (const vRow of verbRows) {
        if (vRow.isDuplicate) { verbsSkipped++; continue; }

        // Resolve level for verb (same logic as word pairs)
        let targetVerbLevelId = levelId;
        if (vRow.sectionName.trim()) {
          const key = vRow.sectionName.trim().toLowerCase();
          if (levelCache.has(key)) {
            targetVerbLevelId = levelCache.get(key)!;
          } else {
            await addLevel({ language_id: language.id, section_id: null, name: vRow.sectionName.trim(), position: nextLevelPos() });
            const newLevel = useDataStore.getState().levels.find(
              l => l.language_id === language.id && l.name.toLowerCase() === key
            );
            if (newLevel) {
              levelCache.set(key, newLevel.id);
              targetVerbLevelId = newLevel.id;
            }
          }
        } else if (levelId === 0) {
          if (defaultLevelId === null) {
            const defaultName = language.name;
            const existingDefault = useDataStore.getState().levels.find(
              l => l.language_id === language.id && l.name.toLowerCase() === defaultName.toLowerCase()
            );
            if (existingDefault) {
              defaultLevelId = existingDefault.id;
            } else {
              await addLevel({ language_id: language.id, section_id: null, name: defaultName, position: nextLevelPos() });
              const created = useDataStore.getState().levels.find(
                l => l.language_id === language.id && l.name.toLowerCase() === defaultName.toLowerCase()
              );
              defaultLevelId = created?.id ?? 0;
            }
          }
          targetVerbLevelId = defaultLevelId!;
        }

        // Resolve subsection for verb
        if (!subsectionCaches.has(targetVerbLevelId)) {
          subsectionCaches.set(targetVerbLevelId, new Map());
        }
        const verbSubCache = subsectionCaches.get(targetVerbLevelId)!;
        let verbSubId: number | null = null;
        if (vRow.subsectionName.trim()) {
          const key = vRow.subsectionName.trim().toLowerCase();
          if (verbSubCache.has(key)) {
            verbSubId = verbSubCache.get(key)!;
          } else {
            await addSection({ level_id: targetVerbLevelId, name: vRow.subsectionName.trim(), position: nextSectionPos(targetVerbLevelId) });
            const newSection = useDataStore.getState().sections.find(
              s => s.level_id === targetVerbLevelId && s.name.toLowerCase() === key
            );
            if (newSection) {
              verbSubCache.set(key, newSection.id);
              verbSubId = newSection.id;
            }
          }
        }

        await addVerb(
          { level_id: targetVerbLevelId, section_id: verbSubId, infinitive_source: vRow.infinitive_source, infinitive_target: vRow.infinitive_target, disabled: vRow.disabled },
          vRow.conjugations,
        );
        writtenLevelIds.add(targetVerbLevelId);
        verbsImported++;
      }

      // Refresh word pairs and verbs for every level we wrote to
      for (const lvlId of writtenLevelIds) {
        await fetchWordPairs(lvlId);
        await fetchVerbs(lvlId);
      }

      setIsImporting(false);
      onImported(imported + verbsImported, skipped + verbsSkipped);
      onClose();
    } catch (err) {
      setIsImporting(false);
      setImportError(err instanceof Error ? err.message : String(err));
    }
  };

  const updateVerbRowSection = (id: string, value: string) => {
    setVerbRows(prev => prev.map(r => r.id === id ? { ...r, sectionName: value } : r));
  };

  const updateVerbRowSubsection = (id: string, value: string) => {
    setVerbRows(prev => prev.map(r => r.id === id ? { ...r, subsectionName: value } : r));
  };

  const removeVerbRow = (id: string) => {
    setVerbRows(prev => prev.filter(r => r.id !== id));
  };

  const toImportCount = rows.filter(r => !r.isDuplicate).length;
  const duplicateCount = rows.filter(r => r.isDuplicate).length;
  const verbsToImportCount = verbRows.filter(r => !r.isDuplicate).length;
  const verbDuplicateCount = verbRows.filter(r => r.isDuplicate).length;
  const totalToImport = toImportCount + verbsToImportCount;
  const existingSubsectionNames = sections.map(s => s.name);
  const levelNames = levels.map(l => l.name);

  // --- Step 1: Select file ---
  if (step === 'select-file') {
    const footer = (
      <>
        <Button variant="secondary" onClick={onClose}>{t.cancel}</Button>
        <Button variant="primary" onClick={triggerImport} disabled={isChecking}>
          {isChecking ? t.importChecking : t.importChooseFile}
        </Button>
        <input {...fileInputProps} />
      </>
    );

    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t.importExcel} footer={footer}>
        <div className="flex flex-col gap-3">
          {importError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Import failed: {importError}
            </p>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">{t.importFileHint}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t.importFormatHint}</p>
        </div>
      </Modal>
    );
  }

  // --- Step 2: Preview ---
  const totalItems = rows.length + verbRows.length;
  const footer = (
    <>
      <Button variant="secondary" onClick={() => { setStep('select-file'); setRows([]); setVerbRows([]); }} disabled={isImporting}>
        {t.importBack}
      </Button>
      <Button variant="primary" onClick={handleImport} disabled={isImporting || totalToImport === 0}>
        {isImporting ? '...' : t.importToImport(totalToImport)}
      </Button>
    </>
  );

  const totalDuplicates = duplicateCount + verbDuplicateCount;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.importPreviewTitle(totalItems)} footer={footer} size="lg">
      <div className="flex flex-col gap-3">
        {totalDuplicates > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {totalToImport} to import, {totalDuplicates} duplicate{totalDuplicates > 1 ? 's' : ''} will be skipped
          </p>
        )}
        {importError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Import failed: {importError}
          </p>
        )}
        <datalist id="import-level-datalist">
          {levelNames.map(name => <option key={name} value={name} />)}
        </datalist>
        <datalist id="import-subsection-datalist">
          {existingSubsectionNames.map(name => <option key={name} value={name} />)}
        </datalist>

        {/* Word Pairs Table */}
        {rows.length > 0 && (
          <>
            {verbRows.length > 0 && (
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.wordPairsTab} ({rows.length})</p>
            )}
            <div className="overflow-x-auto max-h-56 overflow-y-auto rounded border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">{sourceLabel}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">{targetLabel}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">{t.exportSectionColumn}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">{t.exportSubsectionColumn}</th>
                    <th className="px-2 py-2 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr
                      key={row.id}
                      className={`border-t border-gray-100 dark:border-gray-700 ${row.isDuplicate ? 'opacity-40' : ''}`}
                    >
                      <td className="px-3 py-1.5 text-gray-800 dark:text-gray-200 truncate max-w-0">{row.source}</td>
                      <td className="px-3 py-1.5 text-gray-800 dark:text-gray-200 truncate max-w-0">{row.target}</td>
                      <td className="px-3 py-1.5">
                        {row.isDuplicate ? null : (
                          <input
                            type="text"
                            list="import-level-datalist"
                            value={row.sectionName}
                            onChange={e => updateRowSection(row.id, e.target.value)}
                            placeholder={levels.find(l => l.id === levelId)?.name ?? ''}
                            className="w-full text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {row.isDuplicate ? (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{t.importDuplicateLabel}</span>
                        ) : (
                          <input
                            type="text"
                            list="import-subsection-datalist"
                            value={row.subsectionName}
                            onChange={e => updateRowSubsection(row.id, e.target.value)}
                            placeholder={t.importSectionPlaceholder}
                            className="w-full text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {!row.isDuplicate && (
                          <button
                            onClick={() => removeRow(row.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors text-xs leading-none"
                            aria-label="Remove"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Verb Table */}
        {verbRows.length > 0 && (
          <>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.verbsTab} ({verbRows.length})</p>
            <div className="overflow-x-auto max-h-56 overflow-y-auto rounded border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">{sourceLabel}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">{targetLabel}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">{t.forms}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">{t.exportSectionColumn}</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">{t.exportSubsectionColumn}</th>
                    <th className="px-2 py-2 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {verbRows.map(vRow => (
                    <tr
                      key={vRow.id}
                      className={`border-t border-gray-100 dark:border-gray-700 ${vRow.isDuplicate ? 'opacity-40' : ''}`}
                    >
                      <td className="px-3 py-1.5 text-gray-800 dark:text-gray-200 truncate max-w-0">{vRow.infinitive_source}</td>
                      <td className="px-3 py-1.5 text-gray-800 dark:text-gray-200 truncate max-w-0">{vRow.infinitive_target}</td>
                      <td className="px-3 py-1.5 text-gray-400 dark:text-gray-500 text-xs">{vRow.conjugationCount}</td>
                      <td className="px-3 py-1.5">
                        {vRow.isDuplicate ? null : (
                          <input
                            type="text"
                            list="import-level-datalist"
                            value={vRow.sectionName}
                            onChange={e => updateVerbRowSection(vRow.id, e.target.value)}
                            placeholder={levels.find(l => l.id === levelId)?.name ?? ''}
                            className="w-full text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {vRow.isDuplicate ? (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{t.importDuplicateLabel}</span>
                        ) : (
                          <input
                            type="text"
                            list="import-subsection-datalist"
                            value={vRow.subsectionName}
                            onChange={e => updateVerbRowSubsection(vRow.id, e.target.value)}
                            placeholder={t.importSectionPlaceholder}
                            className="w-full text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {!vRow.isDuplicate && (
                          <button
                            onClick={() => removeVerbRow(vRow.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors text-xs leading-none"
                            aria-label="Remove"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
