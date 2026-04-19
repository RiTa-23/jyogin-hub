import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserMenu from "./user-menu";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-bold">JyoginHub</h1>
          <UserMenu displayName={user.display_name} avatarUrl={user.avatar_url} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8 flex gap-4">
          <a
            href="/dashboard/members"
            className="flex-1 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
          >
            <h2 className="font-bold">部員一覧</h2>
            <p className="mt-1 text-sm text-zinc-500">
              じょぎサーバーの部員を確認
            </p>
          </a>
          <a
            href="/dashboard/attendances"
            className="flex-1 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
          >
            <h2 className="font-bold">出欠記録</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Jyoginから同期された出欠データ
            </p>
          </a>
        </div>
      </main>
    </div>
  );
}
