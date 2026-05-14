import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import type { Subsection, Language, Section } from '../../types';
import { useExcelImport, type ParsedSpreadsheetResult } from '../../hooks/useExcelImport';
import { useDataStore } from '../../store/dataStore';
import { useT } from '../../i18n/useT';
import { createResolutionCtx, resolveTargetSection, resolveSubsection } from '../../utils/importResolution';

interface ImportRow {
  id: string;
  source: string;
  target: string;
  sectionName: string;
  subsectionName: string;
  isDuplicate: boolean;
  disabled: boolean;
}

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

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: number;
  language: Language;
  subsections: Subsection[];
  sections: Section[];
  sourceLabel: string;
  targetLabel: string;
  onImported: (count: number, skipped: number) => void;
  mode?: 'both' | 'verb';
}

export function ImportModal({
  isOpen,
  onClose,
  sectionId,
  language,
  subsections,
  sections,
  sourceLabel,
  targetLabel,
  onImported,
  mode = 'both',
}: ImportModalProps) {
  const t = useT();
  const { addWordPair, addVerb, addSubsection, addSection, wordPairExistsInLanguage, verbExistsInLanguage, fetchWordPairs, fetchVerbs } = useDataStore();

  const [step, setStep] = useState<'select-file' | 'preview'>('select-file');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [verbRows, setVerbRows] = useState<ImportVerbRow[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

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
    setIsChecking(true);
    setImportError(null);
    try {
      if (mode !== 'verb') {
        const built: ImportRow[] = [];
        for (let i = 0; i < result.pairs.length; i++) {
          const { source, target, section, subsection } = result.pairs[i];
          const isDuplicate = await wordPairExistsInLanguage(language.id, source, target);
          built.push({
            id: `p-${i}`,
            source,
            target,
            sectionName: section ?? '',
            subsectionName: subsection ?? '',
            isDuplicate,
            disabled: result.pairs[i].disabled ?? false,
          });
        }
        setRows(built);
      }

      const builtVerbs: ImportVerbRow[] = [];
      for (let i = 0; i < result.verbs.length; i++) {
        const v = result.verbs[i];
        const isDuplicate = await verbExistsInLanguage(language.id, v.infinitive_source, v.infinitive_target);
        builtVerbs.push({
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
      setVerbRows(builtVerbs);
      setStep('preview');
    } finally {
      setIsChecking(false);
    }
  }, [language.id, mode, wordPairExistsInLanguage, verbExistsInLanguage]);

  const { triggerImport, fileInputProps } = useExcelImport(
    handleParsed,
    { source: sourceLabel, target: targetLabel },
    (message) => setImportError(message),
  );

  const updateRowSection = (id: string, value: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, sectionName: value } : r));

  const updateRowSubsection = (id: string, value: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, subsectionName: value } : r));

  const removeRow = (id: string) =>
    setRows(prev => prev.filter(r => r.id !== id));

  const updateVerbRowSection = (id: string, value: string) =>
    setVerbRows(prev => prev.map(r => r.id === id ? { ...r, sectionName: value } : r));

  const updateVerbRowSubsection = (id: string, value: string) =>
    setVerbRows(prev => prev.map(r => r.id === id ? { ...r, subsectionName: value } : r));

  const removeVerbRow = (id: string) =>
    setVerbRows(prev => prev.filter(r => r.id !== id));

  const handleImport = async () => {
    setIsImporting(true);
    setImportError(null);
    let imported = 0;
    let skipped = 0;

    try {
      const ctx = createResolutionCtx(
        language.id,
        language.name,
        sectionId,
        sections,
        subsections,
        addSection,
        addSubsection,
        () => useDataStore.getState().sections,
        () => useDataStore.getState().subsections,
      );

      const writtenSectionIds = new Set<number>();

      for (const row of rows) {
        if (row.isDuplicate) { skipped++; continue; }
        const targetSectionId = await resolveTargetSection(row.sectionName, ctx);
        const resolvedSubId = await resolveSubsection(row.subsectionName, targetSectionId, ctx);
        await addWordPair({ section_id: targetSectionId, subsection_id: resolvedSubId, source: row.source, target: row.target, disabled: row.disabled });
        writtenSectionIds.add(targetSectionId);
        imported++;
      }

      let verbsImported = 0;
      let verbsSkipped = 0;
      for (const vRow of verbRows) {
        if (vRow.isDuplicate) { verbsSkipped++; continue; }
        const targetSectionId = await resolveTargetSection(vRow.sectionName, ctx);
        const resolvedSubId = await resolveSubsection(vRow.subsectionName, targetSectionId, ctx);
        await addVerb(
          {
            section_id: targetSectionId,
            subsection_id: resolvedSubId,
            infinitive_source: vRow.infinitive_source,
            infinitive_target: vRow.infinitive_target,
            disabled: vRow.disabled,
            auxiliary: vRow.auxiliary || null,
            case_preposition: vRow.case_preposition || null,
          },
          vRow.conjugations,
        );
        writtenSectionIds.add(targetSectionId);
        verbsImported++;
      }

      for (const secId of writtenSectionIds) {
        await fetchWordPairs(secId);
        await fetchVerbs(secId);
      }

      setIsImporting(false);
      onImported(imported + verbsImported, skipped + verbsSkipped);
      onClose();
    } catch (err) {
      setIsImporting(false);
      setImportError(err instanceof Error ? err.message : String(err));
    }
  };

  const toImportCount = rows.filter(r => !r.isDuplicate).length;
  const duplicateCount = rows.filter(r => r.isDuplicate).length;
  const verbsToImportCount = verbRows.filter(r => !r.isDuplicate).length;
  const verbDuplicateCount = verbRows.filter(r => r.isDuplicate).length;
  const totalToImport = toImportCount + verbsToImportCount;
  const existingSubsectionNames = subsections.map(s => s.name);
  const sectionNames = sections.map(s => s.name);

  const isVerbMode = mode === 'verb';
  const modalTitle = isVerbMode ? t.importVerbs : t.importExcel;

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
      <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} footer={footer}>
        <div className="flex flex-col gap-3">
          {importError && (
            <p className="text-xs text-red-600 dark:text-red-400">Import failed: {importError}</p>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">{t.importFileHint}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t.importFormatHint}</p>
        </div>
      </Modal>
    );
  }

  // --- Step 2: Preview ---
  const totalItems = rows.length + verbRows.length;
  const totalDuplicates = duplicateCount + verbDuplicateCount;
  const previewTitle = isVerbMode
    ? t.importVerbPreviewTitle(verbRows.length)
    : t.importPreviewTitle(totalItems);

  const footer = (
    <>
      <Button variant="secondary" onClick={() => { setStep('select-file'); setRows([]); setVerbRows([]); }} disabled={isImporting}>
        {t.importBack}
      </Button>
      <Button variant="primary" onClick={handleImport} disabled={isImporting || totalToImport === 0}>
        {isImporting ? '...' : (isVerbMode ? t.importVerbToImport(verbsToImportCount) : t.importToImport(totalToImport))}
      </Button>
    </>
  );

  const datalistId = isVerbMode ? 'verb-import-section-datalist' : 'import-section-datalist';
  const subsectionDatalistId = isVerbMode ? 'verb-import-subsection-datalist' : 'import-subsection-datalist';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={previewTitle} footer={footer} size="lg">
      <div className="flex flex-col gap-3">
        {totalDuplicates > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {totalToImport} to import, {totalDuplicates} duplicate{totalDuplicates > 1 ? 's' : ''} will be skipped
          </p>
        )}
        {importError && (
          <p className="text-xs text-red-600 dark:text-red-400">Import failed: {importError}</p>
        )}
        <datalist id={datalistId}>
          {sectionNames.map(name => <option key={name} value={name} />)}
        </datalist>
        <datalist id={subsectionDatalistId}>
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
                            list={datalistId}
                            value={row.sectionName}
                            onChange={e => updateRowSection(row.id, e.target.value)}
                            placeholder={sections.find(s => s.id === sectionId)?.name ?? ''}
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
                            list={subsectionDatalistId}
                            value={row.subsectionName}
                            onChange={e => updateRowSubsection(row.id, e.target.value)}
                            placeholder={t.importSubsectionPlaceholder}
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
            {!isVerbMode && (
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.verbsTab} ({verbRows.length})</p>
            )}
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
                            list={datalistId}
                            value={vRow.sectionName}
                            onChange={e => updateVerbRowSection(vRow.id, e.target.value)}
                            placeholder={sections.find(s => s.id === sectionId)?.name ?? ''}
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
                            list={subsectionDatalistId}
                            value={vRow.subsectionName}
                            onChange={e => updateVerbRowSubsection(vRow.id, e.target.value)}
                            placeholder={t.importSubsectionPlaceholder}
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
