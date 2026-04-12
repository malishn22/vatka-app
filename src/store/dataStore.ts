import { create } from 'zustand';
import { dbSelect, dbExecute } from '../db/client';
import type { Language, Level, Section, WordPair } from '../types';

interface DataState {
  languages: Language[];
  sections: Section[];
  levels: Level[];
  wordPairs: WordPair[];
  isLoading: boolean;
  error: string | null;

  // Languages
  fetchLanguages: () => Promise<void>;
  addLanguage: (data: Omit<Language, 'id' | 'created_at'>) => Promise<void>;
  updateLanguage: (id: number, data: Partial<Omit<Language, 'id' | 'created_at'>>) => Promise<void>;
  deleteLanguage: (id: number) => Promise<void>;

  // Sections
  fetchSections: (levelId: number) => Promise<void>;
  addSection: (data: Omit<Section, 'id' | 'created_at'>) => Promise<void>;
  updateSection: (id: number, data: Partial<Omit<Section, 'id' | 'created_at'>>) => Promise<void>;
  deleteSection: (id: number) => Promise<void>;
  reorderSections: (levelId: number, orderedIds: number[]) => Promise<void>;
  moveSection: (id: number, newLevelId: number) => Promise<void>;

  // Levels
  fetchLevels: (languageId: number) => Promise<void>;
  addLevel: (data: Omit<Level, 'id' | 'created_at'>) => Promise<void>;
  updateLevel: (id: number, data: Partial<Omit<Level, 'id' | 'created_at'>>) => Promise<void>;
  deleteLevel: (id: number) => Promise<void>;
  reorderLevels: (languageId: number, orderedIds: number[]) => Promise<void>;

  // Word Pairs
  fetchWordPairs: (levelId: number) => Promise<void>;
  addWordPair: (data: Omit<WordPair, 'id' | 'created_at'>) => Promise<void>;
  updateWordPair: (id: number, data: Partial<Omit<WordPair, 'id' | 'created_at'>>) => Promise<void>;
  deleteWordPair: (id: number) => Promise<void>;
  wordPairExistsInLanguage: (languageId: number, source: string, target: string) => Promise<boolean>;
}

export const useDataStore = create<DataState>((set, get) => ({
  languages: [],
  sections: [],
  levels: [],
  wordPairs: [],
  isLoading: false,
  error: null,

  // --- Languages ---
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
    set((state) => ({
      languages: state.languages.filter((l) => l.id !== id),
      levels: state.levels.filter((l) => l.language_id !== id),
      sections: state.sections.filter((s) =>
        !state.levels.filter((l) => l.language_id === id).find((l) => l.id === s.level_id)
      ),
      wordPairs: state.wordPairs.filter(
        (wp) => !state.levels.filter((l) => l.language_id === id).find((l) => l.id === wp.level_id)
      ),
    }));
  },

  // --- Sections ---
  fetchSections: async (levelId) => {
    try {
      const sections = await dbSelect<Section>(
        'SELECT * FROM sections WHERE level_id = ? ORDER BY position, name',
        [levelId]
      );
      // Merge: replace sections for this level, keep sections for other levels
      set((state) => ({
        sections: [
          ...state.sections.filter((s) => s.level_id !== levelId),
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
    const section = get().sections.find((s) => s.id === id);
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
    const section = get().sections.find((s) => s.id === id);
    if (!section) return;
    const oldLevelId = section.level_id;
    const newPosition = get().sections.filter((s) => s.level_id === newLevelId).length;
    await dbExecute('UPDATE sections SET level_id = ?, position = ? WHERE id = ?', [newLevelId, newPosition, id]);
    await get().fetchSections(oldLevelId);
    await get().fetchSections(newLevelId);
  },

  deleteSection: async (id) => {
    const section = get().sections.find((s) => s.id === id);
    if (!section) return;
    await dbExecute('DELETE FROM sections WHERE id = ?', [id]);
    set((state) => ({ sections: state.sections.filter((s) => s.id !== id) }));
    // Re-fetch word pairs so section_id becomes null on affected pairs
    await get().fetchWordPairs(section.level_id);
  },

  // --- Levels ---
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
    const level = get().levels.find((l) => l.id === id);
    if (!level) return;
    await dbExecute(
      'UPDATE levels SET name = ?, position = ? WHERE id = ?',
      [data.name ?? level.name, data.position ?? level.position, id]
    );
    await get().fetchLevels(level.language_id);
  },

  deleteLevel: async (id) => {
    const level = get().levels.find((l) => l.id === id);
    if (!level) return;
    await dbExecute('DELETE FROM levels WHERE id = ?', [id]);
    set((state) => ({
      levels: state.levels.filter((l) => l.id !== id),
      sections: state.sections.filter((s) => s.level_id !== id),
      wordPairs: state.wordPairs.filter((wp) => wp.level_id !== id),
    }));
    await get().fetchLevels(level.language_id);
  },

  reorderLevels: async (languageId, orderedIds) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await dbExecute('UPDATE levels SET position = ? WHERE id = ?', [i, orderedIds[i]]);
    }
    await get().fetchLevels(languageId);
  },

  // --- Word Pairs ---
  fetchWordPairs: async (levelId) => {
    set({ isLoading: true, error: null });
    try {
      const rows = await dbSelect<WordPair & { disabled: number | boolean }>(
        'SELECT * FROM word_pairs WHERE level_id = ? ORDER BY id',
        [levelId]
      );
      const wordPairs = rows.map((r) => ({ ...r, disabled: Boolean(r.disabled), section_id: r.section_id ?? null }));
      set({ wordPairs, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addWordPair: async (data) => {
    await dbExecute(
      'INSERT INTO word_pairs (level_id, section_id, source, target, disabled) VALUES (?, ?, ?, ?, ?)',
      [data.level_id, data.section_id ?? null, data.source, data.target, data.disabled ? 1 : 0]
    );
    await get().fetchWordPairs(data.level_id);
  },

  updateWordPair: async (id, data) => {
    try {
      const rows = await dbSelect<WordPair & { disabled: number | boolean }>(
        'SELECT * FROM word_pairs WHERE id = ?', [id]
      );
      if (!rows[0]) return;
      const pair = { ...rows[0], disabled: Boolean(rows[0].disabled) };
      const disabled = data.disabled !== undefined ? (data.disabled ? 1 : 0) : (pair.disabled ? 1 : 0);
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
    const pair = get().wordPairs.find((p) => p.id === id);
    if (!pair) return;
    await dbExecute('DELETE FROM word_pairs WHERE id = ?', [id]);
    set((state) => ({
      wordPairs: state.wordPairs.filter((p) => p.id !== id),
    }));
  },

  wordPairExistsInLanguage: async (languageId, source, target) => {
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
  },
}));
