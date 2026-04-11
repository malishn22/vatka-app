import { useRef, useState } from 'react';
import { useDataStore } from '../../store/dataStore';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { useT } from '../../i18n/useT';
import { usePairedPaste } from '../../hooks/usePairedPaste';
import { ImportModal } from './ImportModal';

interface AddWordPairFormProps {
  levelId: number;
  sectionId: number | null;
  sourceLabel: string;
  targetLabel: string;
}

export function AddWordPairForm({ levelId, sectionId, sourceLabel, targetLabel }: AddWordPairFormProps) {
  const { addWordPair, sections, levels, wordPairExistsInLanguage, languages } = useDataStore();
  const t = useT();
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const targetRef = useRef<HTMLInputElement>(null);

  const level = levels.find((l) => l.id === levelId);
  const language = level ? languages.find((l) => l.id === level.language_id) : undefined;
  const levelSections = sections.filter(s => s.level_id === levelId);

  const handlePairedPaste = usePairedPaste((left, right) => {
    setSource(left);
    setTarget(right);
    setError('');
    setMessage('');
  }, targetRef);

  const handleAdd = async () => {
    if (!source.trim() || !target.trim()) { setError(t.bothFieldsRequired); return; }
    if (level) {
      const exists = await wordPairExistsInLanguage(level.language_id, source.trim(), target.trim());
      if (exists) { setError(t.wordPairAlreadyExists); return; }
    }
    await addWordPair({ level_id: levelId, section_id: sectionId, source: source.trim(), target: target.trim() });
    setSource('');
    setTarget('');
    setError('');
    setMessage('');
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t.addWordPair}</p>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Input
            label={sourceLabel}
            placeholder={t.wordIn(sourceLabel)}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            onPaste={handlePairedPaste}
            className="w-full"
          />
        </div>
        <div className="flex-1">
          <Input
            ref={targetRef}
            label={targetLabel}
            placeholder={t.wordIn(targetLabel)}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            onPaste={handlePairedPaste}
            className="w-full"
          />
        </div>
        <Button onClick={handleAdd} className="mb-0.5">{t.add}</Button>
        <Button onClick={() => setImportModalOpen(true)} className="mb-0.5">
          {t.importExcel}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {message && <p className="text-xs text-green-600 dark:text-green-400 mt-2">{message}</p>}

      {language && (
        <ImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          levelId={levelId}
          language={language}
          sections={levelSections}
          levels={levels.filter(l => l.language_id === language.id)}
          sourceLabel={sourceLabel}
          targetLabel={targetLabel}
          onImported={(count, skipped) => setMessage(t.importResult(count, skipped))}
        />
      )}
    </div>
  );
}
