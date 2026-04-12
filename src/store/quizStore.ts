import { create } from 'zustand';
import { fisherYates } from '../utils/shuffle';
import type { WordPair } from '../types';
import type { QuizDirection } from './uiStore';

export interface QuizOption {
  id: number;
  text: string;
  isCorrect: boolean;
}

interface QuizState {
  allPairs: WordPair[];
  remaining: WordPair[];
  currentPair: WordPair | null;
  questionText: string;
  options: QuizOption[];
  selectedOptionId: number | null;
  score: number;
  totalAnswered: number;
  gameComplete: boolean;

  initQuiz: (pairs: WordPair[], optionCount: number, direction: QuizDirection) => void;
  selectAnswer: (id: number) => void;
  nextQuestion: () => void;
  resetQuiz: () => void;
}

type ResolvedDirection = 'sourceToTarget' | 'targetToSource';

function resolveDirection(direction: QuizDirection): ResolvedDirection {
  if (direction === 'random') {
    return Math.random() < 0.5 ? 'sourceToTarget' : 'targetToSource';
  }
  return direction;
}

function generateOptions(
  correctPair: WordPair,
  allPairs: WordPair[],
  count: number,
  dir: ResolvedDirection,
): QuizOption[] {
  const field = dir === 'sourceToTarget' ? 'target' : 'source';

  const distractors = fisherYates(
    allPairs.filter((p) => p.id !== correctPair.id)
  ).slice(0, count - 1);

  const options: QuizOption[] = [
    { id: correctPair.id, text: correctPair[field], isCorrect: true },
    ...distractors.map((p) => ({ id: p.id, text: p[field], isCorrect: false })),
  ];

  return fisherYates(options);
}

let optionCount = 4;
let quizDirection: QuizDirection = 'sourceToTarget';

export const useQuizStore = create<QuizState>((set, get) => ({
  allPairs: [],
  remaining: [],
  currentPair: null,
  questionText: '',
  options: [],
  selectedOptionId: null,
  score: 0,
  totalAnswered: 0,
  gameComplete: false,

  initQuiz: (pairs, count, direction) => {
    optionCount = count;
    quizDirection = direction;
    const shuffled = fisherYates([...pairs]);
    const [first, ...rest] = shuffled;
    const dir = resolveDirection(direction);
    const questionField = dir === 'sourceToTarget' ? 'source' : 'target';
    set({
      allPairs: shuffled,
      remaining: rest,
      currentPair: first,
      questionText: first[questionField],
      options: generateOptions(first, shuffled, count, dir),
      selectedOptionId: null,
      score: 0,
      totalAnswered: 0,
      gameComplete: false,
    });
  },

  selectAnswer: (id) => {
    const { selectedOptionId, options, score, totalAnswered } = get();
    if (selectedOptionId !== null) return;
    const chosen = options.find((o) => o.id === id);
    set({
      selectedOptionId: id,
      score: chosen?.isCorrect ? score + 1 : score,
      totalAnswered: totalAnswered + 1,
    });
  },

  nextQuestion: () => {
    const { remaining, allPairs } = get();
    if (remaining.length === 0) {
      set({ gameComplete: true });
      return;
    }
    const [next, ...rest] = remaining;
    const dir = resolveDirection(quizDirection);
    const questionField = dir === 'sourceToTarget' ? 'source' : 'target';
    set({
      remaining: rest,
      currentPair: next,
      questionText: next[questionField],
      options: generateOptions(next, allPairs, optionCount, dir),
      selectedOptionId: null,
    });
  },

  resetQuiz: () =>
    set({
      allPairs: [],
      remaining: [],
      currentPair: null,
      questionText: '',
      options: [],
      selectedOptionId: null,
      score: 0,
      totalAnswered: 0,
      gameComplete: false,
    }),
}));
