import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL!;
const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const REDIRECT_URI = process.env.REDIRECT_URI!;

export async function GET(request: NextRequest) {
  console.log("[AUTH] callback params:", Object.fromEntries(request.nextUrl.searchParams.entries()));

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }

  // 認可コードをトークンに交換
  const tokenRes = await fetch(`${AUTH_SERVER_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  const tokenText = await tokenRes.text();
  console.log("[AUTH] token response:", tokenRes.status, tokenText);

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL(`/?error=token_failed&status=${tokenRes.status}`, request.url)
    );
  }

  const tokenData = JSON.parse(tokenText);
  const accessToken = tokenData.access_token;

  // OAuthトークンでユーザー情報取得
  const userRes = await fetch(`${AUTH_SERVER_URL}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const userText = await userRes.text();
  console.log("[AUTH] user response:", userRes.status, userText);

  if (!userRes.ok) {
    return NextResponse.redirect(
      new URL(`/?error=user_fetch_failed&status=${userRes.status}`, request.url)
    );
  }

  const userData = JSON.parse(userText);

  // DBにユーザーを登録/更新
  const db = getDb();
  db.prepare(`
    INSERT INTO users (discord_id, username, display_name, avatar_url)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(discord_id) DO UPDATE SET
      username = excluded.username,
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      updated_at = datetime('now')
  `).run(userData.discord_id, userData.username, userData.display_name, userData.avatar_url);

  // リダイレクト + Cookie設定
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set("user_id", userData.discord_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
