import Database from '@tauri-apps/plugin-sql';

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load('sqlite:wordapp.db');
  }
  return _db;
}

export async function dbSelect<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return db.select<T[]>(sql, params);
}

export async function dbExecute(sql: string, params: unknown[] = []): Promise<{ lastInsertId?: number; rowsAffected: number }> {
  const db = await getDb();
  return db.execute(sql, params);
}

export async function dbTransaction(fn: () => Promise<void>): Promise<void> {
  await dbExecute('BEGIN');
  try {
    await fn();
    await dbExecute('COMMIT');
  } catch (err) {
    await dbExecute('ROLLBACK');
    throw err;
  }
}

export async function runMigrations(): Promise<void> {
  try {
    await dbExecute(
      'ALTER TABLE word_pairs ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0'
    );
  } catch {
    // Column already exists — safe to ignore
  }
  try {
    await dbExecute(
      `CREATE TABLE IF NOT EXISTS sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`
    );
  } catch {
    // Safe to ignore
  }
  try {
    await dbExecute(
      'ALTER TABLE word_pairs ADD COLUMN section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL'
    );
  } catch {
    // Column already exists — safe to ignore
  }
  try {
    await dbExecute(
      `CREATE TABLE IF NOT EXISTS verbs (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        level_id          INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
        section_id        INTEGER REFERENCES sections(id) ON DELETE SET NULL,
        infinitive_source TEXT NOT NULL,
        infinitive_target TEXT NOT NULL,
        disabled          INTEGER NOT NULL DEFAULT 0,
        created_at        TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    );
  } catch (e) {
    console.error('Verbs table migration failed:', e);
  }
  try {
    await dbExecute(
      `CREATE TABLE IF NOT EXISTS conjugations (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        verb_id    INTEGER NOT NULL REFERENCES verbs(id) ON DELETE CASCADE,
        tense      TEXT NOT NULL,
        person     TEXT NOT NULL,
        form       TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    );
  } catch (e) {
    console.error('Conjugations table migration failed:', e);
  }
}
