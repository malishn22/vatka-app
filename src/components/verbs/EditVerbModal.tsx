import { useEffect, useState } from 'react';
import { useDataStore } from '../../store/dataStore';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { useT } from '../../i18n/useT';
import { TrashIcon } from '../shared/Icons';
import type { VerbWithConjugations } from '../../types';

interface ConjugationEntry {
  person: string;
  form: string;
}

interface FormTypeGroup {
  formType: string;
  entries: ConjugationEntry[];
}

interface EditVerbModalProps {
  verb: VerbWithConjugations;
  languageId: number;
  sourceLabel: string;
  targetLabel: string;
  onClose: () => void;
}

function groupConjugations(verb: VerbWithConjugations): FormTypeGroup[] {
  const groups: Record<string, ConjugationEntry[]> = {};
  for (const c of verb.conjugations) {
    if (!groups[c.form_type]) groups[c.form_type] = [];
    groups[c.form_type].push({ person: c.person, form: c.form });
  }
  const result = Object.entries(groups).map(([formType, entries]) => ({ formType, entries }));
  return result.length > 0 ? result : [{ formType: '', entries: [{ person: '', form: '' }] }];
}

export function EditVerbModal({ verb, languageId, sourceLabel, targetLabel, onClose }: EditVerbModalProps) {
  const { updateVerb, fetchUsedFormTypes, fetchUsedPersons } = useDataStore();
  const t = useT();
  const [infinitiveSource, setInfinitiveSource] = useState(verb.infinitive_source);
  const [infinitiveTarget, setInfinitiveTarget] = useState(verb.infinitive_target);
  const [auxiliary, setAuxiliary] = useState(verb.auxiliary ?? '');
  const [casePreposition, setCasePreposition] = useState(verb.case_preposition ?? '');
  const [formTypeGroups, setFormTypeGroups] = useState<FormTypeGroup[]>(groupConjugations(verb));
  const [error, setError] = useState('');
  const [usedFormTypes, setUsedFormTypes] = useState<string[]>([]);
  const [usedPersons, setUsedPersons] = useState<string[]>([]);
  const [showFormTypeSuggestions, setShowFormTypeSuggestions] = useState<number | null>(null);

  useEffect(() => {
    fetchUsedFormTypes(languageId).then(setUsedFormTypes);
    fetchUsedPersons(languageId).then(setUsedPersons);
  }, [languageId]);

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
    setFormTypeGroups((prev) => prev.map((g, i) => i === groupIdx ? { ...g, entries: finalEntries } : g));
  };

  const getMissingPersonCount = (groupIdx: number) => {
    const group = formTypeGroups[groupIdx];
    const existingPersons = new Set(group.entries.map((e) => e.person.trim().toLowerCase()).filter(Boolean));
    return usedPersons.filter((p) => !existingPersons.has(p.toLowerCase())).length;
  };

  const filteredFormTypes = (query: string) =>
    usedFormTypes.filter((ft) => ft.toLowerCase().includes(query.toLowerCase()) && ft.toLowerCase() !== query.toLowerCase());

  const handleSave = async () => {
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

    await updateVerb(
      verb.id,
      {
        infinitive_source: infinitiveSource.trim(),
        infinitive_target: infinitiveTarget.trim(),
        auxiliary: auxiliary.trim() || null,
        case_preposition: casePreposition.trim() || null,
      },
      validConjugations
    );
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t.editVerb}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t.cancel}</Button>
          <Button onClick={handleSave}>{t.save}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
        {/* Infinitive inputs */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              label={`${sourceLabel} (${t.infinitive})`}
              value={infinitiveSource}
              onChange={(e) => setInfinitiveSource(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Input
              label={`${targetLabel} (${t.infinitive})`}
              value={infinitiveTarget}
              onChange={(e) => setInfinitiveTarget(e.target.value)}
            />
          </div>
        </div>

        {/* Auxiliary + Case/Preposition */}
        <div className="flex gap-3">
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
        {formTypeGroups.map((group, gi) => (
          <div key={gi} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 relative">
                <Input
                  inputSize="sm"
                  placeholder={t.formTypeName}
                  value={group.formType}
                  onChange={(e) => { updateFormType(gi, e.target.value); setShowFormTypeSuggestions(gi); }}
                  onFocus={() => setShowFormTypeSuggestions(gi)}
                  onBlur={() => setTimeout(() => setShowFormTypeSuggestions(null), 150)}
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

            {group.entries.map((entry, ei) => (
              <div key={ei} className="flex items-center gap-2 mb-1.5">
                <div className="flex-1">
                  <Input
                    inputSize="sm"
                    placeholder={t.person}
                    value={entry.person}
                    onChange={(e) => updateEntry(gi, ei, 'person', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Input
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

        <Button onClick={addFormTypeGroup}>
          {t.addFormType}
        </Button>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
