import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { get, all, run } from "@/lib/db";
import crypto from "crypto";

// APIキー一覧取得
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await get<{ id: number }>("SELECT id FROM users WHERE discord_id = ?", user.discord_id);
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const keys = await all<{ id: number; name: string; key: string; active: number; created_at: string }>(
    "SELECT id, name, key, active, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC",
    dbUser.id
  );

  // キーは先頭8文字のみ表示
  const masked = keys.map((k) => ({
    ...k,
    key: k.key.slice(0, 8) + "...",
    active: !!k.active,
  }));

  return NextResponse.json(masked);
}

// APIキー発行
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = body.name || "default";

  const dbUser = await get<{ id: number }>("SELECT id FROM users WHERE discord_id = ?", user.discord_id);
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 既存の有効なキーを無効化
  await run("UPDATE api_keys SET active = 0 WHERE user_id = ? AND active = 1", dbUser.id);

  const key = `jyogin_${crypto.randomBytes(32).toString("hex")}`;
  await run("INSERT INTO api_keys (user_id, key, name) VALUES (?, ?, ?)", dbUser.id, key, name);

  return NextResponse.json({ key, name });
}
