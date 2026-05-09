import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { all, run } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await all<{
    discord_id: string;
    display_name: string | null;
    real_name: string | null;
    student_id: string | null;
    hobbies: string | null;
    what_to_do: string | null;
    comment: string | null;
    updated_at: string;
  }>(
    `SELECT discord_id, display_name, real_name, student_id, hobbies, what_to_do, comment, updated_at
     FROM member_corrections`
  );

  const map: Record<string, object> = {};
  for (const row of rows) {
    const { discord_id, ...rest } = row;
    map[discord_id] = rest;
  }

  return NextResponse.json({ corrections: map });
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { discord_id, display_name, real_name, student_id, hobbies, what_to_do, comment } = body;

  if (!discord_id || typeof discord_id !== "string") {
    return NextResponse.json({ error: "discord_id is required" }, { status: 400 });
  }

  await run(
    `INSERT INTO member_corrections (discord_id, display_name, real_name, student_id, hobbies, what_to_do, comment, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(discord_id) DO UPDATE SET
       display_name = excluded.display_name,
       real_name = excluded.real_name,
       student_id = excluded.student_id,
       hobbies = excluded.hobbies,
       what_to_do = excluded.what_to_do,
       comment = excluded.comment,
       updated_at = excluded.updated_at`,
    discord_id,
    display_name ?? null,
    real_name ?? null,
    student_id ?? null,
    hobbies ?? null,
    what_to_do ?? null,
    comment ?? null,
  );

  return NextResponse.json({ status: "saved" });
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { discord_id } = body;

  if (!discord_id || typeof discord_id !== "string") {
    return NextResponse.json({ error: "discord_id is required" }, { status: 400 });
  }

  await run("DELETE FROM member_corrections WHERE discord_id = ?", discord_id);

  return NextResponse.json({ status: "reset" });
}
