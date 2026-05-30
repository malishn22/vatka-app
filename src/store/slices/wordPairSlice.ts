import type { StateCreator } from 'zustand';
import { dbSelect, dbExecute } from '../../db/client';
import { toBool, fromBool } from '../../utils/dbMapper';
import type { WordPair } from '../../types';

export interface WordPairSlice {
  wordPairs: WordPair[];
  allLanguageWordPairs: WordPair[];
  allLanguageWordPairsLoadedFor: number | null;
  fetchWordPairs: (sectionId: number) => Promise<void>;
  fetchWordPairsForLanguage: (languageId: number) => Promise<void>;
  addWordPair: (data: Omit<WordPair, 'id' | 'created_at'>) => Promise<void>;
  updateWordPair: (id: number, data: Partial<Omit<WordPair, 'id' | 'created_at'>>) => Promise<void>;
  deleteWordPair: (id: number) => Promise<void>;
  wordPairExistsInLanguage: (languageId: number, source: string, target: string) => Promise<boolean>;
}

export const createWordPairSlice: StateCreator<any, [], [], WordPairSlice> = (set, get) => ({
  wordPairs: [],
  allLanguageWordPairs: [],
  allLanguageWordPairsLoadedFor: null,

  fetchWordPairsForLanguage: async (languageId) => {
    try {
      const rows = await dbSelect<WordPair & { disabled: number | boolean }>(
        `SELECT wp.* FROM word_pairs wp
         JOIN sections s ON wp.section_id = s.id
         WHERE s.language_id = ?
         ORDER BY wp.id`,
        [languageId]
      );
      const allLanguageWordPairs = rows.map((r) => ({
        ...r,
        disabled: toBool(r.disabled),
        subsection_id: r.subsection_id ?? null,
      }));
      set({ allLanguageWordPairs, allLanguageWordPairsLoadedFor: languageId });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchWordPairs: async (sectionId) => {
    set({ isLoading: true, error: null });
    try {
      const rows = await dbSelect<WordPair & { disabled: number | boolean }>(
        'SELECT * FROM word_pairs WHERE section_id = ? ORDER BY id',
        [sectionId]
      );
      const wordPairs = rows.map((r) => ({ ...r, disabled: toBool(r.disabled), subsection_id: r.subsection_id ?? null }));
      set({ wordPairs, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addWordPair: async (data) => {
    await dbExecute(
      'INSERT INTO word_pairs (section_id, subsection_id, source, target, disabled) VALUES (?, ?, ?, ?, ?)',
      [data.section_id, data.subsection_id ?? null, data.source, data.target, fromBool(data.disabled ?? false)]
    );
    set({ allLanguageWordPairsLoadedFor: null });
    await get().fetchWordPairs(data.section_id);
  },

  updateWordPair: async (id, data) => {
    try {
      const rows = await dbSelect<WordPair & { disabled: number | boolean }>(
        'SELECT * FROM word_pairs WHERE id = ?', [id]
      );
      if (!rows[0]) return;
      const pair = { ...rows[0], disabled: toBool(rows[0].disabled) };
      const disabled = fromBool(data.disabled !== undefined ? data.disabled : (pair.disabled ?? false));
      const newLevelId = data.section_id ?? pair.section_id;
      const newSubsectionId = 'subsection_id' in data ? data.subsection_id : pair.subsection_id;
      await dbExecute(
        'UPDATE word_pairs SET source = ?, target = ?, disabled = ?, section_id = ?, subsection_id = ? WHERE id = ?',
        [data.source ?? pair.source, data.target ?? pair.target, disabled, newLevelId, newSubsectionId, id]
      );
      set({ allLanguageWordPairsLoadedFor: null });
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
      allLanguageWordPairsLoadedFor: null,
    }));
  },

  wordPairExistsInLanguage: async (languageId, source, target) => {
    try {
      const rows = await dbSelect<{ found: number }>(
        `SELECT 1 AS found FROM word_pairs wp
         JOIN sections l ON wp.section_id = l.id
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
