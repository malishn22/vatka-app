import { useState } from 'react';
import { useDataStore } from '../../store/dataStore';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import type { WordPair, Section } from '../../types';
import { useT } from '../../i18n/useT';
import { PencilIcon, TrashIcon, EyeIcon, EyeOffIcon } from '../shared/Icons';
import { SectionBadge } from '../shared/SectionBadge';
import { useDragContext } from '../../context/DragContext';
import { useDragSource } from '../../hooks/useDragSource';

interface WordPairRowProps {
  pair: WordPair;
  showSection?: boolean;
  sections?: Section[];
}

export function WordPairRow({ pair, showSection, sections }: WordPairRowProps) {
  const { updateWordPair, deleteWordPair } = useDataStore();
  const { draggingPairId, setDraggingPairId } = useDragContext();
  const { dragProps, dragSourceClass } = useDragSource({ id: pair.id, setDraggingId: setDraggingPairId, isDragging: draggingPairId === pair.id });
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState(pair.source);
  const [target, setTarget] = useState(pair.target);
  const handleSave = async () => {
    if (source.trim() && target.trim()) {
      await updateWordPair(pair.id, { source: source.trim(), target: target.trim() });
      setEditing(false);
    }
  };

  const handleCancel = () => {
    setSource(pair.source);
    setTarget(pair.target);
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="bg-indigo-50 dark:bg-indigo-950">
        <td className="px-4 py-2">
          <Input
            inputSize="sm"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
            autoFocus
            className="w-full"
          />
        </td>
        <td className="px-4 py-2">
          <Input
            inputSize="sm"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
            className="w-full"
          />
        </td>
        {showSection && (
          <td className="px-4 py-2">
            <SectionBadge name={sections?.find((s) => s.id === pair.section_id)?.name} />
          </td>
        )}
        <td className="px-4 py-2 text-right">
          <div className="flex gap-2 justify-end">
            <Button variant="text" textColor="green" size="xs" onClick={handleSave}>{t.save}</Button>
            <Button variant="text" textColor="default" size="xs" onClick={handleCancel}>{t.cancel}</Button>
          </div>
        </td>
      </tr>
    );
  }

  const isDisabled = Boolean(pair.disabled);

  return (
    <tr
      {...dragProps}
      className={`group hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 cursor-grab ${isDisabled ? 'opacity-40' : ''} ${dragSourceClass}`}
    >
      <td className="px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200">{pair.source}</td>
      <td className="px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200">{pair.target}</td>
      {showSection && (
        <td className="px-4 py-2.5">
          <SectionBadge name={sections?.find((s) => s.id === pair.section_id)?.name} />
        </td>
      )}
      <td className="px-4 py-2.5 text-right">
        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="icon"
            hoverColor="indigo"
            onClick={() => updateWordPair(pair.id, { disabled: !isDisabled })}
            title={isDisabled ? t.enablePair : t.disablePair}
          >
            {isDisabled ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
          <Button variant="icon" hoverColor="indigo" onClick={() => setEditing(true)} title={t.edit}>
            <PencilIcon />
          </Button>
          <Button variant="icon" hoverColor="red" onClick={() => deleteWordPair(pair.id)} title={t.delete}>
            <TrashIcon />
          </Button>
        </div>
      </td>
    </tr>
  );
}
