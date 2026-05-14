import { create } from 'zustand';
import { createLanguageSlice, type LanguageSlice } from './slices/languageSlice';
import { createSectionSlice, type SectionSlice } from './slices/sectionSlice';
import { createSubsectionSlice, type SubsectionSlice } from './slices/subsectionSlice';
import { createWordPairSlice, type WordPairSlice } from './slices/wordPairSlice';
import { createVerbSlice, type VerbSlice } from './slices/verbSlice';

interface SharedState {
  isLoading: boolean;
  error: string | null;
}

export type DataStore = SharedState & LanguageSlice & SectionSlice & SubsectionSlice & WordPairSlice & VerbSlice;

export const useDataStore = create<DataStore>()((...a) => ({
  isLoading: false,
  error: null,
  ...createLanguageSlice(...a),
  ...createSectionSlice(...a),
  ...createSubsectionSlice(...a),
  ...createWordPairSlice(...a),
  ...createVerbSlice(...a),
}));
