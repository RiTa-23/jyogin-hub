import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();

  try {
    const sessions = db
      .prepare(
        `SELECT DISTINCT session_name, MIN(synced_at) as first_synced, COUNT(*) as count
         FROM synced_attendances
         GROUP BY session_name ORDER BY first_synced DESC`
      )
      .all();

    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ sessions: [] });
  }
}
