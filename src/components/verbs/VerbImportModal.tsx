import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import type { Section, Language, Level } from '../../types';
import { useExcelImport, type ParsedSpreadsheetResult } from '../../hooks/useExcelImport';
import { useDataStore } from '../../store/dataStore';
import { useT } from '../../i18n/useT';

interface ImportVerbRow {
  id: string;
  infinitive_source: string;
  infinitive_target: string;
  auxiliary: string;
  case_preposition: string;
  conjugations: { form_type: string; person: string; form: string }[];
  conjugationCount: number;
  sectionName: string;
  subsectionName: string;
  isDuplicate: boolean;
  disabled: boolean;
}

interface VerbImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelId: number;
  language: Language;
  sections: Section[];
  levels: Level[];
  sourceLabel: string;
  targetLabel: string;
  onImported: (count: number, skipped: number) => void;
}

export function VerbImportModal({
  isOpen,
  onClose,
  levelId,
  language,
  sections,
  levels,
  sourceLabel,
  targetLabel,
  onImported,
}: VerbImportModalProps) {
  const t = useT();
  const { addVerb, addSection, addLevel, verbExistsInLanguage, fetchVerbs } = useDataStore();

  const [step, setStep] = useState<'select-file' | 'preview'>('select-file');
  const [verbRows, setVerbRows] = useState<ImportVerbRow[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('select-file');
      setVerbRows([]);
      setIsChecking(false);
      setIsImporting(false);
      setImportError(null);
    }
  }, [isOpen]);

  const handleParsed = useCallback(async (result: ParsedSpreadsheetResult) => {
    const parsedVerbs = result.verbs;
    setIsChecking(true);
    setImportError(null);
    try {
      const built: ImportVerbRow[] = [];
      for (let i = 0; i < parsedVerbs.length; i++) {
        const v = parsedVerbs[i];
        const isDuplicate = await verbExistsInLanguage(language.id, v.infinitive_source, v.infinitive_target);
        built.push({
          id: `v-${i}`,
          infinitive_source: v.infinitive_source,
          infinitive_target: v.infinitive_target,
          auxiliary: v.auxiliary ?? '',
          case_preposition: v.case_preposition ?? '',
          conjugations: v.conjugations,
          conjugationCount: v.conjugations.length,
          sectionName: v.section ?? '',
          subsectionName: v.subsection ?? '',
          isDuplicate,
          disabled: v.disabled ?? false,
        });
      }
      setVerbRows(built);
      setStep('preview');
    } finally {
      setIsChecking(false);
    }
  }, [language.id, verbExistsInLanguage]);

  const { triggerImport, fileInputProps } = useExcelImport(
    handleParsed,
    { source: sourceLabel, target: targetLabel },
    (message) => setImportError(message),
  );

  const updateRowSection = (id: string, value: string) => {
    setVerbRows(prev => prev.map(r => r.id === id ? { ...r, sectionName: value } : r));
  };

  const updateRowSubsection = (id: string, value: string) => {
    setVerbRows(prev => prev.map(r => r.id === id ? { ...r, subsectionName: value } : r));
  };

  const removeRow = (id: string) => {
    setVerbRows(prev => prev.filter(r => r.id !== id));
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportError(null);
    let imported = 0;
    let skipped = 0;

    try {
      const subsectionCaches = new Map<number, Map<string, number>>();
      if (levelId > 0) {
        subsectionCaches.set(
          levelId,
          new Map(sections.map(s => [s.name.toLowerCase(), s.id]))
        );
      }

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

      for (const vRow of verbRows) {
        if (vRow.isDuplicate) { skipped++; continue; }

        let targetLevelId = levelId;
        if (vRow.sectionName.trim()) {
          const key = vRow.sectionName.trim().toLowerCase();
          if (levelCache.has(key)) {
            targetLevelId = levelCache.get(key)!;
          } else {
            await addLevel({ language_id: language.id, section_id: null, name: vRow.sectionName.trim(), position: nextLevelPos() });
            const newLevel = useDataStore.getState().levels.find(
              l => l.language_id === language.id && l.name.toLowerCase() === key
            );
            if (newLevel) {
              levelCache.set(key, newLevel.id);
              targetLevelId = newLevel.id;
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
          targetLevelId = defaultLevelId!;
        }

        if (!subsectionCaches.has(targetLevelId)) {
          subsectionCaches.set(targetLevelId, new Map());
        }
        const subCache = subsectionCaches.get(targetLevelId)!;
        let resolvedSubId: number | null = null;
        if (vRow.subsectionName.trim()) {
          const key = vRow.subsectionName.trim().toLowerCase();
          if (subCache.has(key)) {
            resolvedSubId = subCache.get(key)!;
          } else {
            await addSection({ level_id: targetLevelId, name: vRow.subsectionName.trim(), position: nextSectionPos(targetLevelId) });
            const newSection = useDataStore.getState().sections.find(
              s => s.level_id === targetLevelId && s.name.toLowerCase() === key
            );
            if (newSection) {
              subCache.set(key, newSection.id);
              resolvedSubId = newSection.id;
            }
          }
        }

        await addVerb(
          {
            level_id: targetLevelId,
            section_id: resolvedSubId,
            infinitive_source: vRow.infinitive_source,
            infinitive_target: vRow.infinitive_target,
            disabled: vRow.disabled,
            auxiliary: vRow.auxiliary || null,
            case_preposition: vRow.case_preposition || null,
          },
          vRow.conjugations,
        );
        writtenLevelIds.add(targetLevelId);
        imported++;
      }

      for (const lvlId of writtenLevelIds) {
        await fetchVerbs(lvlId);
      }

      setIsImporting(false);
      onImported(imported, skipped);
      onClose();
    } catch (err) {
      setIsImporting(false);
      setImportError(err instanceof Error ? err.message : String(err));
    }
  };

  const toImportCount = verbRows.filter(r => !r.isDuplicate).length;
  const duplicateCount = verbRows.filter(r => r.isDuplicate).length;
  const existingSubsectionNames = sections.map(s => s.name);
  const levelNames = levels.map(l => l.name);

  // Step 1: Select file
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
      <Modal isOpen={isOpen} onClose={onClose} title={t.importVerbs} footer={footer}>
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

  // Step 2: Preview
  const footer = (
    <>
      <Button variant="secondary" onClick={() => { setStep('select-file'); setVerbRows([]); }} disabled={isImporting}>
        {t.importBack}
      </Button>
      <Button variant="primary" onClick={handleImport} disabled={isImporting || toImportCount === 0}>
        {isImporting ? '...' : t.importVerbToImport(toImportCount)}
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.importVerbPreviewTitle(verbRows.length)} footer={footer} size="lg">
      <div className="flex flex-col gap-3">
        {duplicateCount > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {toImportCount} to import, {duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''} will be skipped
          </p>
        )}
        {importError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Import failed: {importError}
          </p>
        )}
        <datalist id="verb-import-level-datalist">
          {levelNames.map(name => <option key={name} value={name} />)}
        </datalist>
        <datalist id="verb-import-subsection-datalist">
          {existingSubsectionNames.map(name => <option key={name} value={name} />)}
        </datalist>
        <div className="overflow-x-auto max-h-80 overflow-y-auto rounded border border-gray-200 dark:border-gray-700">
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
              {verbRows.map(row => (
                <tr
                  key={row.id}
                  className={`border-t border-gray-100 dark:border-gray-700 ${row.isDuplicate ? 'opacity-40' : ''}`}
                >
                  <td className="px-3 py-1.5 text-gray-800 dark:text-gray-200 truncate max-w-0">{row.infinitive_source}</td>
                  <td className="px-3 py-1.5 text-gray-800 dark:text-gray-200 truncate max-w-0">{row.infinitive_target}</td>
                  <td className="px-3 py-1.5 text-gray-400 dark:text-gray-500 text-xs">{row.conjugationCount}</td>
                  <td className="px-3 py-1.5">
                    {row.isDuplicate ? null : (
                      <input
                        type="text"
                        list="verb-import-level-datalist"
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
                        list="verb-import-subsection-datalist"
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
      </div>
    </Modal>
  );
}
