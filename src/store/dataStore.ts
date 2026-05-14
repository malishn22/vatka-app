import { create } from 'zustand';
import { createLanguageSlice, type LanguageSlice } from './slices/languageSlice';
import { createLevelSlice, type LevelSlice } from './slices/levelSlice';
import { createSectionSlice, type SectionSlice } from './slices/sectionSlice';
import { createWordPairSlice, type WordPairSlice } from './slices/wordPairSlice';
import { createVerbSlice, type VerbSlice } from './slices/verbSlice';

interface SharedState {
  isLoading: boolean;
  error: string | null;
}

export type DataStore = SharedState & LanguageSlice & LevelSlice & SectionSlice & WordPairSlice & VerbSlice;

export const useDataStore = create<DataStore>()((...a) => ({
  isLoading: false,
  error: null,
  ...createLanguageSlice(...a),
  ...createLevelSlice(...a),
  ...createSectionSlice(...a),
  ...createWordPairSlice(...a),
  ...createVerbSlice(...a),
}));
