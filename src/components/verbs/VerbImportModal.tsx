import { ImportModal } from '../wordpairs/ImportModal';
import type { Subsection, Language, Section } from '../../types';

interface VerbImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: number;
  language: Language;
  subsections: Subsection[];
  sections: Section[];
  sourceLabel: string;
  targetLabel: string;
  onImported: (count: number, skipped: number) => void;
}

export function VerbImportModal(props: VerbImportModalProps) {
  return <ImportModal {...props} mode="verb" />;
}
