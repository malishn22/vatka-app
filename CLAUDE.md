# Vatka

Tauri v2 desktop app for language learning — word pairs and verb conjugations.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + Zustand
- **Backend:** Rust (Tauri v2) with SQLite via tauri-plugin-sql
- **Spreadsheet I/O:** calamine (read) + rust_xlsxwriter (write) in Rust

## Commands

```bash
npm run tauri dev    # Full dev mode (frontend + Rust backend)
npm run dev          # Frontend-only Vite dev server (no Tauri features)
npm run build        # Build frontend (tsc + vite build)
npm run tauri build  # Production build (creates platform installer)
```

## Project Structure

```
src/                          # React frontend
  components/
    layout/                   # Layout, Sidebar
    languages/                # Language CRUD
    levels/                   # Level management
    sections/                 # Section management
    wordpairs/                # Word pairs + spreadsheet import/export
    verbs/                    # Verb conjugation management
    play/                     # Game modes (match, quiz, conjugation)
    settings/                 # App settings
    shared/                   # Reusable UI (Button, Input, Modal, Toggle, Dropdown, etc.)
  store/
    dataStore.ts              # All data CRUD (languages, levels, sections, word pairs, verbs)
    uiStore.ts                # UI state with localStorage persistence
    playStore.ts              # Matching game state
    quizStore.ts              # Quiz mode state
    conjugationPlayStore.ts   # Conjugation game state
  db/client.ts                # Database singleton (dbSelect, dbExecute, dbTransaction, runMigrations)
  hooks/                      # useDragSource, useDropTarget, useExcelExport, useExcelImport, usePairedPaste
  i18n/                       # translations.ts + useT hook
  types/index.ts              # All TypeScript interfaces
  context/DragContext.tsx      # Drag-and-drop context provider
  utils/                      # shuffle, reorderIds

src-tauri/                    # Rust backend
  src/lib.rs                  # App init, SQLite setup, Tauri commands
  src/spreadsheet.rs          # Spreadsheet import/export (XLSX, ODS, CSV)
  tauri.conf.json             # App config (productName: Vatka, dev port 1420)
  capabilities/default.json   # Security permissions
```

## Conventions

- **State management:** Zustand stores — no Redux
- **Styling:** Tailwind CSS, dark mode via `class` strategy
- **Database:** SQLite via tauri-plugin-sql; schema migrations live in `src/db/client.ts`
- **Components:** Feature-based folder organization under `src/components/`
- **Shared UI:** `src/components/shared/` — Button, Input, Modal, Toggle, Dropdown, ConfirmDialog, Toast, Icons, SectionBadge
- **TypeScript:** Strict mode enabled, all interfaces in `src/types/index.ts`
- **Internationalization:** `src/i18n/translations.ts` with `useT` hook
- **No test framework** currently configured

## Database

SQLite database (`wordapp.db`) with tables: `languages`, `levels`, `sections`, `word_pairs`, `verbs`, `conjugations`. Foreign keys enabled. Migrations run on app startup in `db/client.ts`.

## Tauri Commands (Rust -> Frontend)

- `parse_spreadsheet(path)` — Parse XLSX/ODS/CSV into structured word pair data
- `build_xlsx(...)` — Export word pairs/verbs to Excel format
