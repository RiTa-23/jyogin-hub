"use client";

import { useEffect, useState } from "react";

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
}

export default function AttendanceView() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/attendances")
      .then((res) => res.json())
      .then((data) => setSessions(data.sessions ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (sessionName: string) => {
    setSelected(sessionName);
    const res = await fetch(
      `/api/attendances/${encodeURIComponent(sessionName)}`
    );
    const data = await res.json();
    setRecords(data.attendances ?? []);
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
          }}
          className="mb-4 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          &larr; セッション一覧に戻る
        </button>

        <h2 className="mb-2 text-lg font-bold">{selected}</h2>
        <p className="mb-4 text-sm text-zinc-500">{records.length}名</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
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
                  <td className="py-2 pr-4 font-mono text-xs">{r.student_id}</td>
                  <td className="py-2 pr-4">{r.student_name}</td>
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
          <button
            key={s.session_name}
            onClick={() => handleSelect(s.session_name)}
            className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
          >
            <div>
              <span className="font-medium">{s.session_name}</span>
              <span className="ml-3 text-xs text-zinc-400">
                {s.first_synced?.slice(0, 10)}
              </span>
            </div>
            <span className="text-sm text-zinc-500">{s.count}名</span>
          </button>
        ))}
      </div>
    </div>
  );
}
