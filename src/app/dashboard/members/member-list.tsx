"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/client-auth";

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

interface Correction {
  display_name: string | null;
  real_name: string | null;
  student_id: string | null;
  hobbies: string | null;
  what_to_do: string | null;
  comment: string | null;
}

type CorrectionMap = Record<string, Correction>;

function applyCorrection(m: Member, correction: Correction | undefined): Member {
  if (!correction) return m;
  return {
    ...m,
    display_name: correction.display_name ?? m.display_name,
    profile: {
      real_name: correction.real_name ?? m.profile?.real_name,
      student_id: correction.student_id ?? m.profile?.student_id,
      hobbies: correction.hobbies ?? m.profile?.hobbies,
      what_to_do: correction.what_to_do ?? m.profile?.what_to_do,
      comment: correction.comment ?? m.profile?.comment,
    },
  };
}

function hasCorrection(m: Member, correction: Correction | undefined): boolean {
  if (!correction) return false;
  return (
    correction.display_name !== null ||
    correction.real_name !== null ||
    correction.student_id !== null ||
    correction.hobbies !== null ||
    correction.what_to_do !== null ||
    correction.comment !== null
  );
}

interface EditForm {
  display_name: string;
  real_name: string;
  student_id: string;
  hobbies: string;
  what_to_do: string;
  comment: string;
}

export default function MemberList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [corrections, setCorrections] = useState<CorrectionMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({
    display_name: "",
    real_name: "",
    student_id: "",
    hobbies: "",
    what_to_do: "",
    comment: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchAllMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const all: Member[] = [];
      let offset = 0;
      const limit = 100;
      while (true) {
        const res = await authFetch(`/api/members?limit=${limit}&offset=${offset}`);
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

  const fetchCorrections = async () => {
    try {
      const res = await authFetch("/api/members/corrections");
      const data = await res.json();
      setCorrections(data.corrections ?? {});
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAllMembers();
    fetchCorrections();
  }, []);

  const openEdit = (m: Member) => {
    const c = corrections[m.discord_id];
    setEditing(m.discord_id);
    setForm({
      display_name: c?.display_name ?? m.display_name ?? "",
      real_name: c?.real_name ?? m.profile?.real_name ?? "",
      student_id: c?.student_id ?? m.profile?.student_id ?? "",
      hobbies: c?.hobbies ?? m.profile?.hobbies ?? "",
      what_to_do: c?.what_to_do ?? m.profile?.what_to_do ?? "",
      comment: c?.comment ?? m.profile?.comment ?? "",
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/members/corrections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discord_id: editing,
          display_name: form.display_name || null,
          real_name: form.real_name || null,
          student_id: form.student_id || null,
          hobbies: form.hobbies || null,
          what_to_do: form.what_to_do || null,
          comment: form.comment || null,
        }),
      });
      if (res.ok) {
        setCorrections((prev) => ({
          ...prev,
          [editing]: {
            display_name: form.display_name || null,
            real_name: form.real_name || null,
            student_id: form.student_id || null,
            hobbies: form.hobbies || null,
            what_to_do: form.what_to_do || null,
            comment: form.comment || null,
          },
        }));
        setEditing(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const isCorrectionDirty = (m: Member): boolean => {
    const c = corrections[m.discord_id];
    if (!c) return false;
    return (
      (c.display_name !== null && c.display_name !== m.display_name) ||
      (c.real_name !== null && c.real_name !== (m.profile?.real_name ?? null)) ||
      (c.student_id !== null && c.student_id !== (m.profile?.student_id ?? null))
    );
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        {error}
      </div>
    );
  }

  const q = search.toLowerCase();
  const merged = members.map((m) => ({
    member: applyCorrection(m, corrections[m.discord_id]),
    original: m,
  }));
  const filtered = merged.filter(({ member: m }) => {
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
        {filtered.map(({ member: m, original }) => {
          const missing = [
            !m.display_name && "表示名",
            !m.username && "ユーザー名",
            !m.profile?.real_name && "本名",
            !m.profile?.student_id && "学籍番号",
          ].filter(Boolean) as string[];
          const hasMissing = missing.length > 0;
          const corrected = hasCorrection(original, corrections[original.discord_id]);

          return (
            <div
              key={original.discord_id}
              className={`flex items-center gap-4 rounded-lg border p-4 ${
                corrected
                  ? "border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950"
                  : hasMissing
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
                    {corrected && <span className="ml-1.5 text-xs text-sky-500">(編集中)</span>}
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

              <button
                onClick={() => openEdit(original)}
                className="shrink-0 rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                title="編集"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-bold">部員情報を編集</h3>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">表示名</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">本名</label>
                <input
                  type="text"
                  value={form.real_name}
                  onChange={(e) => setForm({ ...form, real_name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">学籍番号</label>
                <input
                  type="text"
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">趣味</label>
                <input
                  type="text"
                  value={form.hobbies}
                  onChange={(e) => setForm({ ...form, hobbies: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">やりたいこと</label>
                <input
                  type="text"
                  value={form.what_to_do}
                  onChange={(e) => setForm({ ...form, what_to_do: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">コメント</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
