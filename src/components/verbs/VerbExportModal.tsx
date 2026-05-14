import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import type { Section, Language, Subsection, VerbWithConjugations } from '../../types';
import { useExcelExport, fetchVerbsRaw, fetchSubsectionsRaw, type ExportPayload } from '../../hooks/useExcelExport';
import { useT } from '../../i18n/useT';
import { SectionMultiSelect } from '../shared/SectionMultiSelect';

type ExportFormat = 'xlsx' | 'csv';
type ExportStep = 'select-sections' | 'select-verbs';

interface VerbExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  format: ExportFormat;
  language: Language;
  sections: Section[];
  currentSectionId: number;
  subsections: Subsection[];
  verbs: VerbWithConjugations[];
  onSuccess: () => void;
}

export function VerbExportModal({
  isOpen,
  onClose,
  format,
  language,
  sections,
  currentSectionId,
  subsections,
  verbs,
  onSuccess,
}: VerbExportModalProps) {
  const t = useT();
  const currentSection = sections.find(s => s.id === currentSectionId);

  const [step, setStep] = useState<ExportStep>('select-sections');
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<number>>(new Set());

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [allVerbs, setAllVerbs] = useState<VerbWithConjugations[]>([]);
  const [allSubsections, setAllSubsections] = useState<Subsection[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep('select-sections');
      setSelectedSectionIds(new Set(sections.map(s => s.id)));
      setSearch('');
      setSelectedIds(new Set());
      setExportError(null);
      setAllVerbs([]);
      setAllSubsections([]);
    }
  }, [isOpen, sections]);

  const toggleSection = (id: number) => {
    setSelectedSectionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNext = async () => {
    setIsLoading(true);
    try {
      const combinedVerbs: VerbWithConjugations[] = [];
      const combinedSubsections: Subsection[] = [];
      const seenSubsectionIds = new Set<number>();

      for (const sec of sections) {
        if (!selectedSectionIds.has(sec.id)) continue;

        const secVerbs = sec.id === currentSectionId ? verbs : await fetchVerbsRaw(sec.id);
        combinedVerbs.push(...secVerbs);

        const subs = sec.id === currentSectionId ? subsections : await fetchSubsectionsRaw(sec.id);
        for (const sub of subs) {
          if (!seenSubsectionIds.has(sub.id)) {
            combinedSubsections.push(sub);
            seenSubsectionIds.add(sub.id);
          }
        }
      }

      setAllVerbs(combinedVerbs);
      setAllSubsections(combinedSubsections);
      setSelectedIds(new Set(combinedVerbs.map(v => v.id)));
      setStep('select-verbs');
    } finally {
      setIsLoading(false);
    }
  };

  const subsectionMap = useMemo(
    () => new Map<number, string>(allSubsections.map(s => [s.id, s.name])),
    [allSubsections]
  );

  const sectionMap = useMemo(
    () => new Map<number, string>(sections.map(s => [s.id, s.name])),
    [sections]
  );

  const filteredVerbs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allVerbs;
    return allVerbs.filter(
      v => v.infinitive_source.toLowerCase().includes(q) || v.infinitive_target.toLowerCase().includes(q)
    );
  }, [allVerbs, search]);

  const toggleVerb = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected = filteredVerbs.length > 0 && filteredVerbs.every(v => selectedIds.has(v.id));

  const selectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredVerbs.forEach(v => next.add(v.id));
      return next;
    });
  };

  const deselectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredVerbs.forEach(v => next.delete(v.id));
      return next;
    });
  };

  const { exportXlsx, exportCsv } = useExcelExport({
    wordPairs: [],
    subsections,
    section: currentSection ?? sections[0],
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
      const selectedVerbs = allVerbs.filter(v => selectedIds.has(v.id));
      const referencedSectionIds = new Set(selectedVerbs.map(v => v.section_id));
      const referencedSubsectionIds = new Set(
        selectedVerbs.map(v => v.subsection_id).filter((id): id is number => id !== null)
      );
      const filteredSections = sections.filter(s => referencedSectionIds.has(s.id));
      const filteredSubsections = allSubsections.filter(s => referencedSubsectionIds.has(s.id));
      const payload: ExportPayload = {
        wordPairs: [],
        subsections: filteredSubsections,
        sections: filteredSections,
        fileLabel: filteredSections.length === 1 ? filteredSections[0].name : language.name,
        verbs: selectedVerbs,
      };
      if (format === 'xlsx') await exportXlsx(payload);
      else await exportCsv(payload);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExporting(false);
    }
  };

  // Step 1: Select Sections
  if (step === 'select-sections') {
    const footer = (
      <>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>{t.cancel}</Button>
        <Button variant="primary" onClick={handleNext} disabled={isLoading || selectedSectionIds.size === 0}>
          {isLoading ? '...' : 'Next →'}
        </Button>
      </>
    );

    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t.exportVerbs} footer={footer}>
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.exportScope}</p>
          <SectionMultiSelect
            sections={sections}
            selectedSectionIds={selectedSectionIds}
            currentSectionId={currentSectionId}
            onToggle={toggleSection}
          />
        </div>
      </Modal>
    );
  }

  // Step 2: Select Verbs
  const showSectionCol = selectedSectionIds.size > 1;
  const footer = (
    <>
      <Button variant="secondary" onClick={() => setStep('select-sections')} disabled={isExporting}>
        ← Back
      </Button>
      <Button variant="primary" onClick={handleExport} disabled={isExporting || selectedIds.size === 0}>
        {isExporting ? '...' : (format === 'xlsx' ? t.exportExcel : t.exportCsv)}
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.exportVerbs} footer={footer} size="lg">
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
              disabled={filteredVerbs.every(v => !selectedIds.has(v.id))}
              className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-40 disabled:cursor-default"
            >
              {t.exportDeselectAll}
            </button>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t.exportSelectedCount(selectedIds.size, allVerbs.length)}
          </span>
        </div>

        <div className="overflow-y-auto max-h-72 rounded border border-gray-200 dark:border-gray-700">
          {filteredVerbs.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">—</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <tbody>
                {filteredVerbs.map(verb => {
                  const subsecName = verb.subsection_id != null ? subsectionMap.get(verb.subsection_id) : undefined;
                  const secName = sectionMap.get(verb.section_id);
                  return (
                    <tr
                      key={verb.id}
                      className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => toggleVerb(verb.id)}
                    >
                      <td className="px-3 py-2 w-6">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(verb.id)}
                          onChange={() => toggleVerb(verb.id)}
                          onClick={e => e.stopPropagation()}
                          className="accent-indigo-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{verb.infinitive_source}</td>
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{verb.infinitive_target}</td>
                      <td className="px-3 py-2 text-gray-400 dark:text-gray-500 text-xs">{verb.conjugations.length} {t.forms}</td>
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
