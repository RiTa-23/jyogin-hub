import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { getDb } from "@/lib/db";

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL!;

export async function GET(request: NextRequest) {
  const auth = authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // APIキー所有者のOAuthトークンをDBから取得
  const db = getDb();
  const user = db
    .prepare("SELECT access_token FROM users WHERE id = ?")
    .get(auth.userId) as { access_token: string | null } | undefined;

  if (!user?.access_token) {
    return NextResponse.json(
      { error: "no_token", message: "JyoginHubに再ログインしてください" },
      { status: 401 }
    );
  }

  // 全部員を取得
  const allMembers = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const res = await fetch(
      `${AUTH_SERVER_URL}/oauth/members?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${user.access_token}` } }
    );
    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json(
          { error: "token_expired", message: "トークンが期限切れです。JyoginHubに再ログインしてください" },
          { status: 401 }
        );
      }
      break;
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.members ?? [];
    allMembers.push(...list);
    if (list.length < limit) break;
    offset += limit;
  }

  // 必要なフィールドのみ返す
  const members = allMembers.map((m: Record<string, unknown>) => ({
    discord_id: m.discord_id,
    username: m.username,
    display_name: m.display_name,
    avatar_url: m.avatar_url,
    real_name: (m.profile as Record<string, unknown>)?.real_name || null,
    student_id: (m.profile as Record<string, unknown>)?.student_id || null,
  }));

  // 重複除去
  const seen = new Set<string>();
  const unique = members.filter((m) => {
    if (seen.has(m.discord_id as string)) return false;
    seen.add(m.discord_id as string);
    return true;
  });

  return NextResponse.json({ members: unique });
}
