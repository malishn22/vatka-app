import { useState } from 'react';
import type React from 'react';
import { useDataStore } from '../../store/dataStore';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import type { WordPair, Subsection } from '../../types';
import { useT } from '../../i18n/useT';
import { PencilIcon, TrashIcon, EyeIcon, EyeOffIcon } from '../shared/Icons';
import { SectionBadge } from '../shared/SectionBadge';
import { useDragContext } from '../../context/DragContext';

interface WordPairRowProps {
  pair: WordPair;
  showSection?: boolean;
  subsections?: Subsection[];
  isSelected?: boolean;
  onToggleSelect?: (additive: boolean) => void;
}

export function WordPairRow({ pair, showSection, subsections, isSelected = false, onToggleSelect }: WordPairRowProps) {
  const { updateWordPair, deleteWordPair } = useDataStore();
  const { draggingPairIds, setDraggingPairIds, selectedPairIds, setSelectedPairIds } = useDragContext();
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

  const handleRowClick = (e: React.MouseEvent) => {
    if (onToggleSelect) {
      onToggleSelect(e.metaKey || e.ctrlKey);
    }
  };

  const isPartOfDrag = draggingPairIds.length > 0 && (draggingPairIds.includes(pair.id) || isSelected);

  const dragProps = {
    draggable: true as const,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      const ids = selectedPairIds.includes(pair.id) ? selectedPairIds : [pair.id];
      if (!selectedPairIds.includes(pair.id)) {
        setSelectedPairIds([pair.id]);
      }
      setDraggingPairIds(ids);
      e.dataTransfer.setData('text/plain', JSON.stringify(ids));
    },
    onDragEnd: () => {
      setDraggingPairIds([]);
    },
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
            <SectionBadge name={subsections?.find((s) => s.id === pair.subsection_id)?.name} />
          </td>
        )}
        <td className="px-4 py-2 text-right">
          <div className="flex gap-2 justify-end">
            <Button variant="primary" size="sm" onClick={handleSave}>{t.save}</Button>
            <Button variant="secondary" size="sm" onClick={handleCancel}>{t.cancel}</Button>
          </div>
        </td>
      </tr>
    );
  }

  const isDisabled = Boolean(pair.disabled);

  return (
    <tr
      {...dragProps}
      onClick={handleRowClick}
      className={`group border-b border-gray-100 dark:border-gray-700 cursor-grab
        ${isDisabled ? 'opacity-40' : ''}
        ${isPartOfDrag ? 'opacity-50' : ''}
        ${isSelected
          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-2 border-l-indigo-500'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
        }
      `}
    >
      <td className="px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200">{pair.source}</td>
      <td className="px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200">{pair.target}</td>
      {showSection && (
        <td className="px-4 py-2.5">
          <SectionBadge name={subsections?.find((s) => s.id === pair.subsection_id)?.name} />
        </td>
      )}
      <td className="px-4 py-2.5 text-right">
        <div
          className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
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
