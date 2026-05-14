import type { StateCreator } from 'zustand';
import { dbSelect, dbExecute, dbTransaction } from '../../db/client';
import type { Subsection } from '../../types';

export interface SubsectionSlice {
  subsections: Subsection[];
  fetchSubsections: (sectionId: number) => Promise<void>;
  addSubsection: (data: Omit<Subsection, 'id' | 'created_at'>) => Promise<void>;
  updateSubsection: (id: number, data: Partial<Omit<Subsection, 'id' | 'created_at'>>) => Promise<void>;
  deleteSubsection: (id: number) => Promise<void>;
  reorderSubsections: (sectionId: number, orderedIds: number[]) => Promise<void>;
  moveSubsection: (id: number, newSectionId: number) => Promise<void>;
}

export const createSubsectionSlice: StateCreator<any, [], [], SubsectionSlice> = (set, get) => ({
  subsections: [],

  fetchSubsections: async (sectionId) => {
    try {
      const subsections = await dbSelect<Subsection>(
        'SELECT * FROM subsections WHERE section_id = ? ORDER BY position, name',
        [sectionId]
      );
      set((state: any) => ({
        subsections: [
          ...state.subsections.filter((s: Subsection) => s.section_id !== sectionId),
          ...subsections,
        ],
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  addSubsection: async (data) => {
    await dbExecute(
      'INSERT INTO subsections (section_id, name, position) VALUES (?, ?, ?)',
      [data.section_id, data.name, data.position]
    );
    await get().fetchSubsections(data.section_id);
  },

  updateSubsection: async (id, data) => {
    const subsection = get().subsections.find((s: Subsection) => s.id === id);
    if (!subsection) return;
    await dbExecute(
      'UPDATE subsections SET name = ?, position = ? WHERE id = ?',
      [data.name ?? subsection.name, data.position ?? subsection.position, id]
    );
    await get().fetchSubsections(subsection.section_id);
  },

  reorderSubsections: async (sectionId, orderedIds) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await dbExecute('UPDATE subsections SET position = ? WHERE id = ?', [i, orderedIds[i]]);
    }
    await get().fetchSubsections(sectionId);
  },

  moveSubsection: async (id, newSectionId) => {
    const subsection = get().subsections.find((s: Subsection) => s.id === id);
    if (!subsection) return;
    const oldSectionId = subsection.section_id;

    await dbTransaction(async () => {
      const [{ newPos }] = await dbSelect<{ newPos: number }>(
        'SELECT COALESCE(MAX(position), -1) + 1 AS newPos FROM subsections WHERE section_id = ?',
        [newSectionId]
      );
      await dbExecute('UPDATE subsections SET section_id = ?, position = ? WHERE id = ?', [newSectionId, newPos, id]);
      await dbExecute('UPDATE word_pairs SET section_id = ? WHERE subsection_id = ?', [newSectionId, id]);
    });

    await get().fetchSubsections(oldSectionId);
    await get().fetchSubsections(newSectionId);
    await get().fetchWordPairs(newSectionId);
  },

  deleteSubsection: async (id) => {
    const subsection = get().subsections.find((s: Subsection) => s.id === id);
    if (!subsection) return;
    await dbExecute('DELETE FROM subsections WHERE id = ?', [id]);
    set((state: any) => ({ subsections: state.subsections.filter((s: Subsection) => s.id !== id) }));
    await get().fetchWordPairs(subsection.section_id);
  },
});
