import { useRef } from 'react';

export interface ParsedPair {
  source: string;
  target: string;
  section?: string;     // level name (col C in 4-col format)
  subsection?: string;  // subsection name (col D in 4-col, or col C in legacy 3-col)
  disabled?: boolean;   // hidden state (col E, 'Hidden' = true)
}

export interface ParsedConjugation {
  form_type: string;
  person: string;
  form: string;
}

export interface ParsedVerb {
  infinitive_source: string;
  infinitive_target: string;
  auxiliary?: string;
  case_preposition?: string;
  section?: string;
  subsection?: string;
  disabled?: boolean;
  conjugations: ParsedConjugation[];
}

export interface ParsedSpreadsheetResult {
  pairs: ParsedPair[];
  verbs: ParsedVerb[];
}

interface HeaderGuard {
  source: string;
  target: string;
}

const isTauriRuntime = () =>
  typeof window !== 'undefined' && typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';

async function tauriInvoke<T>(command: string, args: Record<string, unknown>): Promise<T> {
  const mod = await import('@tauri-apps/api/core');
  return mod.invoke<T>(command, args);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let i = 0;
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = '';
  };
  const pushRow = () => {
    if (row.length === 1 && row[0] === '' && rows.length > 0) return;
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === ',') {
      pushCell();
      i += 1;
      continue;
    }

    if (ch === '\r') {
      pushCell();
      pushRow();
      if (text[i + 1] === '\n') i += 2;
      else i += 1;
      continue;
    }

    if (ch === '\n') {
      pushCell();
      pushRow();
      i += 1;
      continue;
    }

    cell += ch;
    i += 1;
  }

  pushCell();
  pushRow();
  return rows;
}

function buildPairsFromRows(rows: string[][], headerGuard?: HeaderGuard): ParsedPair[] {
  const dataRows = rows.filter(row => {
    const source = String(row[0] ?? '').trim();
    const target = String(row[1] ?? '').trim();
    if (!source && !target) return false;
    if (
      headerGuard &&
      source.toLowerCase() === headerGuard.source.toLowerCase() &&
      target.toLowerCase() === headerGuard.target.toLowerCase()
    ) return false;
    return true;
  });
  const isFourCol = dataRows.some(row => String(row[3] ?? '').trim() !== '');
  const hasFiveCol = dataRows.some(row => String(row[4] ?? '').trim() !== '');

  const pairs: ParsedPair[] = [];
  for (const row of rows) {
    const source = String(row[0] ?? '').trim();
    const target = String(row[1] ?? '').trim();
    const colC = String(row[2] ?? '').trim();
    const colD = String(row[3] ?? '').trim();
    const colE = String(row[4] ?? '').trim();

    if (
      headerGuard &&
      source.toLowerCase() === headerGuard.source.toLowerCase() &&
      target.toLowerCase() === headerGuard.target.toLowerCase()
    ) continue;

    if (source && target) {
      const disabled = hasFiveCol && colE.toLowerCase() === 'hidden' ? true : undefined;
      if (isFourCol) {
        pairs.push({
          source,
          target,
          ...(colC ? { section: colC } : {}),
          ...(colD ? { subsection: colD } : {}),
          ...(disabled ? { disabled } : {}),
        });
      } else {
        pairs.push({
          source,
          target,
          ...(colC ? { subsection: colC } : {}),
          ...(disabled ? { disabled } : {}),
        });
      }
    }
  }

  return pairs;
}

function isVerbCsvHeaders(rows: string[][]): boolean {
  if (rows.length === 0) return false;
  const first = rows[0].map(c => (c ?? '').trim().toLowerCase());
  return first.includes('form type');
}

