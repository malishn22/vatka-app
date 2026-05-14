import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import type { WordPair, Section, Level, Language, Verb, Conjugation, VerbWithConjugations } from '../types';
import { dbSelect } from '../db/client';

const isTauriRuntime = () =>
  typeof window !== 'undefined' && typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';

async function tauriInvoke<T>(command: string, args: Record<string, unknown>): Promise<T> {
  const mod = await import('@tauri-apps/api/core');
  return mod.invoke<T>(command, args);
}

interface UseExcelExportArgs {
  wordPairs: WordPair[];
  sections: Section[];
  level: Level;
  language: Language;
  onSuccess: () => void;
}

export interface ExportPayload {
  wordPairs: WordPair[];
  sections: Section[];   // subsections
  levels: Level[];       // to resolve level name per pair
  fileLabel: string;
  verbs?: VerbWithConjugations[];
}

export async function fetchWordPairsRaw(levelId: number): Promise<WordPair[]> {
  const rows = await dbSelect<Omit<WordPair, 'disabled'> & { disabled: number }>(
    'SELECT * FROM word_pairs WHERE level_id = ? ORDER BY id',
    [levelId]
  );
  return rows.map(r => ({ ...r, disabled: Boolean(r.disabled) }));
}

export async function fetchSectionsRaw(levelId: number): Promise<Section[]> {
  return dbSelect<Section>(
    'SELECT * FROM sections WHERE level_id = ? ORDER BY position',
    [levelId]
  );
}

export async function fetchVerbsRaw(levelId: number): Promise<VerbWithConjugations[]> {
  const verbRows = await dbSelect<Omit<Verb, 'disabled'> & { disabled: number }>(
    'SELECT * FROM verbs WHERE level_id = ? ORDER BY id',
    [levelId]
  );
  const conjugationRows = await dbSelect<Conjugation>(
    'SELECT c.* FROM conjugations c JOIN verbs v ON c.verb_id = v.id WHERE v.level_id = ? ORDER BY c.id',
    [levelId]
  );
  return verbRows.map(v => ({
    ...v,
    disabled: Boolean(v.disabled),
    conjugations: conjugationRows.filter(c => c.verb_id === v.id),
  }));
}

