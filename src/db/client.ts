import Database from '@tauri-apps/plugin-sql';

let _dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!_dbPromise) {
    _dbPromise = Database.load('sqlite:wordapp.db');
  }
  return _dbPromise;
}

let _resolveReady!: () => void;
export const dbReadyPromise = new Promise<void>((res) => { _resolveReady = res; });
getDb().then(_resolveReady).catch(_resolveReady);

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
