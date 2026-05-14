import type { StateCreator } from 'zustand';
import { dbSelect, dbExecute } from '../../db/client';
import { toBool, fromBool } from '../../utils/dbMapper';
import type { WordPair } from '../../types';

export interface WordPairSlice {
  wordPairs: WordPair[];
  fetchWordPairs: (levelId: number) => Promise<void>;
  addWordPair: (data: Omit<WordPair, 'id' | 'created_at'>) => Promise<void>;
  updateWordPair: (id: number, data: Partial<Omit<WordPair, 'id' | 'created_at'>>) => Promise<void>;
  deleteWordPair: (id: number) => Promise<void>;
  wordPairExistsInLanguage: (languageId: number, source: string, target: string) => Promise<boolean>;
}

export const createWordPairSlice: StateCreator<any, [], [], WordPairSlice> = (set, get) => ({
  wordPairs: [],

  fetchWordPairs: async (levelId) => {
    set({ isLoading: true, error: null });
    try {
      const rows = await dbSelect<WordPair & { disabled: number | boolean }>(
        'SELECT * FROM word_pairs WHERE level_id = ? ORDER BY id',
        [levelId]
      );
      const wordPairs = rows.map((r) => ({ ...r, disabled: toBool(r.disabled), section_id: r.section_id ?? null }));
      set({ wordPairs, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addWordPair: async (data) => {
    await dbExecute(
      'INSERT INTO word_pairs (level_id, section_id, source, target, disabled) VALUES (?, ?, ?, ?, ?)',
      [data.level_id, data.section_id ?? null, data.source, data.target, fromBool(data.disabled ?? false)]
    );
    await get().fetchWordPairs(data.level_id);
  },

  updateWordPair: async (id, data) => {
    try {
      const rows = await dbSelect<WordPair & { disabled: number | boolean }>(
        'SELECT * FROM word_pairs WHERE id = ?', [id]
      );
      if (!rows[0]) return;
      const pair = { ...rows[0], disabled: toBool(rows[0].disabled) };
      const disabled = fromBool(data.disabled !== undefined ? data.disabled : (pair.disabled ?? false));
      const newLevelId = data.level_id ?? pair.level_id;
      const newSectionId = 'section_id' in data ? data.section_id : pair.section_id;
      await dbExecute(
        'UPDATE word_pairs SET source = ?, target = ?, disabled = ?, level_id = ?, section_id = ? WHERE id = ?',
        [data.source ?? pair.source, data.target ?? pair.target, disabled, newLevelId, newSectionId, id]
      );
      await get().fetchWordPairs(newLevelId);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  deleteWordPair: async (id) => {
    const pair = get().wordPairs.find((p: WordPair) => p.id === id);
    if (!pair) return;
    await dbExecute('DELETE FROM word_pairs WHERE id = ?', [id]);
    set((state: any) => ({
      wordPairs: state.wordPairs.filter((p: WordPair) => p.id !== id),
    }));
  },

  wordPairExistsInLanguage: async (languageId, source, target) => {
    try {
      const rows = await dbSelect<{ found: number }>(
        `SELECT 1 AS found FROM word_pairs wp
         JOIN levels l ON wp.level_id = l.id
         WHERE l.language_id = ?
           AND LOWER(TRIM(wp.source)) = LOWER(TRIM(?))
           AND LOWER(TRIM(wp.target)) = LOWER(TRIM(?))
         LIMIT 1`,
        [languageId, source, target]
      );
      return rows.length > 0;
    } catch {
      return false;
    }
  },
});
