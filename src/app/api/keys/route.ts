import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import crypto from "crypto";

// APIキー一覧取得
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const dbUser = db.prepare("SELECT id FROM users WHERE discord_id = ?").get(user.discord_id) as { id: number } | undefined;
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const keys = db.prepare(
    "SELECT id, name, key, active, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC"
  ).all(dbUser.id);

  // キーは先頭8文字のみ表示
  const masked = (keys as Array<{ id: number; name: string; key: string; active: number; created_at: string }>).map((k) => ({
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

  const db = getDb();
  const dbUser = db.prepare("SELECT id FROM users WHERE discord_id = ?").get(user.discord_id) as { id: number } | undefined;
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 既存の有効なキーを無効化
  db.prepare("UPDATE api_keys SET active = 0 WHERE user_id = ? AND active = 1").run(dbUser.id);

  const key = `jyogin_${crypto.randomBytes(32).toString("hex")}`;
  db.prepare("INSERT INTO api_keys (user_id, key, name) VALUES (?, ?, ?)").run(dbUser.id, key, name);

  return NextResponse.json({ key, name });
}
