import { getSessionUser, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import AttendanceView from "./attendance-view";
import UserMenu from "../user-menu";

export default async function AttendancesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              &larr; ダッシュボード
            </a>
            <h1 className="text-lg font-bold">出欠記録</h1>
          </div>
          <UserMenu displayName={user.display_name} avatarUrl={user.avatar_url} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <AttendanceView isAdmin={isAdmin(user)} />
      </main>
    </div>
  );
}
