"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/client-auth";

interface SessionSummary {
  session_name: string;
  first_synced: string;
  count: number;
}

interface AttendanceRecord {
  student_id: string;
  student_name: string;
  note: string;
  scanned_at: string;
  synced_at: string;
  discord_username: string | null;
  discord_display_name: string | null;
  discord_avatar_url: string | null;
}

interface Member {
  profile?: { student_id?: string };
  username: string;
  display_name: string;
  avatar_url: string;
}

interface DiscordInfo {
  username: string;
  display_name: string;
  avatar_url: string;
}

async function fetchMembers(): Promise<Map<string, DiscordInfo>> {
  const memberMap = new Map<string, DiscordInfo>();
  let offset = 0;
  const limit = 100;
  while (true) {
    const res = await authFetch(`/api/members?limit=${limit}&offset=${offset}`);
    if (!res.ok) break;
    const data = await res.json();
    const list: Member[] = Array.isArray(data) ? data : data.members ?? [];
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

export default function AttendanceView() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [discordInfoLoading, setDiscordInfoLoading] = useState(false);

  useEffect(() => {
    authFetch("/api/attendances")
      .then((res) => res.json())
      .then((data) => setSessions(data.sessions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (sessionName: string) => {
    setSelected(sessionName);
    setDiscordInfoLoading(true);
    const res = await authFetch(
      `/api/attendances/${encodeURIComponent(sessionName)}`
    );
    const data = await res.json();
    const records: AttendanceRecord[] = (data.attendances ?? []).map(
      (a: Omit<AttendanceRecord, "discord_username" | "discord_display_name" | "discord_avatar_url">) => ({
        ...a,
        discord_username: null,
        discord_display_name: null,
        discord_avatar_url: null,
      })
    );
    setRecords(records);

    const memberMap = await fetchMembers();
    const enriched = records.map((r) => {
      const matched = memberMap.get(r.student_id.toLowerCase());
      return {
        ...r,
        discord_username: matched?.username ?? null,
        discord_display_name: matched?.display_name ?? null,
        discord_avatar_url: matched?.avatar_url ?? null,
      };
    });
    setRecords(enriched);
    setDiscordInfoLoading(false);
  };

  const handleDelete = async () => {
    if (!selected || !window.confirm(`「${selected}」を削除してもよろしいですか？`)) return;

    const res = await authFetch(
      `/api/attendances/${encodeURIComponent(selected)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      const data = await res.json();
      setSessions((prev) => prev.filter((s) => s.session_name !== selected));
      setSelected(null);
      setRecords([]);
      setDiscordInfoLoading(false);
      alert(`${data.deleted}件の記録を削除しました`);
    } else {
      alert("削除に失敗しました");
    }
  };

  if (loading) {
    return <p className="text-center text-sm text-zinc-400">読み込み中...</p>;
  }

  if (selected) {
    return (
      <div>
        <button
          onClick={() => {
            setSelected(null);
            setRecords([]);
            setDiscordInfoLoading(false);
          }}
          className="mb-4 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          &larr; セッション一覧に戻る
        </button>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{selected}</h2>
            <p className="text-sm text-zinc-500">{records.length}名</p>
          </div>
          <button
            onClick={handleDelete}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
          >
            このセッションを削除
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="pb-2 pr-4 font-medium text-zinc-500"></th>
                <th className="pb-2 pr-4 font-medium text-zinc-500">学籍番号</th>
                <th className="pb-2 pr-4 font-medium text-zinc-500">氏名</th>
                <th className="pb-2 pr-4 font-medium text-zinc-500">スキャン日時</th>
                <th className="pb-2 font-medium text-zinc-500">備考</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-100 dark:border-zinc-800"
                >
                  <td className="py-2 pr-2">
                    {discordInfoLoading ? (
                      <div className="flex h-8 w-8 items-center justify-center">
                        <svg className="h-4 w-4 animate-spin text-zinc-400" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    ) : r.discord_avatar_url ? (
                      <img
                        src={r.discord_avatar_url}
                        alt=""
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                        ?
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.student_id}</td>
                  <td className="py-2 pr-4">
                    <div>{r.student_name}</div>
                    {r.discord_username && (
                      <div className="text-xs text-zinc-400">
                        {r.discord_display_name || r.discord_username}
                        {r.discord_display_name && r.discord_display_name !== r.discord_username
                          ? ` (@${r.discord_username})`
                          : r.discord_username ? ` @${r.discord_username}` : ""}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-xs text-zinc-500">
                    {r.scanned_at}
                  </td>
                  <td className="py-2 text-xs text-zinc-500">{r.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {records.length === 0 && (
          <p className="mt-4 text-center text-sm text-zinc-400">
            出席データがありません
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-6 text-sm text-zinc-500">
        Jyoginから同期された出欠記録です。
      </p>

      {sessions.length === 0 && (
        <p className="text-center text-sm text-zinc-400">
          まだ出欠記録が同期されていません
        </p>
      )}

      <div className="space-y-2">
        {sessions.map((s) => (
          <div
            key={s.session_name}
            className="flex items-center rounded-lg border border-zinc-200 bg-white transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
          >
            <button
              onClick={() => handleSelect(s.session_name)}
              className="flex flex-1 items-center justify-between p-4 text-left"
            >
              <div>
                <span className="font-medium">{s.session_name}</span>
                <span className="ml-3 text-xs text-zinc-400">
                  {s.first_synced?.slice(0, 10)}
                </span>
              </div>
              <span className="text-sm text-zinc-500">{s.count}名</span>
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (window.confirm(`「${s.session_name}」を削除してもよろしいですか？`)) {
                  const res = await authFetch(
                    `/api/attendances/${encodeURIComponent(s.session_name)}`,
                    { method: "DELETE" }
                  );
                  if (res.ok) {
                    setSessions((prev) => prev.filter((x) => x.session_name !== s.session_name));
                    if (selected === s.session_name) {
                      setSelected(null);
                      setRecords([]);
                      setDiscordInfoLoading(false);
                    }
                  } else {
                    alert("削除に失敗しました");
                  }
                }
              }}
              className="shrink-0 p-4 text-red-400 hover:text-red-600 dark:hover:text-red-400"
              title="削除"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
