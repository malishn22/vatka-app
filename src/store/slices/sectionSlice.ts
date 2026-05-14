import type { StateCreator } from 'zustand';
import { dbSelect, dbExecute } from '../../db/client';
import type { Section } from '../../types';

export interface SectionSlice {
  sections: Section[];
  fetchSections: (languageId: number) => Promise<void>;
  addSection: (data: Omit<Section, 'id' | 'created_at'>) => Promise<void>;
  updateSection: (id: number, data: Partial<Omit<Section, 'id' | 'created_at'>>) => Promise<void>;
  deleteSection: (id: number) => Promise<void>;
  reorderSections: (languageId: number, orderedIds: number[]) => Promise<void>;
}

export const createSectionSlice: StateCreator<any, [], [], SectionSlice> = (set, get) => ({
  sections: [],

  fetchSections: async (languageId) => {
    set({ isLoading: true, error: null });
    try {
      const sections = await dbSelect<Section>(
        'SELECT * FROM sections WHERE language_id = ? ORDER BY position, name',
        [languageId]
      );
      set({ sections, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addSection: async (data) => {
    await dbExecute(
      'INSERT INTO sections (language_id, name, position) VALUES (?, ?, ?)',
      [data.language_id, data.name, data.position]
    );
    await get().fetchSections(data.language_id);
  },

  updateSection: async (id, data) => {
    const section = get().sections.find((l: Section) => l.id === id);
    if (!section) return;
    await dbExecute(
      'UPDATE sections SET name = ?, position = ? WHERE id = ?',
      [data.name ?? section.name, data.position ?? section.position, id]
    );
    await get().fetchSections(section.language_id);
  },

  deleteSection: async (id) => {
    const section = get().sections.find((l: Section) => l.id === id);
    if (!section) return;
    await dbExecute('DELETE FROM sections WHERE id = ?', [id]);
    set((state: any) => ({
      sections: state.sections.filter((l: Section) => l.id !== id),
      subsections: state.subsections.filter((s: any) => s.section_id !== id),
      wordPairs: state.wordPairs.filter((wp: any) => wp.section_id !== id),
      verbs: state.verbs.filter((v: any) => v.section_id !== id),
    }));
    await get().fetchSections(section.language_id);
  },

  reorderSections: async (languageId, orderedIds) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await dbExecute('UPDATE sections SET position = ? WHERE id = ?', [i, orderedIds[i]]);
    }
    await get().fetchSections(languageId);
  },
});
