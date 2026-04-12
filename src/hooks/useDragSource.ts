import type React from 'react';

interface UseDragSourceOptions {
  id: number;
  setDraggingId: (id: number | null) => void;
  isDragging: boolean;
}

export function useDragSource({ id, setDraggingId, isDragging }: UseDragSourceOptions) {
  return {
    dragProps: {
      draggable: true as const,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(id));
        setDraggingId(id);
      },
      onDragEnd: () => setDraggingId(null),
    },
    dragSourceClass: isDragging ? 'opacity-50' : '',
  };
}
