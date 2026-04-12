import { useState, useRef } from 'react';
import type React from 'react';

type DropMode = 'content' | 'reorder';

interface DropAcceptor {
  canAccept: boolean;
  mode: DropMode;
  onDrop: (position: 'above' | 'below' | null) => void | Promise<void>;
}

interface UseDropTargetOptions {
  acceptors: DropAcceptor[];
  showDashedHint?: boolean;
}

export function useDropTarget({ acceptors, showDashedHint = false }: UseDropTargetOptions) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);

  const acceptorsRef = useRef(acceptors);
  acceptorsRef.current = acceptors;

  const findAcceptor = () => acceptorsRef.current.find((a) => a.canAccept);

  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      const acceptor = findAcceptor();
      if (!acceptor) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (acceptor.mode === 'content') {
        setIsDragOver(true);
      } else {
        const rect = e.currentTarget.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        setDropPosition(e.clientY < mid ? 'above' : 'below');
      }
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDragOver(false);
        setDropPosition(null);
      }
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const pos = dropPosition;
      setDropPosition(null);
      const acceptor = findAcceptor();
      if (acceptor) acceptor.onDrop(pos);
    },
  };

  const parts: string[] = [];
  if (isDragOver) parts.push('ring-2 ring-inset ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/40');
  if (showDashedHint && !isDragOver) parts.push('border border-dashed border-indigo-300 dark:border-indigo-600');
  if (dropPosition === 'above') parts.push('border-t-2 border-t-indigo-500');
  if (dropPosition === 'below') parts.push('border-b-2 border-b-indigo-500');

  return { dropProps, dropTargetClass: parts.join(' ') };
}
