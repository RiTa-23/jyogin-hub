<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:product-context -->
# JyoginHub — プロダクト概要

NFC出席確認システム「Jyogin」の管理ダッシュボード。Discord OAuthでログインし、出欠記録の閲覧・管理、部員一覧の確認、APIキーの発行が行える。

## アーキテクチャ

```
[認証サーバー (外部)]  ←── OAuth連携 ──→  [JyoginHub]
  ・Discord OAuth ラッパー                    ・Next.js 16 App Router
  ・部員情報 API                               ・SQLite (better-sqlite3)
                                               ・Tailwind CSS v4

[NFCハードウェア/デスクトップアプリ (外部)]
  → APIキー認証で JyoginHub に出欠データを同期
```

- **認証は外部サーバーに委譲**: このアプリ自身は Discord OAuth を直接処理しない。`AUTH_SERVER_URL` で指定される外部認証サーバーが OAuth 認可コードフローを処理する。
- **2つの認証方式が併存**: Webダッシュボード用の cookie ベースセッション認証と、NFC連携用の APIキー認証。
- **ローカル SQLite**: 出席データ・ユーザー情報は `jyogin-hub.db` に保存。単一サーバー運用を前提。

## ディレクトリ構成

```
src/
├── app/
│   ├── layout.tsx              # ルートレイアウト
│   ├── page.tsx                # トップページ (未認証→ログインボタン、認証済→/dashboardへ)
│   ├── globals.css             # Tailwind v4 グローバルスタイル
│   ├── JyogiN.png              # アプリアイコン
│   ├── api/
│   │   ├── auth/
│   │   │   ├── callback/route.ts   # OAuthコールバック (ログイン処理)
│   │   │   └── logout/route.ts     # ログアウト
│   │   ├── attendances/
│   │   │   ├── route.ts            # GET セッション一覧
│   │   │   └── [session]/route.ts  # GET/DELETE 単一セッション
│   │   ├── hub/
│   │   │   ├── attendances/route.ts # POST 出欠同期 (APIキー認証)
│   │   │   └── members/route.ts     # GET 部員取得 (APIキー認証)
│   │   ├── keys/
│   │   │   ├── route.ts            # GET/POST APIキー
│   │   │   └── [id]/route.ts       # DELETE APIキー失効
│   │   └── members/route.ts        # GET 部員一覧 (セッション認証, 認証サーバーへのプロキシ)
│   └── dashboard/
│       ├── page.tsx                 # ダッシュボードトップ (サーバーコンポーネント)
│       ├── user-menu.tsx            # ユーザードロップダウンメニュー (クライアント)
│       ├── api-key-manager.tsx      # APIキー管理UI (クライアント)
│       ├── api-keys/page.tsx        # APIキー管理ページ (サーバー)
│       ├── members/
│       │   ├── page.tsx             # 部員一覧ページ (サーバー)
│       │   └── member-list.tsx      # 部員一覧UI (クライアント)
│       └── attendances/
│           ├── page.tsx             # 出欠記録ページ (サーバー)
│           └── attendance-view.tsx  # 出欠記録UI (クライアント)
└── lib/
    ├── auth.ts                # getSessionUser(), isAdmin()
    ├── client-auth.ts         # authFetch() — クライアント用fetchラッパー
    ├── api-auth.ts            # authenticateApiKey() — APIキー認証
    └── db.ts                  # SQLite データベースシングルトン
```

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 16.2.2 (App Router) |
| UI ライブラリ | React 19.2.4 |
| CSS | Tailwind CSS v4 |
| データベース | better-sqlite3 (同期API) |
| 認証 | カスタム OAuth 2.0 (外部サーバー委譲) |
| 型チェック | TypeScript 5 (strict mode) |
| リンター | ESLint 9 (flat config) |
| パッケージ管理 | npm |

## 認証フロー

### Web ダッシュボード (cookie セッション)

```
1. 未認証ユーザーが / にアクセス
2. getSessionUser() が cookies (user_id, access_token) を確認
   → 両方あれば /dashboard にリダイレクト
   → なければ Discord ログインボタンを表示
3. ユーザーがログインボタンをクリック → 外部認証サーバーへ
4. 認証後、/api/auth/callback?code=XXX にリダイレクト
5. 認証サーバーと code→token 交換、ユーザー情報取得
6. ローカルDBの users テーブルに upsert
7. httpOnly cookie を2つ設定 (user_id: 7日, access_token: OAuth expires_in)
8. /dashboard にリダイレクト
```

### サーバーコンポーネントの認証チェック

```typescript
// 全 dashboard/*/page.tsx で共通パターン
const user = await getSessionUser();
if (!user) {
  redirect("/");
}
```

### クライアントコンポーネントの認証チェック

```typescript
import { authFetch } from "@/lib/client-auth";

// authFetch は fetch をラップし、401 レスポンスで自動的に / にリダイレクト
const res = await authFetch("/api/attendances");
```

### API キー認証 (NFC連携用)

```typescript
// /api/hub/* のルートで使用
import { authenticateApiKey } from "@/lib/api-auth";
const auth = authenticateApiKey(request);
if (!auth) {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
```

## 各機能のデータフロー

### 出欠記録

```
[NFC デスクトップアプリ]
  → POST /api/hub/attendances (APIキー認証)
    → synced_attendances テーブルに upsert (session_name+student_id がユニーク)

[Web ダッシュボード]
  → GET /api/attendances → セッション一覧 (session_name, 件数)
  → GET /api/attendances/{session_name} → 単一セッションの詳細
    → クライアント側で /api/members のデータと student_id でマージして Discord 情報を補完
  → DELETE /api/attendances/{session_name} (管理者のみ)
```

