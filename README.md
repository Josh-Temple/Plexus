# Plexus

Android/モバイルファーストの **Zettelkasten特化 Obsidian風 PKM** MVP です。

## 実装済み（MVP）
- Auth（Supabase OTPログイン）
- Home（検索 + inbox/pinned/all フィルタ + 最近順一覧 + FAB）
- Note（textarea編集 / 自動保存 / 箇条書き継続 / Preview切替）
- `[[...]]` 抽出による links 同期（差分更新）
- Backlinks / Outgoing / Related / To connect をボトムシート表示
- `[[` 入力時サジェストバー
- クイック作成ボトムシート + 類似候補 + body_hash 完全一致警告

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
