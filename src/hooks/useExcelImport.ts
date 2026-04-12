import { useRef } from 'react';
import * as XLSX from 'xlsx';

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
export function useExcelImport(onImport: (rows: ParsedPair[]) => void, headerGuard?: HeaderGuard) {
  const inputRef = useRef<HTMLInputElement>(null);

  const triggerImport = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      // Detect format: 4-col if any non-header row has a non-empty col D
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

        // Skip header row
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
            // Legacy: col C = subsection
            pairs.push({
              source,
              target,
              ...(colC ? { subsection: colC } : {}),
              ...(disabled ? { disabled } : {}),
            });
          }
        }
      }

      onImport(pairs);
    };
    reader.readAsArrayBuffer(file);

    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const fileInputProps = {
    ref: inputRef,
    type: 'file' as const,
    accept: '.xlsx,.xls,.ods,.csv',
    style: { display: 'none' } as React.CSSProperties,
    onChange: handleFileChange,
  };

  return { triggerImport, fileInputProps };
}
