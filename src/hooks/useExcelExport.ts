import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import type { WordPair, Section, Level, Language } from '../types';
import { dbSelect } from '../db/client';

const isTauriRuntime = () =>
  typeof window !== 'undefined' && typeof (window as any).__TAURI__ !== 'undefined';

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

    const sectionMap = new Map<number, string>(secs.map(s => [s.id, s.name]));
    const levelMap = new Map<number, string>(lvls.map(l => [l.id, l.name]));

    const escapeCell = (v: string) => `"${v.replace(/"/g, '""')}"`;
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
