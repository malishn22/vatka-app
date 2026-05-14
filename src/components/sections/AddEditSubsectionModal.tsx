import { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { useDataStore } from '../../store/dataStore';
import type { Subsection } from '../../types';
import { useT } from '../../i18n/useT';

interface AddEditSubsectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: number;
  subsection?: Subsection;
}

export function AddEditSubsectionModal({ isOpen, onClose, sectionId, subsection }: AddEditSubsectionModalProps) {
  const { addSubsection, updateSubsection, subsections } = useDataStore();
  const t = useT();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(subsection?.name ?? '');
      setError('');
    }
  }, [isOpen, subsection]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError(t.nameIsRequired); return; }
    if (subsection) {
      await updateSubsection(subsection.id, { name: name.trim() });
    } else {
      const sectionSubsections = subsections.filter((s) => s.section_id === sectionId);
      await addSubsection({ section_id: sectionId, name: name.trim(), position: sectionSubsections.length });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={subsection ? t.editSubsectionTitle : t.addSubsectionTitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t.cancel}</Button>
          <Button onClick={handleSubmit}>{subsection ? t.save : t.add}</Button>
        </>
      }
    >
      <Input
        label={t.subsectionName}
        placeholder={t.subsectionNamePlaceholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        autoFocus
      />
    </Modal>
  );
}
