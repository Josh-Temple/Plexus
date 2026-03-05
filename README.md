# Plexus

Android/モバイルファーストの **Zettelkasten特化 Obsidian風 PKM** MVP です。

## データの正本（Source of Truth）
- 現在の構成では **Supabase（`notes` / `links`）が正本** です。
- GitHub連携を追加する場合は、まず「Supabaseを正本のまま、必要な内容をGitHubへコミットする片方向エクスポート」を推奨します。
- この方針により、編集UX（オートセーブ・リンク解析）を維持しつつ、GitHubを履歴共有/外部連携先として使えます。


## GitHub連携（GitHub App方式）
- Note画面ヘッダーの **GitHub** ボタンから、`owner/repo/branch/path` とコミットメッセージを入力して現在ノートをコミットできます。
- 実行時は `POST /api/github/commit` がサーバー側で GitHub App JWT を生成し、Installation Token を取得した上で GitHub Contents API (`PUT /repos/{owner}/{repo}/contents/{path}`) を呼び出します。
- 初回はファイル作成、既存ファイルがある場合は `sha` を取得して更新コミットします。
- `owner/repo/branch/path` は `localStorage` に保持されます（個人トークン入力は不要）。


## GitHub連携 FAQ（現状の実装ベース）
- **GitHub App連携の方向性になっていますか？**  
  はい。現状実装は **GitHub App認証（サーバー側）** を使う方式です。
- **GitHub連携のためのUIはありますか？**  
  はい。Note画面ヘッダーの **GitHub** ボタンから、`owner/repo/branch/path` とコミットメッセージを入力できるUIがあります。
- **リポジトリは指定するのがいい？**  
  はい。`owner` と `repo` を明示入力する前提です（必要に応じて `branch` と `path` も指定）。
- **GitHub側でトークン取得したりすればいいですか？**  
  利用者がPATを発行する必要はありません。サーバーに設定したGitHub Appの資格情報を使って、都度Installation Tokenを発行して処理します。

### GitHub App設定（必須環境変数）
`.env.local` またはデプロイ先環境変数に以下を設定してください。

```bash
GITHUB_APP_ID=<GitHub App ID>
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"

# optional: /api/save-note defaults
GITHUB_NOTES_OWNER=<default owner>
GITHUB_NOTES_REPO=<default repo>
GITHUB_NOTES_BRANCH=main

# optional: restrict writable repositories
GITHUB_ALLOWED_REPOS=<owner1/repo1,owner2/repo2>
```

> `GITHUB_APP_PRIVATE_KEY` は改行を `\\n` エスケープで保持できます。



### 追加API（notes向けの推奨エンドポイント）
- `POST /api/save-note` を追加しました。
- このAPIは `title/content/path(/notes配下)` を受け取り、Markdown frontmatter付きでGitHubへ保存します。
- `path` は **`notes/` 配下かつ `.md`** に制限されます（`..` を拒否）。
- `owner/repo/branch` はリクエスト指定または環境変数 (`GITHUB_NOTES_OWNER`, `GITHUB_NOTES_REPO`, `GITHUB_NOTES_BRANCH`) から解決します。
- `GITHUB_ALLOWED_REPOS`（`owner/repo` のカンマ区切り）を設定すると、許可repo以外への書き込みを拒否します。

### GitHub App連携の残課題（推奨）
- **API認可の追加**: 現在の`/api/github/commit`はリクエスト元ユーザーの認可チェックを行っていないため、アプリ利用者の権限境界を明確化する必要があります。
- **対象リポジトリの許可リスト化**: 想定外リポジトリへの書き込み防止のため、`owner/repo`のallowlistやworkspace紐づけ制御を推奨します。
- **監査ログ/レート制限**: 誰がどのノートをどのrepoへコミットしたかの監査ログ、およびAPIレート制限の導入を推奨します。
- **エラーUX改善**: Installation未設定・権限不足・branch/path不正などGitHub APIエラーをUIで分類表示すると運用しやすくなります。

## 実装済み（MVP）
- Auth（Supabase OTPログイン）
- Home（検索 + inbox/pinned/all フィルタ + 最近順一覧 + FAB + 選択モード一括操作 + 検索ハイライト）
- Note（textarea編集 / 自動保存 / 箇条書き継続 / Preview切替）
- `[[...]]` 抽出による links 同期（差分更新）
- Backlinks / Outgoing / Related / To connect をボトムシート表示
- `[[` 入力時サジェストバー
- クイック作成ボトムシート + 類似候補 + body_hash 完全一致警告
- Noteの内部リンク解決（resolved/ambiguous/unresolved表示 + unresolved quick create）
- 保存ステータス表示（Saving/Saved/Error）
- Auth OTP sent-state UX（Resend cooldown / Edit email）

## セットアップ

### 1) 環境変数
`.env.local` を作成:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### 2) Supabase SQL
Supabase SQL Editor に以下を実行:

```sql
create extension if not exists pgcrypto;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  body_hash text,
  inbox boolean not null default true,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  from_note_id uuid not null references public.notes(id) on delete cascade,
  to_note_id uuid not null references public.notes(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;
alter table public.links enable row level security;

create policy "notes_select_own" on public.notes for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes for update using (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes for delete using (auth.uid() = user_id);

create policy "links_select_own" on public.links for select using (auth.uid() = user_id);
create policy "links_insert_own" on public.links for insert with check (auth.uid() = user_id);
create policy "links_update_own" on public.links for update using (auth.uid() = user_id);
create policy "links_delete_own" on public.links for delete using (auth.uid() = user_id);

create or replace function public.set_user_id_default()
returns trigger as $$
begin
  if NEW.user_id is null then
    NEW.user_id := auth.uid();
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger notes_set_user_id before insert on public.notes
for each row execute procedure public.set_user_id_default();

create trigger links_set_user_id before insert on public.links
for each row execute procedure public.set_user_id_default();
```

### 3) 開発
```bash
npm install
npm run dev
```


### RLSエラー（`new row violates row-level security policy for table "notes"`）の対処
このエラーは、`insert` 時に `user_id` が空またはログイン中ユーザーと一致しない場合に発生します。

- フロント側で `supabase.auth.getUser()` を呼び、`insert` 時に `user_id: user.id` を明示して送る
- すでに作成済みテーブルには以下を適用して、`user_id` のデフォルトを `auth.uid()` にする

```sql
alter table public.notes alter column user_id set default auth.uid();
alter table public.links alter column user_id set default auth.uid();
```

OTP直後はセッション反映前に書き込みが走ることがあるため、未ログイン時は `/auth` へ戻す実装も有効です。

## 主要コンポーネント
- `Home` : `src/app/page.tsx`
- `NoteEditor` : `src/components/NoteEditor.tsx`
- `BottomSheet(Links)` : `src/components/BottomSheet.tsx` + `src/app/note/[id]/page.tsx`
- `SuggestBar` : `src/components/SuggestBar.tsx`

## Vercelデプロイ
1. VercelでGitHub連携
2. Environment Variablesに `.env.local` と同じ2つを設定
3. Deploy

## Session Update (2026-03-05, note create fix)
- Fixed note creation failures in environments where `crypto.subtle` is unavailable (some insecure/dev browser contexts).
- Updated `cheapHash` in `src/lib/noteUtils.ts` to use SHA-256 when available and gracefully fall back to a deterministic non-cryptographic hash when unavailable.
- This keeps duplicate-check and create flows working instead of throwing at note creation time.
