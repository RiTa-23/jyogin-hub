import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  const auth = authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { session_name, attendances } = body;

  if (!session_name || !Array.isArray(attendances)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const db = getDb();

  // attendancesテーブルがなければ作成
  db.exec(`
    CREATE TABLE IF NOT EXISTS synced_attendances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_name TEXT NOT NULL,
      student_id TEXT,
      student_name TEXT,
      card_uid TEXT,
      note TEXT,
      scanned_at TEXT,
      synced_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  const insert = db.prepare(`
    INSERT INTO synced_attendances (user_id, session_name, student_id, student_name, card_uid, note, scanned_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((records: Array<Record<string, string>>) => {
    for (const r of records) {
      insert.run(
        auth.userId,
        session_name,
        r.student_id,
        r.student_name,
        r.card_uid,
        r.note || "",
        r.scanned_at
      );
    }
  });

  insertMany(attendances);

  return NextResponse.json({
    status: "synced",
    count: attendances.length,
  });
}