### 部員一覧

```
→ GET /api/members?limit=N&offset=N (セッション認証)
  → 認証サーバー /oauth/members へのプロキシ (access_token を Bearer で転送)
  → ページネーションあり (limit デフォルト 50)
```

### API キー管理

```
→ GET /api/keys → ユーザーのキー一覧 (マスク表示: 先頭8文字+"...")
→ POST /api/keys → 新規発行 (既存キーを無効化後、新しいキーを生成)
  キー形式: jyogin_{crypto.randomBytes(32).toString("hex")}
→ DELETE /api/keys/{id} → キー失効 (active=0)
```

## データベーススキーマ

```sql
-- users テーブル
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT UNIQUE NOT NULL,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  access_token TEXT  -- OAuth アクセストークン (後方互換のため ALTER TABLE で追加)
);

-- api_keys テーブル
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  key TEXT UNIQUE NOT NULL,
  name TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- synced_attendances テーブル (hub/attendances で作成)
CREATE TABLE IF NOT EXISTS synced_attendances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_name TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT,
  card_uid TEXT,
  note TEXT,
  scanned_at TEXT,
  synced_at TEXT,
  UNIQUE(session_name, student_id)
);
```

## 環境変数

| 変数名 | 必須 | 説明 |
|---|---|---|
| `AUTH_SERVER_URL` | ✓ | 外部認証サーバーのベースURL |
| `CLIENT_ID` | ✓ | OAuth クライアントID |
| `CLIENT_SECRET` | ✓ | OAuth クライアントシークレット |
| `REDIRECT_URI` | ✓ | OAuth コールバックURL (認証サーバーの許可リストと一致必須) |
| `ADMIN_DISCORD_IDS` | | 管理者のDiscord ID (カンマ区切り)。空欄の場合は管理者なし |
| `NEXT_PUBLIC_BASE_URL` | | ログアウト時のリダイレクト先ベースURL (省略時は localhost:3000) |

## 実装ルール

### 共通パターン

- **サーバーコンポーネント**: `"use client"` なし。認証チェック + データ取得 + クライアントコンポーネントへの props 受け渡し。
- **クライアントコンポーネント**: `"use client"` を最上部に記述。インタラクティブなUIのみ。
- **API Route Handler**: `NextRequest` / `NextResponse` を使用。`params` は `Promise` 型（`await params` で解決）。
- **DB アクセス**: 同期的 (`better-sqlite3`)。 `getDb()` でシングルトン取得。準備済みステートメント使用。
- **インポート**: `@/` エイリアス (`@/lib/db`, `@/lib/auth`, `@/app/dashboard/...`)。
- **API エラーレスポンス**: `NextResponse.json({ error: "description" }, { status: N })`。
- **CSS**: Tailwind ユーティリティクラスのみ。CSS モジュールや styled-components は使わない。
- **状態管理**: React 組み込み (`useState`, `useEffect`)。Redux 等の外部ライブラリは使わない。

### authFetch の使い方

```typescript
import { authFetch } from "@/lib/client-auth";

// GET リクエスト
const res = await authFetch("/api/attendances");
const data = await res.json();

// POST/DELETE リクエスト
const res = await authFetch("/api/attendances/session", { method: "DELETE" });
```

### 管理者権限のチェック

```typescript
// サーバーサイド
import { getSessionUser, isAdmin } from "@/lib/auth";
const user = await getSessionUser();
const admin = user ? isAdmin(user) : false;

// DELETE API エンドポイントでは必ず isAdmin() をチェックすること
if (!isAdmin(user)) {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}
```

### 命名規則

- **ファイル名**: kebab-case (`route.ts`, `member-list.tsx`)
- **変数/関数**: camelCase (`getSessionUser`, `fetchAllMembers`)
- **DBカラム**: snake_case (`discord_id`, `scanned_at`)
- **TypeScript インターフェース**: PascalCase (`AuthUser`, `AttendanceRecord`)
- **ブランチ**: 機能単位 (feature/xxx)
- **コミットメッセージ**: 日本語 or 英語、変更の意図がわかるように

### 注意点

- **Next.js 16 の破壊的変更**: `node_modules/next/dist/docs/` を確認すること。`params` の `Promise` ラップ、`cookies()` の async、ESLint flat config など。
- **Tailwind v4**: `@import "tailwindcss"` 構文、`@theme inline` ディレクティブ。v3 の `@apply` や `@layer` とは異なる。
- **外部認証サーバーに依存**: 認証サーバーのエンドポイント (`/oauth/token`, `/oauth/userinfo`, `/oauth/members`) はこのリポジトリ外で管理。
- **OAuth token の有効期限**: `access_token` クッキーは OAuth サーバーの `expires_in` に従う。期限切れ後は `getSessionUser()` が null を返す。
- **DB の場所**: `process.cwd() + "/jyogin-hub.db"`。開発環境で再作成が必要な場合、DB ファイルを削除すれば再生成される。
- **1ユーザー1アクティブキー**: APIキーは再発行時に既存キーが無効化される。
- **コメント**: プロダクトコードのコメントは日本語。コードブロックや構造的なコメントは英語。

### 新しい機能を追加する手順

1. 必要な環境変数を `.env` と `.env.local.example` に追加
2. lib/ に関数・ユーティリティを追加
3. API ルートを app/api/ に追加
4. サーバーコンポーネントページを app/dashboard/ に追加 (認証チェック含む)
5. クライアントコンポーネントを作成 (必要に応じて authFetch 使用)
6. ビルド確認: `npm run build`
<!-- END:product-context -->
