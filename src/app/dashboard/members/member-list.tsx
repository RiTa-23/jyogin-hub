"use client";

import { useEffect, useState } from "react";

interface Member {
  discord_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  guild_roles: string[];
  profile?: {
    real_name?: string;
    student_id?: string;
    hobbies?: string;
    what_to_do?: string;
    comment?: string;
  };
}

export default function MemberList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchAllMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const all: Member[] = [];
      let offset = 0;
      const limit = 100;
      while (true) {
        const res = await fetch(`/api/members?limit=${limit}&offset=${offset}`);
        if (!res.ok) throw new Error("取得に失敗しました");
        const data = await res.json();
        const list: Member[] = Array.isArray(data) ? data : data.members ?? [];
        all.push(...list);
        if (list.length < limit) break;
        offset += limit;
      }
      const seen = new Set<string>();
      setMembers(all.filter((m) => {
        if (seen.has(m.discord_id)) return false;
        seen.add(m.discord_id);
        return true;
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMembers();
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        {error}
      </div>
    );
  }

  const q = search.toLowerCase();
  const filtered = members.filter((m) => {
    if (!q) return true;
    return (
      m.display_name?.toLowerCase().includes(q) ||
      m.username?.toLowerCase().includes(q) ||
      m.discord_id?.includes(q) ||
      m.profile?.real_name?.toLowerCase().includes(q) ||
      m.profile?.student_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {search
            ? `${filtered.length} / ${members.length} 人`
            : `${members.length} 人`}
        </p>
      </div>

      <input
        type="text"
        placeholder="名前・学籍番号・Discord名で検索..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
      />

      <div className="space-y-2">
        {filtered.map((m, i) => {
          const missing = [
            !m.display_name && "表示名",
            !m.username && "ユーザー名",
            !m.profile?.real_name && "本名",
            !m.profile?.student_id && "学籍番号",
          ].filter(Boolean) as string[];
          const hasMissing = missing.length > 0;

          return (
            <div
              key={`${m.discord_id}-${i}`}
              className={`flex items-center gap-4 rounded-lg border p-4 ${
                hasMissing
                  ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
                  : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
              }`}
            >
              {m.avatar_url ? (
                <img
                  src={m.avatar_url}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                  {m.display_name?.charAt(0) || "?"}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {m.display_name || <span className="italic text-zinc-400">表示名なし</span>}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {m.username ? `@${m.username}` : <span className="italic">ユーザー名なし</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <span>{m.profile?.real_name || <span className="italic text-zinc-400">本名未登録</span>}</span>
                  <span className="font-mono text-xs">
                    {m.profile?.student_id || <span className="italic text-zinc-400">学籍番号未登録</span>}
                  </span>
                </div>
                {hasMissing && (
                  <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    未登録: {missing.join("・")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <p className="mt-4 text-center text-sm text-zinc-400">読み込み中...</p>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-center text-sm text-zinc-400">
          {search ? "該当する部員が見つかりません" : "部員が見つかりません"}
        </p>
      )}

    </div>
  );
}