function buildVerbsFromRows(rows: string[][], headerGuard?: HeaderGuard): ParsedVerb[] {
  if (rows.length === 0) return [];

  // Fixed 14-column format:
  // 0: Source Infinitive, 1: Target Infinitive, 2: Section, 3: Subsection,
  // 4: Form Type, 5-10: Person/Form 1-6, 11: Auxiliary, 12: Case/Preposition, 13: Hidden
  const FORM_TYPE_COL = 4;
  const PAIRS_START = 5;
  const PAIRS_END = 11;

  // Filter data rows (skip header + empty + guard)
  const dataRows = rows.filter(row => {
    const src = String(row[0] ?? '').trim();
    const tgt = String(row[1] ?? '').trim();
    if (!src && !tgt) return false;
    if (src.toLowerCase() === 'source infinitive') return false;
    if (
      headerGuard &&
      src.toLowerCase() === headerGuard.source.toLowerCase() &&
      tgt.toLowerCase() === headerGuard.target.toLowerCase()
    ) return false;
    return true;
  });

  // Group consecutive rows by (inf_src, inf_tgt)
  const verbs: ParsedVerb[] = [];
  let i = 0;
  while (i < dataRows.length) {
    const keySrc = String(dataRows[i][0] ?? '').trim();
    const keyTgt = String(dataRows[i][1] ?? '').trim();
    const section        = String(dataRows[i][2]  ?? '').trim();
    const subsection     = String(dataRows[i][3]  ?? '').trim();
    const auxiliary      = String(dataRows[i][11] ?? '').trim();
    const casePreposition = String(dataRows[i][12] ?? '').trim();
    const hidden         = String(dataRows[i][13] ?? '').trim();
    const conjugations: ParsedConjugation[] = [];

    while (i < dataRows.length) {
      const src = String(dataRows[i][0] ?? '').trim();
      const tgt = String(dataRows[i][1] ?? '').trim();
      if (src !== keySrc || tgt !== keyTgt) break;

      const formType = String(dataRows[i][FORM_TYPE_COL] ?? '').trim();
      for (let j = PAIRS_START; j < PAIRS_END; j++) {
        const cell = String(dataRows[i][j] ?? '').trim();
        if (cell) {
          const dashIdx = cell.indexOf(' - ');
          if (dashIdx >= 0) {
            const person = cell.substring(0, dashIdx);
            const form = cell.substring(dashIdx + 3);
            if (person && form) {
              conjugations.push({ form_type: formType, person, form });
            }
          }
        }
      }
      i++;
    }

    verbs.push({
      infinitive_source: keySrc,
      infinitive_target: keyTgt,
      conjugations,
      ...(auxiliary ? { auxiliary } : {}),
      ...(casePreposition ? { case_preposition: casePreposition } : {}),
      ...(section ? { section } : {}),
      ...(subsection ? { subsection } : {}),
      ...(hidden.toLowerCase() === 'hidden' ? { disabled: true } : {}),
    });
  }

  return verbs;
}

/**
 * Reusable hook for importing word pairs and/or verbs from an Excel or CSV file.
 * Returns a trigger function and props for a hidden file input element.
 *
 * Column format detection:
 * - 4-column: col A = source, col B = target, col C = section (level), col D = subsection
 * - Legacy 3-column: col A = source, col B = target, col C = subsection
 * - Verb sheets detected by "Conjugations" header
 *
 * If headerGuard is provided, rows matching its source+target values are skipped (header detection).
 */
export function useExcelImport(
  onImport: (result: ParsedSpreadsheetResult) => void,
  headerGuard?: HeaderGuard,
  onError?: (message: string) => void,
) {
  const inputRef = useRef<HTMLInputElement>(null);

  const triggerImport = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        if (!data) return;

        const bytes = new Uint8Array(data as ArrayBuffer);
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

        if (isTauriRuntime()) {
          const parsed = await tauriInvoke<ParsedSpreadsheetResult>('parse_spreadsheet', {
            bytes: Array.from(bytes),
            filename: file.name,
            headerGuard: headerGuard ?? null,
          });
          onImport(parsed);
          return;
        }

        // Browser fallback: CSV-only
        if (ext !== 'csv') {
          throw new Error('Excel/ODS import is only available in the desktop app. Use CSV in web mode.');
        }
        const text = new TextDecoder().decode(bytes);
        const rows = parseCsv(text);
        if (isVerbCsvHeaders(rows)) {
          onImport({ pairs: [], verbs: buildVerbsFromRows(rows, headerGuard) });
        } else {
          onImport({ pairs: buildPairsFromRows(rows, headerGuard), verbs: [] });
        }
      } catch (err) {
        onError?.(err instanceof Error ? err.message : String(err));
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const fileInputProps = {
    ref: inputRef,
    type: 'file' as const,
    accept: '.xlsx,.ods,.csv',
    style: { display: 'none' } as React.CSSProperties,
    onChange: handleFileChange,
  };

  return { triggerImport, fileInputProps };
}
