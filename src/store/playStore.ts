import { create } from 'zustand';
import { fisherYates } from '../utils/shuffle';
import type { WordPair } from '../types';
import { useUIStore } from './uiStore';

interface ShuffledTarget {
  id: number;
  text: string;
}

interface PlayState {
  allPairs: WordPair[];
  remaining: WordPair[];
  currentRound: WordPair[];
  shuffledTargets: ShuffledTarget[];
  matched: number[];
  selectedSource: number | null;
  selectedTarget: number | null;
  wrongPair: number | null;
  roundComplete: boolean;
  gameComplete: boolean;

  initGame: (pairs: WordPair[]) => void;
  selectSource: (id: number) => void;
  selectTarget: (id: number) => void;
  clearWrong: () => void;
  nextRound: () => void;
  resetGame: () => void;
}

function makeRound(pairs: WordPair[]) {
  return {
    currentRound: pairs,
    shuffledTargets: fisherYates(pairs.map((p) => ({ id: p.id, text: p.target }))),
    matched: [] as number[],
    selectedSource: null as number | null,
    selectedTarget: null as number | null,
    wrongPair: null as number | null,
    roundComplete: false,
  };
}

export const usePlayStore = create<PlayState>((set, get) => {
  function applyMatch(sourceId: number, targetId: number) {
    const { matched, currentRound } = get();
    if (sourceId === targetId) {
      const newMatched = [...matched, sourceId];
      const roundComplete = newMatched.length === currentRound.length;
      set({ matched: newMatched, selectedSource: null, selectedTarget: null, roundComplete });
    } else {
      set({ wrongPair: sourceId, selectedSource: null, selectedTarget: null });
    }
  }

  return {
    allPairs: [],
    remaining: [],
    currentRound: [],
    shuffledTargets: [],
    matched: [],
    selectedSource: null,
    selectedTarget: null,
    wrongPair: null,
    roundComplete: false,
    gameComplete: false,

    initGame: (pairs) => {
      const batchSize = useUIStore.getState().pairsPerRound;
      const shuffled = fisherYates([...pairs]);
      const batch = shuffled.slice(0, batchSize);
      const remaining = shuffled.slice(batchSize);
      set({ allPairs: shuffled, remaining, gameComplete: false, ...makeRound(batch) });
    },

    selectSource: (id) => {
      const { selectedTarget, matched } = get();
      if (matched.includes(id)) return;
      if (selectedTarget !== null) {
        applyMatch(id, selectedTarget);
      } else {
        set({ selectedSource: id });
      }
    },

    selectTarget: (id) => {
      const { selectedSource, matched } = get();
      if (matched.includes(id)) return;
      if (selectedSource !== null) {
        applyMatch(selectedSource, id);
      } else {
        set({ selectedTarget: id });
      }
    },

    clearWrong: () => set({ wrongPair: null }),

    nextRound: () => {
      const { remaining } = get();
      if (remaining.length === 0) {
        set({ gameComplete: true, roundComplete: false });
        return;
      }
      const batchSize = useUIStore.getState().pairsPerRound;
      const batch = remaining.slice(0, batchSize);
      set({ remaining: remaining.slice(batchSize), ...makeRound(batch) });
    },

    resetGame: () => set({
      allPairs: [], remaining: [], currentRound: [], shuffledTargets: [],
      matched: [], selectedSource: null, selectedTarget: null, wrongPair: null,
      roundComplete: false, gameComplete: false,
    }),
  };
});
