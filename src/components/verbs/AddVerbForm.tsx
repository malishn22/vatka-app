import React, { useEffect, useRef, useState } from 'react';
import { useDataStore } from '../../store/dataStore';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { useT } from '../../i18n/useT';
import { usePairedPaste } from '../../hooks/usePairedPaste';
import { VerbFormEditor } from './VerbFormEditor';
import type { FormTypeGroup } from '../../types';

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

  useEffect(() => {
    if (pendingFocusRef.current) {
      const { type, key } = pendingFocusRef.current;
      pendingFocusRef.current = null;
      setTimeout(() => {
        if (type === 'form') formRefs.current[key]?.focus();
        else personRefs.current[key]?.focus();
      }, 0);
    }
  }, [formTypeGroups]);

  const handleInfinitivePaste = usePairedPaste((left, right) => {
    setInfinitiveSource(left);
    setInfinitiveTarget(right);
    setError('');
  }, targetRef);

  const updateFormType = (gi: number, formType: string) => {
    setFormTypeGroups((prev) => prev.map((g, i) => i === gi ? { ...g, formType } : g));
  };

  const updateEntry = (gi: number, ei: number, field: 'person' | 'form', value: string) => {
    setFormTypeGroups((prev) => prev.map((g, gi2) =>
      gi2 === gi
        ? { ...g, entries: g.entries.map((e, ei2) => ei2 === ei ? { ...e, [field]: value } : e) }
        : g
    ));
  };

  const addEntry = (gi: number) => {
    const newEntryIdx = formTypeGroups[gi].entries.length;
    pendingFocusRef.current = { type: 'person', key: `${gi}-${newEntryIdx}` };
    setFormTypeGroups((prev) => prev.map((g, i) =>
      i === gi ? { ...g, entries: [...g.entries, { person: '', form: '' }] } : g
    ));
  };

  const removeEntry = (gi: number, ei: number) => {
    setFormTypeGroups((prev) => prev.map((g, gi2) =>
      gi2 === gi ? { ...g, entries: g.entries.filter((_, ei2) => ei2 !== ei) } : g
    ));
  };

  const addFormTypeGroup = () => {
    setFormTypeGroups((prev) => [...prev, { formType: '', entries: [{ person: '', form: '' }] }]);
  };

  const removeFormTypeGroup = (gi: number) => {
    setFormTypeGroups((prev) => prev.filter((_, i) => i !== gi));
  };

  const fillPersons = (gi: number) => {
    const group = formTypeGroups[gi];
    const existingPersons = new Set(group.entries.map((e) => e.person.trim().toLowerCase()).filter(Boolean));
    const missingPersons = usedPersons.filter((p) => !existingPersons.has(p.toLowerCase()));
    if (missingPersons.length === 0) return;

    const nonEmptyEntries = group.entries.filter((e) => e.person.trim() || e.form.trim());
    const finalEntries = [
      ...nonEmptyEntries,
      ...missingPersons.map((p) => ({ person: p, form: '' })),
    ];

    const firstEmptyFormIdx = finalEntries.findIndex((e) => !e.form.trim());
    if (firstEmptyFormIdx >= 0) {
      pendingFocusRef.current = { type: 'form', key: `${gi}-${firstEmptyFormIdx}` };
    }
    setFormTypeGroups((prev) => prev.map((g, i) => i === gi ? { ...g, entries: finalEntries } : g));
  };

  const getMissingPersonCount = (gi: number) => {
    const group = formTypeGroups[gi];
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

      <div className="max-h-[40vh] overflow-y-auto">
        <VerbFormEditor
          formTypeGroups={formTypeGroups}
          usedFormTypes={usedFormTypes}
          usedPersons={usedPersons}
          showFormTypeSuggestions={showFormTypeSuggestions}
          onShowFormTypeSuggestions={setShowFormTypeSuggestions}
          onUpdateFormType={updateFormType}
          onUpdateEntry={updateEntry}
          onAddEntry={addEntry}
          onRemoveEntry={removeEntry}
          onRemoveFormTypeGroup={removeFormTypeGroup}
          onFillPersons={fillPersons}
          getMissingPersonCount={getMissingPersonCount}
          formTypeRef={(gi, el) => { formTypeRefs.current[gi] = el; }}
          personRef={(gi, ei, el) => { personRefs.current[`${gi}-${ei}`] = el; }}
          formRef={(gi, ei, el) => { formRefs.current[`${gi}-${ei}`] = el; }}
          onFormTypeKeyDown={(gi, e) => { if (e.key === 'Enter') personRefs.current[`${gi}-0`]?.focus(); }}
          onPersonKeyDown={(gi, ei, e) => { if (e.key === 'Enter') formRefs.current[`${gi}-${ei}`]?.focus(); }}
          onPersonPaste={handleEntryPaste}
        />
      </div>

      <div className="flex items-center justify-between mt-3">
        <Button onClick={addFormTypeGroup}>{t.addFormType}</Button>
        <Button onClick={handleAdd}>{t.add}</Button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
