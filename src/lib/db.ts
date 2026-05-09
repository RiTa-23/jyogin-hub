import { createClient, Client, InValue } from "@libsql/client";

let db: Client | null = null;

export async function getDb(): Promise<Client> {
  if (!db) {
    db = createClient({
      url: process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // マイグレーション: ALTER TABLE は IF NOT EXISTS 非対応のため try/catch
    try {
      await db.execute("ALTER TABLE users ADD COLUMN access_token TEXT");
    } catch {
      // 既に存在する場合は無視
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL DEFAULT 'default',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS member_corrections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT NOT NULL UNIQUE,
        display_name TEXT,
        real_name TEXT,
        student_id TEXT,
        hobbies TEXT,
        what_to_do TEXT,
        comment TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }
  return db;
}

function rowsToObjects<T = Record<string, unknown>>(
  columns: string[],
  rows: unknown[]
): T[] {
  return rows.map((row) => {
    const r = row as unknown[];
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < columns.length; i++) {
      obj[columns[i]] = r[i];
    }
    return obj as T;
  });
}

export async function all<T = Record<string, unknown>>(
  sql: string,
  ...args: InValue[]
): Promise<T[]> {
  const client = await getDb();
  const result = await client.execute({ sql, args });
  return rowsToObjects<T>(result.columns, result.rows);
}

export async function get<T = Record<string, unknown>>(
  sql: string,
  ...args: InValue[]
): Promise<T | undefined> {
  const rows = await all<T>(sql, ...args);
  return rows[0];
}

export async function run(
  sql: string,
  ...args: InValue[]
): Promise<{ changes: number; lastInsertRowid: bigint | undefined }> {
  const client = await getDb();
  const result = await client.execute({ sql, args });
  return { changes: result.rowsAffected ?? 0, lastInsertRowid: result.lastInsertRowid };
}
