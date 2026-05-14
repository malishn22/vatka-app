import React, { useEffect, useRef, useState } from 'react';
import { useDataStore } from '../../store/dataStore';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { useT } from '../../i18n/useT';
import { TrashIcon } from '../shared/Icons';
import { usePairedPaste } from '../../hooks/usePairedPaste';

interface ConjugationEntry {
  person: string;
  form: string;
}

interface FormTypeGroup {
  formType: string;
  entries: ConjugationEntry[];
}

interface AddVerbFormProps {
  levelId: number;
  sectionId: number | null;
  languageId: number;
  sourceLabel: string;
  targetLabel: string;
  onAdded?: () => void;
}

export function AddVerbForm({ levelId, sectionId, languageId, sourceLabel, targetLabel, onAdded }: AddVerbFormProps) {
  const { addVerb, levels, verbExistsInLanguage, fetchUsedFormTypes, fetchUsedPersons } = useDataStore();
  const t = useT();
  const [infinitiveSource, setInfinitiveSource] = useState('');
  const [infinitiveTarget, setInfinitiveTarget] = useState('');
  const [auxiliary, setAuxiliary] = useState('');
  const [casePreposition, setCasePreposition] = useState('');
  const [formTypeGroups, setFormTypeGroups] = useState<FormTypeGroup[]>([
    { formType: '', entries: [{ person: '', form: '' }] },
  ]);
  const [error, setError] = useState('');
  const [usedFormTypes, setUsedFormTypes] = useState<string[]>([]);
  const [usedPersons, setUsedPersons] = useState<string[]>([]);
  const [showFormTypeSuggestions, setShowFormTypeSuggestions] = useState<number | null>(null);

  // Refs for focus management
  const sourceRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<HTMLInputElement>(null);
  const formTypeRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const personRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const formRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pendingFocusRef = useRef<{ type: 'person' | 'form'; key: string } | null>(null);

  useEffect(() => {
    fetchUsedFormTypes(languageId).then(setUsedFormTypes);
    fetchUsedPersons(languageId).then(setUsedPersons);
  }, [languageId]);

  // Handle pending focus after state updates
  useEffect(() => {
    if (pendingFocusRef.current) {
      const { type, key } = pendingFocusRef.current;
      pendingFocusRef.current = null;
      setTimeout(() => {
        if (type === 'form') {
          formRefs.current[key]?.focus();
        } else {
          personRefs.current[key]?.focus();
        }
      }, 0);
    }
  }, [formTypeGroups]);

  // Paired paste for infinitive inputs
  const handleInfinitivePaste = usePairedPaste((left, right) => {
    setInfinitiveSource(left);
    setInfinitiveTarget(right);
    setError('');
  }, targetRef);

  const updateFormType = (groupIdx: number, formType: string) => {
    setFormTypeGroups((prev) => prev.map((g, i) => i === groupIdx ? { ...g, formType } : g));
  };

  const updateEntry = (groupIdx: number, entryIdx: number, field: 'person' | 'form', value: string) => {
    setFormTypeGroups((prev) => prev.map((g, gi) =>
      gi === groupIdx
        ? { ...g, entries: g.entries.map((e, ei) => ei === entryIdx ? { ...e, [field]: value } : e) }
        : g
    ));
  };

  const addEntry = (groupIdx: number) => {
    const newEntryIdx = formTypeGroups[groupIdx].entries.length;
    pendingFocusRef.current = { type: 'person', key: `${groupIdx}-${newEntryIdx}` };
    setFormTypeGroups((prev) => prev.map((g, i) =>
      i === groupIdx ? { ...g, entries: [...g.entries, { person: '', form: '' }] } : g
    ));
  };

  const removeEntry = (groupIdx: number, entryIdx: number) => {
    setFormTypeGroups((prev) => prev.map((g, gi) =>
      gi === groupIdx
        ? { ...g, entries: g.entries.filter((_, ei) => ei !== entryIdx) }
        : g
    ));
  };

  const addFormTypeGroup = () => {
    setFormTypeGroups((prev) => [...prev, { formType: '', entries: [{ person: '', form: '' }] }]);
  };

  const removeFormTypeGroup = (groupIdx: number) => {
    setFormTypeGroups((prev) => prev.filter((_, i) => i !== groupIdx));
  };

  const fillPersons = (groupIdx: number) => {
    const group = formTypeGroups[groupIdx];
    const existingPersons = new Set(group.entries.map((e) => e.person.trim().toLowerCase()).filter(Boolean));
    const missingPersons = usedPersons.filter((p) => !existingPersons.has(p.toLowerCase()));
    if (missingPersons.length === 0) return;

    const nonEmptyEntries = group.entries.filter((e) => e.person.trim() || e.form.trim());
    const newEntries = [
      ...nonEmptyEntries,
      ...missingPersons.map((p) => ({ person: p, form: '' })),
    ];
    const finalEntries = newEntries.length > 0 ? newEntries : missingPersons.map((p) => ({ person: p, form: '' }));

    const firstEmptyFormIdx = finalEntries.findIndex((e) => !e.form.trim());
    if (firstEmptyFormIdx >= 0) {
      pendingFocusRef.current = { type: 'form', key: `${groupIdx}-${firstEmptyFormIdx}` };
    }

    setFormTypeGroups((prev) => prev.map((g, i) => i === groupIdx ? { ...g, entries: finalEntries } : g));
  };

  const getMissingPersonCount = (groupIdx: number) => {
    const group = formTypeGroups[groupIdx];
    const existingPersons = new Set(group.entries.map((e) => e.person.trim().toLowerCase()).filter(Boolean));
    return usedPersons.filter((p) => !existingPersons.has(p.toLowerCase())).length;
  };

  const handleAdd = async () => {
    if (!infinitiveSource.trim() || !infinitiveTarget.trim()) {
      setError(t.bothFieldsRequired);
      return;
    }

    const validConjugations = formTypeGroups.flatMap((g) =>
      g.entries
        .filter((e) => e.person.trim() && e.form.trim() && g.formType.trim())
        .map((e) => ({ form_type: g.formType.trim(), person: e.person.trim(), form: e.form.trim() }))
    );

    if (validConjugations.length === 0) {
      setError(t.addAtLeastOneConjugation);
      return;
    }

    const level = levels.find((l) => l.id === levelId);
    if (level) {
      const exists = await verbExistsInLanguage(level.language_id, infinitiveSource.trim(), infinitiveTarget.trim());
      if (exists) { setError(t.verbAlreadyExists); return; }
    }

    try {
      await addVerb(
        {
          level_id: levelId,
          section_id: sectionId,
          infinitive_source: infinitiveSource.trim(),
          infinitive_target: infinitiveTarget.trim(),
          auxiliary: auxiliary.trim() || null,
          case_preposition: casePreposition.trim() || null,
        },
        validConjugations
      );
    } catch (e) {
      setError(String(e));
      return;
    }

    setInfinitiveSource('');
    setInfinitiveTarget('');
    setAuxiliary('');
    setCasePreposition('');
    setFormTypeGroups([{ formType: '', entries: [{ person: '', form: '' }] }]);
    setError('');
    sourceRef.current?.focus();
    onAdded?.();
  };

  const filteredFormTypes = (query: string) =>
    usedFormTypes.filter((ft) => ft.toLowerCase().includes(query.toLowerCase()) && ft.toLowerCase() !== query.toLowerCase());

  // Paired paste handler for person/form rows
  const handleEntryPaste = (gi: number, ei: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').trim();
    const separators = [' - ', ' / ', '/', '-'];
    for (const sep of separators) {
      const idx = text.indexOf(sep);
      if (idx !== -1) {
        const left = text.slice(0, idx).trim();
        const right = text.slice(idx + sep.length).trim();
        if (left && right) {
          e.preventDefault();
          updateEntry(gi, ei, 'person', left);
          updateEntry(gi, ei, 'form', right);
          setTimeout(() => formRefs.current[`${gi}-${ei}`]?.focus(), 0);
          return;
        }
      }
    }
    const match = text.match(/^(\S+)\s+(.+)$/);
    if (match) {
      e.preventDefault();
      updateEntry(gi, ei, 'person', match[1]);
      updateEntry(gi, ei, 'form', match[2]);
      setTimeout(() => formRefs.current[`${gi}-${ei}`]?.focus(), 0);
    }
  };

  return (
    <div className="p-4">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t.addVerb}</p>

      {/* Infinitive inputs */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <Input
            ref={sourceRef}
            label={`${sourceLabel} (${t.infinitive})`}
            placeholder={t.wordIn(sourceLabel)}
            value={infinitiveSource}
            onChange={(e) => setInfinitiveSource(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') targetRef.current?.focus(); }}
            onPaste={handleInfinitivePaste}
          />
        </div>
        <div className="flex-1">
          <Input
            ref={targetRef}
            label={`${targetLabel} (${t.infinitive})`}
            placeholder={t.wordIn(targetLabel)}
            value={infinitiveTarget}
            onChange={(e) => setInfinitiveTarget(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') formTypeRefs.current[0]?.focus(); }}
            onPaste={handleInfinitivePaste}
          />
        </div>
      </div>

      {/* Auxiliary + Case/Preposition */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <Input
            label="Auxiliary"
            placeholder="e.g. Haben"
            value={auxiliary}
            onChange={(e) => setAuxiliary(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <Input
            label="Case/Preposition"
            placeholder="e.g. Akk."
            value={casePreposition}
            onChange={(e) => setCasePreposition(e.target.value)}
          />
        </div>
      </div>

      {/* Form type groups */}
      <div className="max-h-[40vh] overflow-y-auto">
        {formTypeGroups.map((group, gi) => (
          <div key={gi} className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 relative">
                <Input
                  ref={(el) => { formTypeRefs.current[gi] = el; }}
                  inputSize="sm"
                  placeholder={t.formTypeName}
                  value={group.formType}
                  onChange={(e) => { updateFormType(gi, e.target.value); setShowFormTypeSuggestions(gi); }}
                  onFocus={() => setShowFormTypeSuggestions(gi)}
                  onBlur={() => setTimeout(() => setShowFormTypeSuggestions(null), 150)}
                  onKeyDown={(e) => { if (e.key === 'Enter') personRefs.current[`${gi}-0`]?.focus(); }}
                />
                {showFormTypeSuggestions === gi && group.formType && filteredFormTypes(group.formType).length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg max-h-32 overflow-y-auto">
                    {filteredFormTypes(group.formType).map((ft) => (
                      <button key={ft} className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
                        onMouseDown={() => { updateFormType(gi, ft); setShowFormTypeSuggestions(null); }}>
                        {ft}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {formTypeGroups.length > 1 && (
                <Button variant="icon" hoverColor="red" onClick={() => removeFormTypeGroup(gi)} title={t.delete}>
                  <TrashIcon size={16} />
                </Button>
              )}
            </div>

            {/* Person/form entries */}
            {group.entries.map((entry, ei) => (
              <div key={ei} className="flex items-center gap-2 mb-1.5">
                <div className="flex-1">
                  <Input
                    ref={(el) => { personRefs.current[`${gi}-${ei}`] = el; }}
                    inputSize="sm"
                    placeholder={t.person}
                    value={entry.person}
                    onChange={(e) => updateEntry(gi, ei, 'person', e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') formRefs.current[`${gi}-${ei}`]?.focus(); }}
                    onPaste={(e) => handleEntryPaste(gi, ei, e)}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    ref={(el) => { formRefs.current[`${gi}-${ei}`] = el; }}
                    inputSize="sm"
                    placeholder={t.conjugatedForm}
                    value={entry.form}
                    onChange={(e) => updateEntry(gi, ei, 'form', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addEntry(gi);
                      }
                    }}
                  />
                </div>
                {group.entries.length > 1 && (
                  <Button variant="icon" hoverColor="red" onClick={() => removeEntry(gi, ei)}>
                    <TrashIcon size={14} />
                  </Button>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <Button onClick={() => addEntry(gi)}>
                {t.addPersonForm}
              </Button>
              {usedPersons.length > 0 && getMissingPersonCount(gi) > 0 && (
                <Button onClick={() => fillPersons(gi)}>
                  {t.fillPersons}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3">
        <Button onClick={addFormTypeGroup}>
          {t.addFormType}
        </Button>
        <Button onClick={handleAdd}>{t.add}</Button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
