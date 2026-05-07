use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

mod spreadsheet;

const INIT_SQL: &str = "
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS languages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  source     TEXT NOT NULL,
  target     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS levels (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  language_id INTEGER NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS word_pairs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  level_id   INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  source     TEXT NOT NULL,
  target     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS verbs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  level_id          INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  section_id        INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  infinitive_source TEXT NOT NULL,
  infinitive_target TEXT NOT NULL,
  disabled          INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS conjugations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  verb_id    INTEGER NOT NULL REFERENCES verbs(id) ON DELETE CASCADE,
  tense      TEXT NOT NULL,
  person     TEXT NOT NULL,
  form       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            spreadsheet::parse_spreadsheet,
            spreadsheet::build_xlsx
        ])
        .plugin(
            SqlBuilder::default()
                .add_migrations(
                    "sqlite:wordapp.db",
                    vec![Migration {
                        version: 1,
                        description: "initial schema",
                        sql: INIT_SQL,
                        kind: MigrationKind::Up,
                    }],
                )
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
