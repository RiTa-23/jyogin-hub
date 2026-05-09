import { NextRequest } from "next/server";
import { get } from "@/lib/db";

export async function authenticateApiKey(request: NextRequest): Promise<{ userId: number } | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const key = authHeader.slice(7);
  const row = await get<{ user_id: number }>(
    "SELECT user_id FROM api_keys WHERE key = ? AND active = 1",
    key
  );

  return row ? { userId: row.user_id } : null;
}
