import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "jyogin-hub.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- マイグレーション: access_token カラム追加
      -- ALTER TABLE users ADD COLUMN は IF NOT EXISTS 非対応のため別途実行

      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL DEFAULT 'default',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // マイグレーション: users に access_token カラム追加
    try {
      db.exec("ALTER TABLE users ADD COLUMN access_token TEXT");
    } catch {
      // 既に存在する場合は無視
    }
  }
  return db;
}
