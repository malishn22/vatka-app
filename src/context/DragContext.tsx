import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface DragContextValue {
  draggingPairIds: number[];
  setDraggingPairIds: (ids: number[]) => void;
  draggingVerbIds: number[];
  setDraggingVerbIds: (ids: number[]) => void;
  draggingSectionId: number | null;
  setDraggingSectionId: (id: number | null) => void;
  draggingLevelId: number | null;
  setDraggingLevelId: (id: number | null) => void;
  selectedPairIds: number[];
  setSelectedPairIds: (ids: number[]) => void;
  selectedVerbIds: number[];
  setSelectedVerbIds: (ids: number[]) => void;
}

const DragContext = createContext<DragContextValue>({
  draggingPairIds: [],
  setDraggingPairIds: () => {},
  draggingVerbIds: [],
  setDraggingVerbIds: () => {},
  draggingSectionId: null,
  setDraggingSectionId: () => {},
  draggingLevelId: null,
  setDraggingLevelId: () => {},
  selectedPairIds: [],
  setSelectedPairIds: () => {},
  selectedVerbIds: [],
  setSelectedVerbIds: () => {},
});

export function DragProvider({ children }: { children: ReactNode }) {
  const [draggingPairIds, setDraggingPairIds] = useState<number[]>([]);
  const [draggingVerbIds, setDraggingVerbIds] = useState<number[]>([]);
  const [draggingSectionId, setDraggingSectionId] = useState<number | null>(null);
  const [draggingLevelId, setDraggingLevelId] = useState<number | null>(null);
  const [selectedPairIds, setSelectedPairIds] = useState<number[]>([]);
  const [selectedVerbIds, setSelectedVerbIds] = useState<number[]>([]);
  return (
    <DragContext.Provider value={{
      draggingPairIds, setDraggingPairIds,
      draggingVerbIds, setDraggingVerbIds,
      draggingSectionId, setDraggingSectionId,
      draggingLevelId, setDraggingLevelId,
      selectedPairIds, setSelectedPairIds,
      selectedVerbIds, setSelectedVerbIds,
    }}>
      {children}
    </DragContext.Provider>
  );
}

export function useDragContext() {
  return useContext(DragContext);
}
