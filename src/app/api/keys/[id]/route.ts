import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { get, run } from "@/lib/db";

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

  const dbUser = await get<{ id: number }>("SELECT id FROM users WHERE discord_id = ?", user.discord_id);
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const result = await run(
    "UPDATE api_keys SET active = 0 WHERE id = ? AND user_id = ?",
    id,
    dbUser.id
  );

  if (result.changes === 0) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  return NextResponse.json({ status: "revoked" });
}
