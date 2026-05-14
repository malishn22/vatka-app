import React from 'react';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { TrashIcon } from '../shared/Icons';
import { useT } from '../../i18n/useT';
import type { FormTypeGroup } from '../../types';

export interface VerbFormEditorProps {
  formTypeGroups: FormTypeGroup[];
  usedFormTypes: string[];
  usedPersons: string[];
  showFormTypeSuggestions: number | null;
  onShowFormTypeSuggestions: (idx: number | null) => void;
  onUpdateFormType: (gi: number, value: string) => void;
  onUpdateEntry: (gi: number, ei: number, field: 'person' | 'form', value: string) => void;
  onAddEntry: (gi: number) => void;
  onRemoveEntry: (gi: number, ei: number) => void;
  onRemoveFormTypeGroup: (gi: number) => void;
  onFillPersons: (gi: number) => void;
  getMissingPersonCount: (gi: number) => number;
  // Optional extras for AddVerbForm's focus management
  formTypeRef?: (gi: number, el: HTMLInputElement | null) => void;
  personRef?: (gi: number, ei: number, el: HTMLInputElement | null) => void;
  formRef?: (gi: number, ei: number, el: HTMLInputElement | null) => void;
  onFormTypeKeyDown?: (gi: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPersonKeyDown?: (gi: number, ei: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPersonPaste?: (gi: number, ei: number, e: React.ClipboardEvent<HTMLInputElement>) => void;
}

export function VerbFormEditor({
  formTypeGroups,
  usedFormTypes,
  usedPersons,
  showFormTypeSuggestions,
  onShowFormTypeSuggestions,
  onUpdateFormType,
  onUpdateEntry,
  onAddEntry,
  onRemoveEntry,
  onRemoveFormTypeGroup,
  onFillPersons,
  getMissingPersonCount,
  formTypeRef,
  personRef,
  formRef,
  onFormTypeKeyDown,
  onPersonKeyDown,
  onPersonPaste,
}: VerbFormEditorProps) {
  const t = useT();

  const filteredFormTypes = (query: string) =>
    usedFormTypes.filter((ft) => ft.toLowerCase().includes(query.toLowerCase()) && ft.toLowerCase() !== query.toLowerCase());

  return (
    <>
      {formTypeGroups.map((group, gi) => (
        <div key={gi} className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 relative">
              <Input
                ref={formTypeRef ? (el) => formTypeRef(gi, el) : undefined}
                inputSize="sm"
                placeholder={t.formTypeName}
                value={group.formType}
                onChange={(e) => { onUpdateFormType(gi, e.target.value); onShowFormTypeSuggestions(gi); }}
                onFocus={() => onShowFormTypeSuggestions(gi)}
                onBlur={() => setTimeout(() => onShowFormTypeSuggestions(null), 150)}
                onKeyDown={onFormTypeKeyDown ? (e) => onFormTypeKeyDown(gi, e) : undefined}
              />
              {showFormTypeSuggestions === gi && group.formType && filteredFormTypes(group.formType).length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg max-h-32 overflow-y-auto">
                  {filteredFormTypes(group.formType).map((ft) => (
                    <button
                      key={ft}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
                      onMouseDown={() => { onUpdateFormType(gi, ft); onShowFormTypeSuggestions(null); }}
                    >
                      {ft}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {formTypeGroups.length > 1 && (
              <Button variant="icon" hoverColor="red" onClick={() => onRemoveFormTypeGroup(gi)} title={t.delete}>
                <TrashIcon size={16} />
              </Button>
            )}
          </div>

          {group.entries.map((entry, ei) => (
            <div key={ei} className="flex items-center gap-2 mb-1.5">
              <div className="flex-1">
                <Input
                  ref={personRef ? (el) => personRef(gi, ei, el) : undefined}
                  inputSize="sm"
                  placeholder={t.person}
                  value={entry.person}
                  onChange={(e) => onUpdateEntry(gi, ei, 'person', e.target.value)}
                  onKeyDown={onPersonKeyDown ? (e) => onPersonKeyDown(gi, ei, e) : undefined}
                  onPaste={onPersonPaste ? (e) => onPersonPaste(gi, ei, e) : undefined}
                />
              </div>
              <div className="flex-1">
                <Input
                  ref={formRef ? (el) => formRef(gi, ei, el) : undefined}
                  inputSize="sm"
                  placeholder={t.conjugatedForm}
                  value={entry.form}
                  onChange={(e) => onUpdateEntry(gi, ei, 'form', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddEntry(gi);
                    }
                  }}
                />
              </div>
              {group.entries.length > 1 && (
                <Button variant="icon" hoverColor="red" onClick={() => onRemoveEntry(gi, ei)}>
                  <TrashIcon size={14} />
                </Button>
              )}
            </div>
          ))}

          <div className="flex gap-2">
            <Button onClick={() => onAddEntry(gi)}>{t.addPersonForm}</Button>
            {usedPersons.length > 0 && getMissingPersonCount(gi) > 0 && (
              <Button onClick={() => onFillPersons(gi)}>{t.fillPersons}</Button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
