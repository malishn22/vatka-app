import { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { useDataStore } from '../../store/dataStore';
import type { Section } from '../../types';
import { useT } from '../../i18n/useT';

interface AddEditSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  languageId: number;
  section?: Section;
}

export function AddEditSectionModal({ isOpen, onClose, languageId, section }: AddEditSectionModalProps) {
  const { addSection, updateSection, sections } = useDataStore();
  const t = useT();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(section?.name ?? '');
      setError('');
    }
  }, [isOpen, section]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError(t.nameIsRequired); return; }
    if (section) {
      await updateSection(section.id, { name: name.trim() });
    } else {
      await addSection({ language_id: languageId, name: name.trim(), position: sections.length });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={section ? t.editSectionTitle : t.addSectionTitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t.cancel}</Button>
          <Button onClick={handleSubmit}>{section ? t.save : t.add}</Button>
        </>
      }
    >
      <Input
        label={t.sectionName}
        placeholder={t.sectionNamePlaceholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        autoFocus
      />
    </Modal>
  );
}
