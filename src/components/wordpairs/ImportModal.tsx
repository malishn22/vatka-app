import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import type { Section, Language, Level } from '../../types';
import { useExcelImport, type ParsedPair } from '../../hooks/useExcelImport';
import { useDataStore } from '../../store/dataStore';
import { useT } from '../../i18n/useT';

interface ImportRow {
  id: string;
  source: string;
  target: string;
  sectionName: string;     // level name — editable
  subsectionName: string;  // subsection name — editable
  isDuplicate: boolean;
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
  const { addWordPair, addSection, wordPairExistsInLanguage, fetchWordPairs } = useDataStore();

  const [step, setStep] = useState<'select-file' | 'preview'>('select-file');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('select-file');
      setRows([]);
      setIsChecking(false);
      setIsImporting(false);
    }
  }, [isOpen]);

  const handleParsed = useCallback(async (parsed: ParsedPair[]) => {
    setIsChecking(true);
    const built: ImportRow[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const { source, target, section, subsection } = parsed[i];
      const isDuplicate = await wordPairExistsInLanguage(language.id, source, target);
      built.push({
        id: String(i),
        source,
        target,
        sectionName: section ?? '',
        subsectionName: subsection ?? '',
        isDuplicate,
      });
    }
    setRows(built);
    setIsChecking(false);
    setStep('preview');
  }, [language.id, wordPairExistsInLanguage]);

  const { triggerImport, fileInputProps } = useExcelImport(handleParsed, {
    source: sourceLabel,
    target: targetLabel,
  });

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
    let imported = 0;
    let skipped = 0;

    // Per-level subsection caches: levelId → Map<subsectionNameLower, subsectionId>
    const subsectionCaches = new Map<number, Map<string, number>>();

    // Pre-populate current level's subsections
    subsectionCaches.set(
      levelId,
      new Map(sections.map(s => [s.name.toLowerCase(), s.id]))
    );

    const writtenLevelIds = new Set<number>();

    for (const row of rows) {
      if (row.isDuplicate) { skipped++; continue; }

      // Resolve target level from section name
      let targetLevelId = levelId;
      if (row.sectionName.trim()) {
        const match = levels.find(l => l.name.toLowerCase() === row.sectionName.trim().toLowerCase());
        if (match) targetLevelId = match.id;
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
          await addSection({ level_id: targetLevelId, name: row.subsectionName.trim(), position: 0 });
          const newSection = useDataStore.getState().sections.find(
            s => s.level_id === targetLevelId && s.name.toLowerCase() === key
          );
          if (newSection) {
            subsectionCache.set(key, newSection.id);
            resolvedSubsectionId = newSection.id;
          }
        }
      }

      await addWordPair({ level_id: targetLevelId, section_id: resolvedSubsectionId, source: row.source, target: row.target });
      writtenLevelIds.add(targetLevelId);
      imported++;
    }

    // Refresh word pairs for every level we wrote to
    for (const lvlId of writtenLevelIds) {
      await fetchWordPairs(lvlId);
    }

    setIsImporting(false);
    onImported(imported, skipped);
    onClose();
  };

  const toImportCount = rows.filter(r => !r.isDuplicate).length;
  const duplicateCount = rows.filter(r => r.isDuplicate).length;
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
          <p className="text-sm text-gray-700 dark:text-gray-300">{t.importFileHint}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t.importFormatHint}</p>
        </div>
      </Modal>
    );
  }

  // --- Step 2: Preview ---
  const footer = (
    <>
      <Button variant="secondary" onClick={() => { setStep('select-file'); setRows([]); }} disabled={isImporting}>
        {t.importBack}
      </Button>
      <Button variant="primary" onClick={handleImport} disabled={isImporting || toImportCount === 0}>
        {isImporting ? '...' : t.importToImport(toImportCount)}
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.importPreviewTitle(rows.length)} footer={footer} size="lg">
      <div className="flex flex-col gap-3">
        {duplicateCount > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {toImportCount} to import, {duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''} will be skipped
          </p>
        )}
        <datalist id="import-level-datalist">
          {levelNames.map(name => <option key={name} value={name} />)}
        </datalist>
        <datalist id="import-subsection-datalist">
          {existingSubsectionNames.map(name => <option key={name} value={name} />)}
        </datalist>
        <div className="overflow-x-auto max-h-80 overflow-y-auto rounded border border-gray-200 dark:border-gray-700">
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
      </div>
    </Modal>
  );
}
