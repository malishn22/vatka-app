import type { StateCreator } from 'zustand';
import { dbSelect, dbExecute } from '../../db/client';
import { toBool, fromBool } from '../../utils/dbMapper';
import type { Verb, Conjugation, VerbWithConjugations } from '../../types';

export interface VerbSlice {
  verbs: VerbWithConjugations[];
  allLanguageVerbs: VerbWithConjugations[];
  allLanguageVerbsLoadedFor: number | null;
  fetchVerbs: (sectionId: number) => Promise<void>;
  fetchVerbsForLanguage: (languageId: number) => Promise<void>;
  addVerb: (verb: Omit<Verb, 'id' | 'created_at'>, conjugations: Omit<Conjugation, 'id' | 'verb_id' | 'created_at'>[]) => Promise<void>;
  updateVerb: (id: number, verb: Partial<Omit<Verb, 'id' | 'created_at'>>, conjugations: Omit<Conjugation, 'id' | 'verb_id' | 'created_at'>[]) => Promise<void>;
  deleteVerb: (id: number) => Promise<void>;
  toggleVerbDisabled: (id: number) => Promise<void>;
  verbExistsInLanguage: (languageId: number, infinitiveSource: string, infinitiveTarget: string) => Promise<boolean>;
  moveVerb: (id: number, sectionId: number, subsectionId: number | null) => Promise<void>;
  fetchUsedFormTypes: (languageId: number) => Promise<string[]>;
  fetchUsedPersons: (languageId: number) => Promise<string[]>;
}

