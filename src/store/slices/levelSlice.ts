import type { StateCreator } from 'zustand';
import { dbSelect, dbExecute } from '../../db/client';
import type { Level } from '../../types';

export interface LevelSlice {
  levels: Level[];
  fetchLevels: (languageId: number) => Promise<void>;
  addLevel: (data: Omit<Level, 'id' | 'created_at'>) => Promise<void>;
  updateLevel: (id: number, data: Partial<Omit<Level, 'id' | 'created_at'>>) => Promise<void>;
  deleteLevel: (id: number) => Promise<void>;
  reorderLevels: (languageId: number, orderedIds: number[]) => Promise<void>;
}

export const createLevelSlice: StateCreator<any, [], [], LevelSlice> = (set, get) => ({
  levels: [],

  fetchLevels: async (languageId) => {
    set({ isLoading: true, error: null });
    try {
      const levels = await dbSelect<Level>(
        'SELECT * FROM levels WHERE language_id = ? ORDER BY position, name',
        [languageId]
      );
      set({ levels, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addLevel: async (data) => {
    await dbExecute(
      'INSERT INTO levels (language_id, name, position) VALUES (?, ?, ?)',
      [data.language_id, data.name, data.position]
    );
    await get().fetchLevels(data.language_id);
  },

  updateLevel: async (id, data) => {
    const level = get().levels.find((l: Level) => l.id === id);
    if (!level) return;
    await dbExecute(
      'UPDATE levels SET name = ?, position = ? WHERE id = ?',
      [data.name ?? level.name, data.position ?? level.position, id]
    );
    await get().fetchLevels(level.language_id);
  },

  deleteLevel: async (id) => {
    const level = get().levels.find((l: Level) => l.id === id);
    if (!level) return;
    await dbExecute('DELETE FROM levels WHERE id = ?', [id]);
    set((state: any) => ({
      levels: state.levels.filter((l: Level) => l.id !== id),
      sections: state.sections.filter((s: any) => s.level_id !== id),
      wordPairs: state.wordPairs.filter((wp: any) => wp.level_id !== id),
      verbs: state.verbs.filter((v: any) => v.level_id !== id),
    }));
    await get().fetchLevels(level.language_id);
  },

  reorderLevels: async (languageId, orderedIds) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await dbExecute('UPDATE levels SET position = ? WHERE id = ?', [i, orderedIds[i]]);
    }
    await get().fetchLevels(languageId);
  },
});