export function useExcelExport({ wordPairs, sections, level, language, onSuccess }: UseExcelExportArgs) {
  const safeFilename = (label: string, ext: string) => {
    const raw = `${language.name}_${label}`;
    return raw.replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '_') + `.${ext}`;
  };

  const exportXlsx = async (payload?: ExportPayload) => {
    if (!isTauriRuntime()) {
      throw new Error('Excel export is only available in the desktop app.');
    }

    const pairs = payload?.wordPairs ?? wordPairs;
    const secs = payload?.sections ?? sections;
    const lvls = payload?.levels ?? [level];
    const label = payload?.fileLabel ?? level.name;

    const verbsData = payload?.verbs ?? null;

    const buf = await tauriInvoke<number[]>('build_xlsx', {
      payload: {
        word_pairs: pairs.map(p => ({
          source: p.source,
          target: p.target,
          level_id: p.level_id,
          section_id: p.section_id,
          disabled: Boolean(p.disabled),
        })),
        sections: secs.map(s => ({ id: s.id, name: s.name })),
        levels: lvls.map(l => ({ id: l.id, name: l.name })),
        file_label: label,
        source_label: language.source,
        target_label: language.target,
        verbs: verbsData?.map(v => ({
          infinitive_source: v.infinitive_source,
          infinitive_target: v.infinitive_target,
          level_id: v.level_id,
          section_id: v.section_id,
          disabled: Boolean(v.disabled),
          auxiliary: v.auxiliary ?? null,
          case_preposition: v.case_preposition ?? null,
          conjugations: v.conjugations.map(c => ({
            form_type: c.form_type, person: c.person, form: c.form,
          })),
        })) ?? null,
      },
    });

    const path = await save({
      defaultPath: safeFilename(label, 'xlsx'),
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });
    if (!path) return;
    await writeFile(path, new Uint8Array(buf));
    onSuccess();
  };

  const exportCsv = async (payload?: ExportPayload) => {
    const pairs = payload?.wordPairs ?? wordPairs;
    const secs = payload?.sections ?? sections;
    const lvls = payload?.levels ?? [level];
    const label = payload?.fileLabel ?? level.name;
    const verbsData = payload?.verbs;

    const sectionMap = new Map<number, string>(secs.map(s => [s.id, s.name]));
    const levelMap = new Map<number, string>(lvls.map(l => [l.id, l.name]));

    const escapeCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

    // If verb-only export (no word pairs), export verbs CSV with flat tense rows
    if (pairs.length === 0 && verbsData && verbsData.length > 0) {
      // Fixed 14-column German Journey verb format:
      // 0: Source Infinitive, 1: Target Infinitive, 2: Section, 3: Subsection,
      // 4: Form Type, 5-10: Person/Form 1-6, 11: Auxiliary, 12: Case/Preposition, 13: Hidden
      const headerParts = [
        'Source Infinitive', 'Target Infinitive',
        'Section', 'Subsection', 'Form Type',
        'Person/Form 1', 'Person/Form 2', 'Person/Form 3',
        'Person/Form 4', 'Person/Form 5', 'Person/Form 6',
        'Auxiliary', 'Case/Preposition', 'Hidden',
      ];

      const csvLines = [headerParts.map(escapeCell).join(',')];

      for (const v of verbsData) {
        const lvlName = levelMap.get(v.level_id) ?? '';
        const secName = v.section_id != null ? (sectionMap.get(v.section_id) ?? '') : '';
        const hidden = v.disabled ? 'Hidden' : 'Shown';
        const aux = v.auxiliary ?? '';
        const casePrep = v.case_preposition ?? '';

        if (v.conjugations.length === 0) {
          const row = [
            escapeCell(v.infinitive_source), escapeCell(v.infinitive_target),
            escapeCell(lvlName), escapeCell(secName), '',
            '', '', '', '', '', '',
            escapeCell(aux), escapeCell(casePrep), escapeCell(hidden),
          ];
          csvLines.push(row.join(','));
        } else {
          // Group by form_type
          const byFormType = new Map<string, { person: string; form: string }[]>();
          for (const c of v.conjugations) {
            if (!byFormType.has(c.form_type)) byFormType.set(c.form_type, []);
            byFormType.get(c.form_type)!.push({ person: c.person, form: c.form });
          }
          for (const [formType, tPairs] of byFormType) {
            const personForms: string[] = [];
            for (let i = 0; i < 6; i++) {
              const p = tPairs[i];
              personForms.push(p ? escapeCell(`${p.person} - ${p.form}`) : '');
            }
            const row = [
              escapeCell(v.infinitive_source), escapeCell(v.infinitive_target),
              escapeCell(lvlName), escapeCell(secName), escapeCell(formType),
              ...personForms,
              escapeCell(aux), escapeCell(casePrep), escapeCell(hidden),
            ];
            csvLines.push(row.join(','));
          }
        }
      }

      const path = await save({
        defaultPath: safeFilename(label + '_verbs', 'csv'),
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });
      if (!path) return;
      await writeFile(path, new TextEncoder().encode(csvLines.join('\r\n')));
      onSuccess();
      return;
    }

    const lines = [
      `${language.source},${language.target},Section,Subsection,Hidden`,
      ...pairs.map(p => {
        const secName = p.section_id != null ? (sectionMap.get(p.section_id) ?? '') : '';
        const lvlName = levelMap.get(p.level_id) ?? '';
        const hidden = p.disabled ? 'Hidden' : 'Shown';
        return `${escapeCell(p.source)},${escapeCell(p.target)},${escapeCell(lvlName)},${escapeCell(secName)},${escapeCell(hidden)}`;
      }),
    ];
    const path = await save({
      defaultPath: safeFilename(label, 'csv'),
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (!path) return;
    await writeFile(path, new TextEncoder().encode(lines.join('\r\n')));
    onSuccess();
  };

  return { exportXlsx, exportCsv };
}
