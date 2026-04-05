import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export function authenticateApiKey(request: NextRequest): { userId: number } | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const key = authHeader.slice(7);
  const db = getDb();
  const row = db
    .prepare("SELECT user_id FROM api_keys WHERE key = ? AND active = 1")
    .get(key) as { user_id: number } | undefined;

  return row ? { userId: row.user_id } : null;
}
