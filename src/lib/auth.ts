import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

export interface AuthUser {
  discord_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) return null;

  try {
    const db = getDb();
    const user = db
      .prepare(
        `SELECT
          discord_id,
          username,
          COALESCE(NULLIF(display_name, ''), username) AS display_name,
          avatar_url
        FROM users
        WHERE discord_id = ?`
      )
      .get(userId) as AuthUser | undefined;
    return user ?? null;
  } catch {
    return null;
  }
}
