import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { all, get } from "@/lib/db";

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL!;

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // APIキー所有者のOAuthトークンをDBから取得
  const user = await get<{ access_token: string | null }>(
    "SELECT access_token FROM users WHERE id = ?",
    auth.userId
  );

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

  // 補正データを取得
  const corrections = await all<{
    discord_id: string;
    display_name: string | null;
    real_name: string | null;
    student_id: string | null;
  }>(
    `SELECT discord_id, display_name, real_name, student_id FROM member_corrections`
  );
  const corrMap = new Map<string, { display_name: string | null; real_name: string | null; student_id: string | null }>();
  for (const c of corrections) {
    corrMap.set(c.discord_id, { display_name: c.display_name, real_name: c.real_name, student_id: c.student_id });
  }

  // 必要なフィールドのみ返す（補正データがあれば優先）
  const members = allMembers.map((m: Record<string, unknown>) => {
    const c = corrMap.get(m.discord_id as string);
    return {
      discord_id: m.discord_id,
      username: m.username,
      display_name: c?.display_name ?? (m.display_name as string | null),
      avatar_url: m.avatar_url,
      real_name: c?.real_name ?? ((m.profile as Record<string, unknown>)?.real_name as string | null) ?? null,
      student_id: c?.student_id ?? ((m.profile as Record<string, unknown>)?.student_id as string | null) ?? null,
    };
  });

  // 重複除去
  const seen = new Set<string>();
  const unique = members.filter((m) => {
    if (seen.has(m.discord_id as string)) return false;
    seen.add(m.discord_id as string);
    return true;
  });

  return NextResponse.json({ members: unique });
}
