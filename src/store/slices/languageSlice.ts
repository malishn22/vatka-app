import type { StateCreator } from 'zustand';
import { dbSelect, dbExecute } from '../../db/client';
import type { Language } from '../../types';

export interface LanguageSlice {
  languages: Language[];
  fetchLanguages: () => Promise<void>;
  addLanguage: (data: Omit<Language, 'id' | 'created_at'>) => Promise<void>;
  updateLanguage: (id: number, data: Partial<Omit<Language, 'id' | 'created_at'>>) => Promise<void>;
  deleteLanguage: (id: number) => Promise<void>;
}

export const createLanguageSlice: StateCreator<any, [], [], LanguageSlice> = (set, get) => ({
  languages: [],

  fetchLanguages: async () => {
    set({ isLoading: true, error: null });
    try {
      const languages = await dbSelect<Language>('SELECT * FROM languages ORDER BY name');
      set({ languages, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addLanguage: async (data) => {
    await dbExecute(
      'INSERT INTO languages (name, source, target) VALUES (?, ?, ?)',
      [data.name, data.source, data.target]
    );
    await get().fetchLanguages();
  },

  updateLanguage: async (id, data) => {
    await dbExecute(
      'UPDATE languages SET name = ?, source = ?, target = ? WHERE id = ?',
      [data.name, data.source, data.target, id]
    );
    await get().fetchLanguages();
  },

  deleteLanguage: async (id) => {
    await dbExecute('DELETE FROM languages WHERE id = ?', [id]);
    set((state: any) => ({
      languages: state.languages.filter((l: Language) => l.id !== id),
      levels: state.levels.filter((l: any) => l.language_id !== id),
      sections: state.sections.filter((s: any) =>
        !state.levels.filter((l: any) => l.language_id === id).find((l: any) => l.id === s.level_id)
      ),
      wordPairs: state.wordPairs.filter(
        (wp: any) => !state.levels.filter((l: any) => l.language_id === id).find((l: any) => l.id === wp.level_id)
      ),
    }));
  },
});
