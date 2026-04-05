"use client";

import { useEffect, useState } from "react";

interface ApiKey {
  id: number;
  name: string;
  key: string;
  active: boolean;
  created_at: string;
}

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchKeys = async () => {
    const res = await fetch("/api/keys");
    if (res.ok) {
      setKeys(await res.json());
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        setNewKeyName("");
        await fetchKeys();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm("このAPIキーを無効化しますか？")) return;
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    await fetchKeys();
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">APIキー管理</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Jyoginデスクトップアプリとの連携に使用するAPIキーを管理します。
      </p>

      {/* 新規発行 */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="キーの名前（例：自宅PC）"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
        <button
          onClick={handleCreate}
          disabled={!newKeyName.trim() || loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          発行
        </button>
      </div>

      {/* 発行直後のキー表示 */}
      {newKey && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-200">
            APIキーが発行されました。この画面を閉じると再表示できません。
          </p>
          <code className="block break-all rounded bg-white p-2 text-sm dark:bg-zinc-900">
            {newKey}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(newKey);
              setNewKey(null);
            }}
            className="mt-2 text-sm text-amber-700 underline dark:text-amber-300"
          >
            コピーして閉じる
          </button>
        </div>
      )}

      {/* キー一覧 */}
      <div className="space-y-2">
        {keys.map((k) => (
          <div
            key={k.id}
            className={`flex items-center justify-between rounded-lg border p-3 ${
              k.active
                ? "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                : "border-zinc-100 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-950"
            }`}
          >
            <div>
              <span className="text-sm font-medium">{k.name}</span>
              <span className="ml-2 font-mono text-xs text-zinc-400">
                {k.key}
              </span>
              <span className="ml-2 text-xs text-zinc-400">
                {k.created_at?.slice(0, 10)}
              </span>
              {!k.active && (
                <span className="ml-2 text-xs text-red-500">無効</span>
              )}
            </div>
            {k.active && (
              <button
                onClick={() => handleRevoke(k.id)}
                className="text-sm text-zinc-400 hover:text-red-500"
              >
                無効化
              </button>
            )}
          </div>
        ))}
        {keys.length === 0 && (
          <p className="text-center text-sm text-zinc-400">
            APIキーがありません
          </p>
        )}
      </div>
    </div>
  );
}
