import { ImportModal } from '../wordpairs/ImportModal';
import type { Section, Language, Level } from '../../types';

interface VerbImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelId: number;
  language: Language;
  sections: Section[];
  levels: Level[];
  sourceLabel: string;
  targetLabel: string;
  onImported: (count: number, skipped: number) => void;
}

export function VerbImportModal(props: VerbImportModalProps) {
  return <ImportModal {...props} mode="verb" />;
}
