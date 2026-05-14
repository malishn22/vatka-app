import { useEffect, useState } from 'react';
import { useDataStore } from '../../store/dataStore';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { useT } from '../../i18n/useT';
import { VerbFormEditor } from './VerbFormEditor';
import type { VerbWithConjugations, FormTypeGroup } from '../../types';

interface EditVerbModalProps {
  verb: VerbWithConjugations;
  languageId: number;
  sourceLabel: string;
  targetLabel: string;
  onClose: () => void;
}

function groupConjugations(verb: VerbWithConjugations): FormTypeGroup[] {
  const groups: Record<string, { person: string; form: string }[]> = {};
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
    setFormTypeGroups((prev) => prev.map((g, i) => i === gi ? { ...g, entries: finalEntries } : g));
  };

  const getMissingPersonCount = (gi: number) => {
    const group = formTypeGroups[gi];
    const existingPersons = new Set(group.entries.map((e) => e.person.trim().toLowerCase()).filter(Boolean));
    return usedPersons.filter((p) => !existingPersons.has(p.toLowerCase())).length;
  };

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
        />

        <Button onClick={addFormTypeGroup}>{t.addFormType}</Button>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
