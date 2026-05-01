import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL!;

async function fetchMembers(accessToken: string): Promise<Map<string, { username: string; display_name: string; avatar_url: string }>> {
  const memberMap = new Map<string, { username: string; display_name: string; avatar_url: string }>();
  let offset = 0;
  const limit = 100;
  while (true) {
    const res = await fetch(
      `${AUTH_SERVER_URL}/oauth/members?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) break;
    const data = await res.json();
    const list: Array<{ profile?: { student_id?: string }; username: string; display_name: string; avatar_url: string }> =
      Array.isArray(data) ? data : data.members ?? [];
    if (list.length === 0) break;
    for (const m of list) {
      const sid = m.profile?.student_id;
      if (sid) {
        memberMap.set(sid.toLowerCase(), {
          username: m.username,
          display_name: m.display_name,
          avatar_url: m.avatar_url,
        });
      }
    }
    if (list.length < limit) break;
    offset += limit;
  }
  return memberMap;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ session: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { session } = await params;
  const sessionName = decodeURIComponent(session);

  const db = getDb();

  try {
    const attendances = db
      .prepare(
        `SELECT student_id, student_name, note, scanned_at, synced_at
         FROM synced_attendances
         WHERE session_name = ?
         ORDER BY scanned_at`
      )
      .all(sessionName) as Array<{
        student_id: string;
        student_name: string;
        note: string;
        scanned_at: string;
        synced_at: string;
      }>;

    const accessToken = request.cookies.get("access_token")?.value;
    let memberMap: Map<string, { username: string; display_name: string; avatar_url: string }> = new Map();
    if (accessToken) {
      memberMap = await fetchMembers(accessToken);
    }

    const enriched = attendances.map((a) => {
      const matched = memberMap.get(a.student_id.toLowerCase());
      return {
        ...a,
        discord_username: matched?.username ?? null,
        discord_display_name: matched?.display_name ?? null,
        discord_avatar_url: matched?.avatar_url ?? null,
      };
    });

    return NextResponse.json({ session_name: sessionName, attendances: enriched });
  } catch {
    return NextResponse.json({ session_name: sessionName, attendances: [] });
  }
}
