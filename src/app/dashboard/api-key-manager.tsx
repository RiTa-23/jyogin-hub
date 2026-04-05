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
  const [activeKey, setActiveKey] = useState<ApiKey | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchKeys = async () => {
    const res = await fetch("/api/keys");
    if (res.ok) {
      const keys: ApiKey[] = await res.json();
      setActiveKey(keys.find((k) => k.active) ?? null);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleIssue = async () => {
    const msg = activeKey
      ? "現在のAPIキーを無効化して再発行しますか？"
      : "APIキーを発行しますか？";
    if (!confirm(msg)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "default" }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        await fetchKeys();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">APIキー管理</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Jyoginデスクトップアプリとの連携に使用するAPIキーを管理します。
      </p>

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

      {/* 現在のキー */}
      {activeKey ? (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div>
            <span className="font-mono text-sm text-zinc-500">{activeKey.key}</span>
            <span className="ml-2 text-xs text-zinc-400">
              {activeKey.created_at?.slice(0, 10)}
            </span>
          </div>
          <span className="text-xs text-green-600">有効</span>
        </div>
      ) : (
        <p className="mb-4 text-center text-sm text-zinc-400">
          APIキーがありません
        </p>
      )}

      <button
        onClick={handleIssue}
        disabled={loading}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {loading ? "処理中..." : activeKey ? "APIキーを再発行" : "APIキーを発行"}
      </button>
    </div>
  );
}
