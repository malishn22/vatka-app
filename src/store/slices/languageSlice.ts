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
    set((state: any) => {
      const deletedSectionIds = new Set(state.sections.filter((s: any) => s.language_id === id).map((s: any) => s.id));
      return {
        languages: state.languages.filter((l: Language) => l.id !== id),
        sections: state.sections.filter((s: any) => s.language_id !== id),
        subsections: state.subsections.filter((s: any) => !deletedSectionIds.has(s.section_id)),
        wordPairs: state.wordPairs.filter((wp: any) => !deletedSectionIds.has(wp.section_id)),
        verbs: state.verbs.filter((v: any) => !deletedSectionIds.has(v.section_id)),
      };
    });
  },
});
