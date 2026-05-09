import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ session: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { session } = await params;
  const oldName = decodeURIComponent(session);

  const body = await request.json();
  const newName = body.session_name;

  if (!newName || typeof newName !== "string" || newName.trim().length === 0) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  const trimmed = newName.trim();

  const db = getDb();
  const conflict = db
    .prepare("SELECT 1 FROM synced_attendances WHERE session_name = ? LIMIT 1")
    .get(trimmed);
  if (conflict) {
    return NextResponse.json({ error: "already_exists" }, { status: 409 });
  }

  const result = db
    .prepare("UPDATE synced_attendances SET session_name = ? WHERE session_name = ?")
    .run(trimmed, oldName);

  if (result.changes === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ session_name: trimmed });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ session: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { session } = await params;
  const sessionName = decodeURIComponent(session);

  const db = getDb();

  try {
    const result = db
      .prepare("DELETE FROM synced_attendances WHERE session_name = ?")
      .run(sessionName);

    return NextResponse.json({ deleted: result.changes });
  } catch {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}

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
