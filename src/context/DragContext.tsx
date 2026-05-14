import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface DragContextValue {
  draggingPairIds: number[];
  setDraggingPairIds: (ids: number[]) => void;
  draggingVerbIds: number[];
  setDraggingVerbIds: (ids: number[]) => void;
  draggingSubsectionId: number | null;
  setDraggingSubsectionId: (id: number | null) => void;
  draggingSectionId: number | null;
  setDraggingSectionId: (id: number | null) => void;
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
  draggingSubsectionId: null,
  setDraggingSubsectionId: () => {},
  draggingSectionId: null,
  setDraggingSectionId: () => {},
  selectedPairIds: [],
  setSelectedPairIds: () => {},
  selectedVerbIds: [],
  setSelectedVerbIds: () => {},
});

export function DragProvider({ children }: { children: ReactNode }) {
  const [draggingPairIds, setDraggingPairIds] = useState<number[]>([]);
  const [draggingVerbIds, setDraggingVerbIds] = useState<number[]>([]);
  const [draggingSubsectionId, setDraggingSubsectionId] = useState<number | null>(null);
  const [draggingSectionId, setDraggingSectionId] = useState<number | null>(null);
  const [selectedPairIds, setSelectedPairIds] = useState<number[]>([]);
  const [selectedVerbIds, setSelectedVerbIds] = useState<number[]>([]);
  return (
    <DragContext.Provider value={{
      draggingPairIds, setDraggingPairIds,
      draggingVerbIds, setDraggingVerbIds,
      draggingSubsectionId, setDraggingSubsectionId,
      draggingSectionId, setDraggingSectionId,
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
