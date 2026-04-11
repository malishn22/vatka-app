import * as XLSX from 'xlsx';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import type { WordPair, Section, Level, Language } from '../types';
import { dbSelect } from '../db/client';

interface UseExcelExportArgs {
  wordPairs: WordPair[];
  sections: Section[];
  level: Level;
  language: Language;
  unsectionedLabel: string;
  onSuccess: () => void;
}

export interface ExportPayload {
  wordPairs: WordPair[];
  sections: Section[];   // subsections
  levels: Level[];       // to resolve level name per pair
  fileLabel: string;
}

export async function fetchWordPairsRaw(levelId: number): Promise<WordPair[]> {
  const rows = await dbSelect<WordPair & { disabled: number }>(
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

export function useExcelExport({ wordPairs, sections, level, language, unsectionedLabel, onSuccess }: UseExcelExportArgs) {
  const safeFilename = (label: string, ext: string) => {
    const raw = `${language.name}_${label}`;
    return raw.replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '_') + `.${ext}`;
  };

  const exportXlsx = async (payload?: ExportPayload) => {
    const pairs = payload?.wordPairs ?? wordPairs;
    const secs = payload?.sections ?? sections;
    const lvls = payload?.levels ?? [level];
    const label = payload?.fileLabel ?? level.name;

    const sectionMap = new Map<number, string>(secs.map(s => [s.id, s.name]));
    const levelMap = new Map<number, string>(lvls.map(l => [l.id, l.name]));

    const wb = XLSX.utils.book_new();
    const header = [language.source, language.target, 'Section', 'Subsection'];

    const makeRows = (ps: WordPair[]) =>
      ps.map(p => [
        p.source,
        p.target,
        levelMap.get(p.level_id) ?? '',
        p.section_id != null ? (sectionMap.get(p.section_id) ?? '') : '',
      ]);

    // One sheet per level
    const uniqueLevelIds = [...new Set(pairs.map(p => p.level_id))];
    if (uniqueLevelIds.length > 1) {
      for (const lvlId of uniqueLevelIds) {
        const lvlPairs = pairs.filter(p => p.level_id === lvlId);
        const sheetName = (levelMap.get(lvlId) ?? String(lvlId)).slice(0, 31);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...makeRows(lvlPairs)]), sheetName);
      }
    } else {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...makeRows(pairs)]), label.slice(0, 31));
    }

    // Ensure workbook has at least one sheet
    if (wb.SheetNames.length === 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header]), label.slice(0, 31));
    }

    const buf: ArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
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
      `${language.source},${language.target},Section,Subsection`,
      ...pairs.map(p => {
        const secName = p.section_id != null ? (sectionMap.get(p.section_id) ?? '') : '';
        const lvlName = levelMap.get(p.level_id) ?? '';
        return `${escapeCell(p.source)},${escapeCell(p.target)},${escapeCell(lvlName)},${escapeCell(secName)}`;
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
