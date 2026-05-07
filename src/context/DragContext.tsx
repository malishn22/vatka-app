import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface DragContextValue {
  draggingPairId: number | null;
  setDraggingPairId: (id: number | null) => void;
  draggingVerbId: number | null;
  setDraggingVerbId: (id: number | null) => void;
  draggingSectionId: number | null;
  setDraggingSectionId: (id: number | null) => void;
  draggingLevelId: number | null;
  setDraggingLevelId: (id: number | null) => void;
}

const DragContext = createContext<DragContextValue>({
  draggingPairId: null,
  setDraggingPairId: () => {},
  draggingVerbId: null,
  setDraggingVerbId: () => {},
  draggingSectionId: null,
  setDraggingSectionId: () => {},
  draggingLevelId: null,
  setDraggingLevelId: () => {},
});

export function DragProvider({ children }: { children: ReactNode }) {
  const [draggingPairId, setDraggingPairId] = useState<number | null>(null);
  const [draggingVerbId, setDraggingVerbId] = useState<number | null>(null);
  const [draggingSectionId, setDraggingSectionId] = useState<number | null>(null);
  const [draggingLevelId, setDraggingLevelId] = useState<number | null>(null);
  return (
    <DragContext.Provider value={{ draggingPairId, setDraggingPairId, draggingVerbId, setDraggingVerbId, draggingSectionId, setDraggingSectionId, draggingLevelId, setDraggingLevelId }}>
      {children}
    </DragContext.Provider>
  );
}

export function useDragContext() {
  return useContext(DragContext);
}
