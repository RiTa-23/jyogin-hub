import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

// APIキー無効化
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const db = getDb();
  const dbUser = db.prepare("SELECT id FROM users WHERE discord_id = ?").get(user.discord_id) as { id: number } | undefined;
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const result = db.prepare(
    "UPDATE api_keys SET active = 0 WHERE id = ? AND user_id = ?"
  ).run(id, dbUser.id);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  return NextResponse.json({ status: "revoked" });
}