export const createVerbSlice: StateCreator<any, [], [], VerbSlice> = (set, get) => ({
  verbs: [],
  allLanguageVerbs: [],
  allLanguageVerbsLoadedFor: null,

  fetchVerbsForLanguage: async (languageId) => {
    try {
      const verbRows = await dbSelect<Verb & { disabled: number | boolean }>(
        `SELECT v.* FROM verbs v
         JOIN sections s ON v.section_id = s.id
         WHERE s.language_id = ?
         ORDER BY v.id`,
        [languageId]
      );
      const conjugationRows = await dbSelect<Conjugation>(
        `SELECT c.* FROM conjugations c
         JOIN verbs v ON c.verb_id = v.id
         JOIN sections s ON v.section_id = s.id
         WHERE s.language_id = ?
         ORDER BY c.id`,
        [languageId]
      );
      const allLanguageVerbs: VerbWithConjugations[] = verbRows.map((v) => ({
        ...v,
        disabled: toBool(v.disabled),
        subsection_id: v.subsection_id ?? null,
        conjugations: conjugationRows.filter((c) => c.verb_id === v.id),
      }));
      set({ allLanguageVerbs, allLanguageVerbsLoadedFor: languageId });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  fetchVerbs: async (sectionId) => {
    try {
      const verbRows = await dbSelect<Verb & { disabled: number | boolean }>(
        'SELECT * FROM verbs WHERE section_id = ? ORDER BY id',
        [sectionId]
      );
      const conjugationRows = await dbSelect<Conjugation>(
        'SELECT c.* FROM conjugations c JOIN verbs v ON c.verb_id = v.id WHERE v.section_id = ? ORDER BY c.id',
        [sectionId]
      );
      const verbs: VerbWithConjugations[] = verbRows.map((v) => ({
        ...v,
        disabled: toBool(v.disabled),
        subsection_id: v.subsection_id ?? null,
        conjugations: conjugationRows.filter((c) => c.verb_id === v.id),
      }));
      set({ verbs });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  addVerb: async (verb, conjugations) => {
    try {
      const result = await dbExecute(
        'INSERT INTO verbs (section_id, subsection_id, infinitive_source, infinitive_target, disabled, auxiliary, case_preposition) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [verb.section_id, verb.subsection_id ?? null, verb.infinitive_source, verb.infinitive_target, fromBool(verb.disabled ?? false), verb.auxiliary ?? null, verb.case_preposition ?? null]
      );
      const verbId = result.lastInsertId!;
      for (const c of conjugations) {
        await dbExecute(
          'INSERT INTO conjugations (verb_id, form_type, person, form) VALUES (?, ?, ?, ?)',
          [verbId, c.form_type, c.person, c.form]
        );
      }
    } finally {
      set({ allLanguageVerbsLoadedFor: null });
      await get().fetchVerbs(verb.section_id);
    }
  },

  updateVerb: async (id, verb, conjugations) => {
    const existing = get().verbs.find((v: VerbWithConjugations) => v.id === id);
    if (!existing) return;
    const sectionId = verb.section_id ?? existing.section_id;
    await dbExecute(
      'UPDATE verbs SET infinitive_source = ?, infinitive_target = ?, disabled = ?, section_id = ?, subsection_id = ?, auxiliary = ?, case_preposition = ? WHERE id = ?',
      [
        verb.infinitive_source ?? existing.infinitive_source,
        verb.infinitive_target ?? existing.infinitive_target,
        fromBool(verb.disabled ?? existing.disabled ?? false),
        sectionId,
        'subsection_id' in verb ? verb.subsection_id : existing.subsection_id,
        'auxiliary' in verb ? (verb.auxiliary ?? null) : (existing.auxiliary ?? null),
        'case_preposition' in verb ? (verb.case_preposition ?? null) : (existing.case_preposition ?? null),
        id,
      ]
    );
    await dbExecute('DELETE FROM conjugations WHERE verb_id = ?', [id]);
    for (const c of conjugations) {
      await dbExecute(
        'INSERT INTO conjugations (verb_id, form_type, person, form) VALUES (?, ?, ?, ?)',
        [id, c.form_type, c.person, c.form]
      );
    }
    set({ allLanguageVerbsLoadedFor: null });
    await get().fetchVerbs(sectionId);
  },

  deleteVerb: async (id) => {
    const verb = get().verbs.find((v: VerbWithConjugations) => v.id === id);
    if (!verb) return;
    await dbExecute('DELETE FROM verbs WHERE id = ?', [id]);
    set((state: any) => ({
      verbs: state.verbs.filter((v: VerbWithConjugations) => v.id !== id),
      allLanguageVerbsLoadedFor: null,
    }));
  },

  toggleVerbDisabled: async (id) => {
    const verb = get().verbs.find((v: VerbWithConjugations) => v.id === id);
    if (!verb) return;
    const newDisabled = verb.disabled ? 0 : 1;
    await dbExecute('UPDATE verbs SET disabled = ? WHERE id = ?', [newDisabled, id]);
    set((state: any) => ({
      verbs: state.verbs.map((v: VerbWithConjugations) => v.id === id ? { ...v, disabled: !v.disabled } : v),
      allLanguageVerbsLoadedFor: null,
    }));
  },

  verbExistsInLanguage: async (languageId, infinitiveSource, infinitiveTarget) => {
    try {
      const rows = await dbSelect<{ found: number }>(
        `SELECT 1 AS found FROM verbs v
         JOIN sections l ON v.section_id = l.id
         WHERE l.language_id = ?
           AND LOWER(TRIM(v.infinitive_source)) = LOWER(TRIM(?))
           AND LOWER(TRIM(v.infinitive_target)) = LOWER(TRIM(?))
         LIMIT 1`,
        [languageId, infinitiveSource, infinitiveTarget]
      );
      return rows.length > 0;
    } catch {
      return false;
    }
  },

  moveVerb: async (id, sectionId, subsectionId) => {
    const verb = get().verbs.find((v: VerbWithConjugations) => v.id === id);
    if (!verb) return;
    const sourceLevelId = verb.section_id;
    await dbExecute(
      'UPDATE verbs SET section_id = ?, subsection_id = ? WHERE id = ?',
      [sectionId, subsectionId, id]
    );
    set({ allLanguageVerbsLoadedFor: null });
    await get().fetchVerbs(sourceLevelId);
  },

  fetchUsedFormTypes: async (languageId) => {
    const rows = await dbSelect<{ form_type: string }>(
      `SELECT DISTINCT c.form_type FROM conjugations c
       JOIN verbs v ON c.verb_id = v.id
       JOIN sections l ON v.section_id = l.id
       WHERE l.language_id = ?
       ORDER BY c.form_type`,
      [languageId]
    );
    return rows.map((r) => r.form_type);
  },

  fetchUsedPersons: async (languageId) => {
    const rows = await dbSelect<{ person: string }>(
      `SELECT c.person FROM conjugations c
       JOIN verbs v ON c.verb_id = v.id
       JOIN sections l ON v.section_id = l.id
       WHERE l.language_id = ?
       GROUP BY c.person
       ORDER BY MIN(c.id)`,
      [languageId]
    );
    return rows.map((r) => r.person);
  },
});
