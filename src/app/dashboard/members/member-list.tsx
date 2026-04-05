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
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 50;

  const fetchMembers = async (newOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/members?limit=${limit}&offset=${newOffset}`
      );
      if (!res.ok) throw new Error("取得に失敗しました");
      const data = await res.json();
      const list: Member[] = Array.isArray(data) ? data : data.members ?? [];
      const dedupe = (arr: Member[]) => {
        const seen = new Set<string>();
        return arr.filter((m) => {
          if (seen.has(m.discord_id)) return false;
          seen.add(m.discord_id);
          return true;
        });
      };
      if (newOffset === 0) {
        setMembers(dedupe(list));
      } else {
        setMembers((prev) => dedupe([...prev, ...list]));
      }
      setHasMore(list.length >= limit);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers(0);
  }, []);

  const handleLoadMore = () => {
    const next = offset + limit;
    setOffset(next);
    fetchMembers(next);
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-6 text-sm text-zinc-500">
        じょぎDiscordサーバーのメンバー一覧です。
      </p>

      <div className="space-y-2">
        {members.map((m, i) => (
          <div
            key={`${m.discord_id}-${i}`}
            className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
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
                <span className="font-medium">{m.display_name}</span>
                <span className="text-xs text-zinc-400">@{m.username}</span>
              </div>
              {m.profile?.real_name && (
                <span className="text-sm text-zinc-500">
                  {m.profile.real_name}
                </span>
              )}
              {m.guild_roles && m.guild_roles.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {m.guild_roles.map((role) => (
                    <span
                      key={role}
                      className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <p className="mt-4 text-center text-sm text-zinc-400">読み込み中...</p>
      )}

      {!loading && members.length === 0 && (
        <p className="text-center text-sm text-zinc-400">
          メンバーが見つかりません
        </p>
      )}

      {!loading && hasMore && members.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            もっと読み込む
          </button>
        </div>
      )}
    </div>
  );
}
