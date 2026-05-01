import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ session: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { session } = await params;
  const sessionName = decodeURIComponent(session);

  const db = getDb();

  try {
    const attendances = db
      .prepare(
        `SELECT student_id, student_name, note, scanned_at, synced_at
         FROM synced_attendances
         WHERE session_name = ?
         ORDER BY scanned_at`
      )
      .all(sessionName) as Array<{
        student_id: string;
        student_name: string;
        note: string;
        scanned_at: string;
        synced_at: string;
      }>;

    return NextResponse.json({ session_name: sessionName, attendances });
  } catch {
    return NextResponse.json({ session_name: sessionName, attendances: [] });
  }
}
