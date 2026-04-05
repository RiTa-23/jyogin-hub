import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }

  const authUrl =
    `${process.env.AUTH_SERVER_URL}/oauth/authorize` +
    `?client_id=${process.env.CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI!)}` +
    `&response_type=code`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold">JyoginHub</h1>
        <p className="mb-8 text-zinc-500">NFC 出席確認 管理サーバー</p>
        <a
          href={authUrl}
          className="inline-flex items-center gap-2 rounded-lg bg-[#5865f2] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#4752c4]"
        >
          Discordでログイン
        </a>
      </div>
    </div>
  );
}
