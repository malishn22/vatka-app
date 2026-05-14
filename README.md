# Vatka

A desktop application for learning languages through word pairs and verb conjugations. Built with Tauri v2.

## Tech Stack

Tauri v2 | React 19 | TypeScript | Vite | Tailwind CSS | Zustand | SQLite

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Rust](https://www.rust-lang.org/tools/install) toolchain via rustup
- Platform-specific dependencies for Tauri v2 — see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

## Getting Started

```bash
npm install
npm run tauri dev
```

> The first run compiles all Rust dependencies, which can take several minutes. Subsequent runs are much faster.

## Development

| Command | Description |
|---------|-------------|
| `npm run tauri dev` | Run the full app in dev mode (frontend + Rust backend) |
| `npm run dev` | Frontend-only dev server at `localhost:1420` (no Tauri features) |

## Building for Production

```bash
npm run tauri build
```

The installer/executable is output to `src-tauri/target/release/bundle/`.

## Project Structure

```
src/                  React frontend
  components/         Feature-organized UI (languages, levels, wordpairs, verbs, play, settings, shared)
  store/              Zustand state stores
  db/                 SQLite database client and migrations
  hooks/              Custom React hooks
  i18n/               Internationalization
  types/              TypeScript interfaces

src-tauri/            Rust backend
  src/lib.rs          App initialization and Tauri commands
  src/spreadsheet.rs  Spreadsheet import/export logic
  tauri.conf.json     Tauri app configuration
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
