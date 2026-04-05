import { NextRequest, NextResponse } from "next/server";

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL!;

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const limit = searchParams.get("limit") || "50";
  const offset = searchParams.get("offset") || "0";

  const res = await fetch(
    `${AUTH_SERVER_URL}/oauth/members?limit=${limit}&offset=${offset}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "fetch_failed" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
