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

interface TenseGroup {
  tense: string;
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
  const { addVerb, levels, verbExistsInLanguage, fetchUsedTenses, fetchUsedPersons } = useDataStore();
  const t = useT();
  const [infinitiveSource, setInfinitiveSource] = useState('');
  const [infinitiveTarget, setInfinitiveTarget] = useState('');
  const [tenseGroups, setTenseGroups] = useState<TenseGroup[]>([
    { tense: '', entries: [{ person: '', form: '' }] },
  ]);
  const [error, setError] = useState('');
  const [usedTenses, setUsedTenses] = useState<string[]>([]);
  const [usedPersons, setUsedPersons] = useState<string[]>([]);
  const [showTenseSuggestions, setShowTenseSuggestions] = useState<number | null>(null);

  // Refs for focus management
  const sourceRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<HTMLInputElement>(null);
  const tenseRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const personRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const formRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pendingFocusRef = useRef<{ type: 'person' | 'form'; key: string } | null>(null);

  useEffect(() => {
    fetchUsedTenses(languageId).then(setUsedTenses);
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
  }, [tenseGroups]);

  // Paired paste for infinitive inputs
  const handleInfinitivePaste = usePairedPaste((left, right) => {
    setInfinitiveSource(left);
    setInfinitiveTarget(right);
    setError('');
  }, targetRef);

  const updateTense = (groupIdx: number, tense: string) => {
    setTenseGroups((prev) => prev.map((g, i) => i === groupIdx ? { ...g, tense } : g));
  };

  const updateEntry = (groupIdx: number, entryIdx: number, field: 'person' | 'form', value: string) => {
    setTenseGroups((prev) => prev.map((g, gi) =>
      gi === groupIdx
        ? { ...g, entries: g.entries.map((e, ei) => ei === entryIdx ? { ...e, [field]: value } : e) }
        : g
    ));
  };

  const addEntry = (groupIdx: number) => {
    const newEntryIdx = tenseGroups[groupIdx].entries.length;
    pendingFocusRef.current = { type: 'person', key: `${groupIdx}-${newEntryIdx}` };
    setTenseGroups((prev) => prev.map((g, i) =>
      i === groupIdx ? { ...g, entries: [...g.entries, { person: '', form: '' }] } : g
    ));
  };

  const removeEntry = (groupIdx: number, entryIdx: number) => {
    setTenseGroups((prev) => prev.map((g, gi) =>
      gi === groupIdx
        ? { ...g, entries: g.entries.filter((_, ei) => ei !== entryIdx) }
        : g
    ));
  };

  const addTenseGroup = () => {
    setTenseGroups((prev) => [...prev, { tense: '', entries: [{ person: '', form: '' }] }]);
  };

  const removeTenseGroup = (groupIdx: number) => {
    setTenseGroups((prev) => prev.filter((_, i) => i !== groupIdx));
  };

  const fillPersons = (groupIdx: number) => {
    const group = tenseGroups[groupIdx];
    const existingPersons = new Set(group.entries.map((e) => e.person.trim().toLowerCase()).filter(Boolean));
    const missingPersons = usedPersons.filter((p) => !existingPersons.has(p.toLowerCase()));
    if (missingPersons.length === 0) return;

    // Remove empty rows (no person and no form), then add missing persons
    const nonEmptyEntries = group.entries.filter((e) => e.person.trim() || e.form.trim());
    const newEntries = [
      ...nonEmptyEntries,
      ...missingPersons.map((p) => ({ person: p, form: '' })),
    ];
    // If all rows were empty, just use the new persons
    const finalEntries = newEntries.length > 0 ? newEntries : missingPersons.map((p) => ({ person: p, form: '' }));

    // Focus the first empty form field after filling
    const firstEmptyFormIdx = finalEntries.findIndex((e) => !e.form.trim());
    if (firstEmptyFormIdx >= 0) {
      pendingFocusRef.current = { type: 'form', key: `${groupIdx}-${firstEmptyFormIdx}` };
    }

    setTenseGroups((prev) => prev.map((g, i) => i === groupIdx ? { ...g, entries: finalEntries } : g));
  };

  const getMissingPersonCount = (groupIdx: number) => {
    const group = tenseGroups[groupIdx];
    const existingPersons = new Set(group.entries.map((e) => e.person.trim().toLowerCase()).filter(Boolean));
    return usedPersons.filter((p) => !existingPersons.has(p.toLowerCase())).length;
  };

  const handleAdd = async () => {
    if (!infinitiveSource.trim() || !infinitiveTarget.trim()) {
      setError(t.bothFieldsRequired);
      return;
    }

    const validConjugations = tenseGroups.flatMap((g) =>
      g.entries
        .filter((e) => e.person.trim() && e.form.trim() && g.tense.trim())
        .map((e) => ({ tense: g.tense.trim(), person: e.person.trim(), form: e.form.trim() }))
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
        { level_id: levelId, section_id: sectionId, infinitive_source: infinitiveSource.trim(), infinitive_target: infinitiveTarget.trim() },
        validConjugations
      );
    } catch (e) {
      setError(String(e));
      return;
    }

    setInfinitiveSource('');
    setInfinitiveTarget('');
    setTenseGroups([{ tense: '', entries: [{ person: '', form: '' }] }]);
    setError('');
    sourceRef.current?.focus();
    onAdded?.();
  };

  const filteredTenses = (query: string) =>
    usedTenses.filter((t) => t.toLowerCase().includes(query.toLowerCase()) && t.toLowerCase() !== query.toLowerCase());

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
            onKeyDown={(e) => { if (e.key === 'Enter') tenseRefs.current[0]?.focus(); }}
            onPaste={handleInfinitivePaste}
          />
        </div>
      </div>

      {/* Tense groups */}
      <div className="max-h-[40vh] overflow-y-auto">
        {tenseGroups.map((group, gi) => (
          <div key={gi} className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 relative">
                <Input
                  ref={(el) => { tenseRefs.current[gi] = el; }}
                  inputSize="sm"
                  placeholder={t.tenseName}
                  value={group.tense}
                  onChange={(e) => { updateTense(gi, e.target.value); setShowTenseSuggestions(gi); }}
                  onFocus={() => setShowTenseSuggestions(gi)}
                  onBlur={() => setTimeout(() => setShowTenseSuggestions(null), 150)}
                  onKeyDown={(e) => { if (e.key === 'Enter') personRefs.current[`${gi}-0`]?.focus(); }}
                />
                {showTenseSuggestions === gi && group.tense && filteredTenses(group.tense).length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg max-h-32 overflow-y-auto">
                    {filteredTenses(group.tense).map((t) => (
                      <button key={t} className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
                        onMouseDown={() => { updateTense(gi, t); setShowTenseSuggestions(null); }}>
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {tenseGroups.length > 1 && (
                <Button variant="icon" hoverColor="red" onClick={() => removeTenseGroup(gi)} title={t.delete}>
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
        <Button onClick={addTenseGroup}>
          {t.addTense}
        </Button>
        <Button onClick={handleAdd}>{t.add}</Button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
