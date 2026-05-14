import { create } from 'zustand';
import { fisherYates } from '../utils/shuffle';
import type { VerbWithConjugations } from '../types';
import type { ConjugationMode } from './uiStore';

export interface ConjugationQuestion {
  verbInfinitive: string;
  form_type: string;
  person: string;
  correctForm: string;
  verbId: number;
  conjugationId: number;
}

export interface ConjugationOption {
  id: number;
  text: string;
  isCorrect: boolean;
}

interface ConjugationPlayState {
  mode: ConjugationMode;
  allQuestions: ConjugationQuestion[];
  remaining: ConjugationQuestion[];
  currentQuestion: ConjugationQuestion | null;
  options: ConjugationOption[];
  selectedOptionId: number | null;
  typedAnswer: string;
  answerSubmitted: boolean;
  answerCorrect: boolean | null;
  score: number;
  totalAnswered: number;
  gameComplete: boolean;

  initConjugationPlay: (verbs: VerbWithConjugations[], mode: ConjugationMode, optionCount: number) => void;
  selectAnswer: (id: number) => void;
  submitTypedAnswer: () => void;
  setTypedAnswer: (answer: string) => void;
  nextQuestion: () => void;
  resetConjugationPlay: () => void;
}

let optionCount = 4;

function generateOptions(
  correct: ConjugationQuestion,
  allQuestions: ConjugationQuestion[],
  count: number
): ConjugationOption[] {
  const distractors = fisherYates(
    allQuestions.filter((q) => q.conjugationId !== correct.conjugationId)
  ).slice(0, count - 1);

  const options: ConjugationOption[] = [
    { id: correct.conjugationId, text: correct.correctForm, isCorrect: true },
    ...distractors.map((q) => ({ id: q.conjugationId, text: q.correctForm, isCorrect: false })),
  ];

  return fisherYates(options);
}

export const useConjugationPlayStore = create<ConjugationPlayState>((set, get) => ({
  mode: 'choice',
  allQuestions: [],
  remaining: [],
  currentQuestion: null,
  options: [],
  selectedOptionId: null,
  typedAnswer: '',
  answerSubmitted: false,
  answerCorrect: null,
  score: 0,
  totalAnswered: 0,
  gameComplete: false,

  initConjugationPlay: (verbs, mode, count) => {
    optionCount = count;
    const questions: ConjugationQuestion[] = verbs.flatMap((v) =>
      v.conjugations.map((c) => ({
        verbInfinitive: v.infinitive_target,
        form_type: c.form_type,
        person: c.person,
        correctForm: c.form,
        verbId: v.id,
        conjugationId: c.id,
      }))
    );

    const shuffled = fisherYates(questions);
    const [first, ...rest] = shuffled;

    set({
      mode,
      allQuestions: shuffled,
      remaining: rest,
      currentQuestion: first ?? null,
      options: first && mode === 'choice' ? generateOptions(first, shuffled, count) : [],
      selectedOptionId: null,
      typedAnswer: '',
      answerSubmitted: false,
      answerCorrect: null,
      score: 0,
      totalAnswered: 0,
      gameComplete: shuffled.length === 0,
    });
  },

  selectAnswer: (id) => {
    const { selectedOptionId, options, score, totalAnswered } = get();
    if (selectedOptionId !== null) return;
    const chosen = options.find((o) => o.id === id);
    set({
      selectedOptionId: id,
      answerSubmitted: true,
      answerCorrect: chosen?.isCorrect ?? false,
      score: chosen?.isCorrect ? score + 1 : score,
      totalAnswered: totalAnswered + 1,
    });
  },

  setTypedAnswer: (answer) => set({ typedAnswer: answer }),

  submitTypedAnswer: () => {
    const { currentQuestion, typedAnswer, answerSubmitted, score, totalAnswered } = get();
    if (answerSubmitted || !currentQuestion) return;
    const isCorrect = typedAnswer.trim().toLowerCase() === currentQuestion.correctForm.trim().toLowerCase();
    set({
      answerSubmitted: true,
      answerCorrect: isCorrect,
      score: isCorrect ? score + 1 : score,
      totalAnswered: totalAnswered + 1,
    });
  },

  nextQuestion: () => {
    const { remaining, allQuestions, mode } = get();
    if (remaining.length === 0) {
      set({ gameComplete: true });
      return;
    }
    const [next, ...rest] = remaining;
    set({
      remaining: rest,
      currentQuestion: next,
      options: mode === 'choice' ? generateOptions(next, allQuestions, optionCount) : [],
      selectedOptionId: null,
      typedAnswer: '',
      answerSubmitted: false,
      answerCorrect: null,
    });
  },

  resetConjugationPlay: () =>
    set({
      mode: 'choice',
      allQuestions: [],
      remaining: [],
      currentQuestion: null,
      options: [],
      selectedOptionId: null,
      typedAnswer: '',
      answerSubmitted: false,
      answerCorrect: null,
      score: 0,
      totalAnswered: 0,
      gameComplete: false,
    }),
}));
