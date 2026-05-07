import { useRef } from 'react';

export interface ParsedPair {
  source: string;
  target: string;
  section?: string;     // level name (col C in 4-col format)
  subsection?: string;  // subsection name (col D in 4-col, or col C in legacy 3-col)
  disabled?: boolean;   // hidden state (col E, 'Hidden' = true)
}

interface HeaderGuard {
  source: string;
  target: string;
}

const isTauriRuntime = () =>
  typeof window !== 'undefined' && typeof (window as any).__TAURI__ !== 'undefined';

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

/**
 * Reusable hook for importing word pairs from an Excel or CSV file.
 * Returns a trigger function and props for a hidden file input element.
 *
 * Column format detection:
 * - 4-column: col A = source, col B = target, col C = section (level), col D = subsection
 * - Legacy 3-column: col A = source, col B = target, col C = subsection
 *
 * If headerGuard is provided, rows matching its source+target values are skipped (header detection).
 */
export function useExcelImport(
  onImport: (rows: ParsedPair[]) => void,
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
          const parsed = await tauriInvoke<ParsedPair[]>('parse_spreadsheet', {
            bytes: Array.from(bytes),
            filename: file.name,
            header_guard: headerGuard ?? null,
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
        onImport(buildPairsFromRows(rows, headerGuard));
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
