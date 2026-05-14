import type { StateCreator } from 'zustand';
import { dbSelect, dbExecute, dbTransaction } from '../../db/client';
import type { Section } from '../../types';

export interface SectionSlice {
  sections: Section[];
  fetchSections: (levelId: number) => Promise<void>;
  addSection: (data: Omit<Section, 'id' | 'created_at'>) => Promise<void>;
  updateSection: (id: number, data: Partial<Omit<Section, 'id' | 'created_at'>>) => Promise<void>;
  deleteSection: (id: number) => Promise<void>;
  reorderSections: (levelId: number, orderedIds: number[]) => Promise<void>;
  moveSection: (id: number, newLevelId: number) => Promise<void>;
}

export const createSectionSlice: StateCreator<any, [], [], SectionSlice> = (set, get) => ({
  sections: [],

  fetchSections: async (levelId) => {
    try {
      const sections = await dbSelect<Section>(
        'SELECT * FROM sections WHERE level_id = ? ORDER BY position, name',
        [levelId]
      );
      set((state: any) => ({
        sections: [
          ...state.sections.filter((s: Section) => s.level_id !== levelId),
          ...sections,
        ],
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  addSection: async (data) => {
    await dbExecute(
      'INSERT INTO sections (level_id, name, position) VALUES (?, ?, ?)',
      [data.level_id, data.name, data.position]
    );
    await get().fetchSections(data.level_id);
  },

  updateSection: async (id, data) => {
    const section = get().sections.find((s: Section) => s.id === id);
    if (!section) return;
    await dbExecute(
      'UPDATE sections SET name = ?, position = ? WHERE id = ?',
      [data.name ?? section.name, data.position ?? section.position, id]
    );
    await get().fetchSections(section.level_id);
  },

  reorderSections: async (levelId, orderedIds) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await dbExecute('UPDATE sections SET position = ? WHERE id = ?', [i, orderedIds[i]]);
    }
    await get().fetchSections(levelId);
  },

  moveSection: async (id, newLevelId) => {
    const section = get().sections.find((s: Section) => s.id === id);
    if (!section) return;
    const oldLevelId = section.level_id;

    await dbTransaction(async () => {
      const [{ newPos }] = await dbSelect<{ newPos: number }>(
        'SELECT COALESCE(MAX(position), -1) + 1 AS newPos FROM sections WHERE level_id = ?',
        [newLevelId]
      );
      await dbExecute('UPDATE sections SET level_id = ?, position = ? WHERE id = ?', [newLevelId, newPos, id]);
      await dbExecute('UPDATE word_pairs SET level_id = ? WHERE section_id = ?', [newLevelId, id]);
    });

    await get().fetchSections(oldLevelId);
    await get().fetchSections(newLevelId);
    await get().fetchWordPairs(newLevelId);
  },

  deleteSection: async (id) => {
    const section = get().sections.find((s: Section) => s.id === id);
    if (!section) return;
    await dbExecute('DELETE FROM sections WHERE id = ?', [id]);
    set((state: any) => ({ sections: state.sections.filter((s: Section) => s.id !== id) }));
    await get().fetchWordPairs(section.level_id);
  },
});
