import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lang } from '../i18n/translations';

export type View = 'languages' | 'wordpairs' | 'play' | 'settings';
export type GameMode = 'match' | 'quiz';
export type QuizDirection = 'sourceToTarget' | 'targetToSource' | 'random';

interface UIState {
  currentView: View;
  selectedLanguageId: number | null;
  selectedLevelId: number | null;
  selectedSectionId: number | null;
  isDark: boolean;
  lang: Lang;
  favoriteLanguages: string[];
  pairsPerRound: number;
  gameMode: GameMode;
  quizOptionCount: number;
  quizDirection: QuizDirection;
  setView: (view: View) => void;
  setSelectedLanguage: (id: number | null) => void;
  setSelectedLevel: (id: number | null) => void;
  setSelectedSection: (id: number | null) => void;
  toggleDark: () => void;
  setLang: (lang: Lang) => void;
  toggleFavoriteLanguage: (lang: string) => void;
  setPairsPerRound: (n: number) => void;
  setGameMode: (mode: GameMode) => void;
  setQuizOptionCount: (n: number) => void;
  setQuizDirection: (dir: QuizDirection) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      currentView: 'languages',
      selectedLanguageId: null,
      selectedLevelId: null,
      selectedSectionId: null,
      isDark: true,
      lang: 'en',
      favoriteLanguages: [],
      pairsPerRound: 5,
      gameMode: 'match',
      quizOptionCount: 4,
      quizDirection: 'sourceToTarget',
      setView: (view) => set({ currentView: view }),
      setSelectedLanguage: (id) => set({ selectedLanguageId: id, selectedLevelId: null, selectedSectionId: null, currentView: id ? 'wordpairs' : 'languages' }),
      setSelectedLevel: (id) => set({ selectedLevelId: id, selectedSectionId: null, currentView: id ? 'wordpairs' : 'languages' }),
      setSelectedSection: (id) => set({ selectedSectionId: id }),
      toggleDark: () => set((state) => {
        const next = !state.isDark;
        document.documentElement.classList.toggle('dark', next);
        return { isDark: next };
      }),
      setLang: (lang) => set({ lang }),
      toggleFavoriteLanguage: (lang) => {
        const { favoriteLanguages } = get();
        if (favoriteLanguages.includes(lang)) {
          set({ favoriteLanguages: favoriteLanguages.filter((l) => l !== lang) });
        } else {
          set({ favoriteLanguages: [...favoriteLanguages, lang] });
        }
      },
      setPairsPerRound: (n) => set({ pairsPerRound: n }),
      setGameMode: (mode) => set({ gameMode: mode }),
      setQuizOptionCount: (n) => set({ quizOptionCount: n }),
      setQuizDirection: (dir) => set({ quizDirection: dir }),
    }),
    {
      name: 'ui-prefs',
      partialize: (state) => ({ isDark: state.isDark, lang: state.lang, favoriteLanguages: state.favoriteLanguages, pairsPerRound: state.pairsPerRound, quizOptionCount: state.quizOptionCount, quizDirection: state.quizDirection }),
    }
  )
);

// Apply persisted dark mode on startup
document.documentElement.classList.toggle('dark', useUIStore.getState().isDark);
