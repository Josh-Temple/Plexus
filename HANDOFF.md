# 1. 現在のゴール / Doneの定義

> 運用ルール: **このHANDOFF.mdはセッションごとに必ず更新すること**（作業有無にかかわらず、実施内容/未実施内容を追記）。

## 現在のゴール（優先順）
1. **Obsidian的な知識ネットワーク機能の再現を安定化**（`[[...]]`リンク同期、Backlinks/Outgoing/Related表示の実利用レベル化）。
2. **入力・表示（Preview）の安定化**（カーソルジャンプ修正、ヘッダーのプレビュー反映不具合を修正）。
3. 既存UI変更後の回帰確認（Home/Auth/Note編集/BottomSheet/SuggestBar/Toast）。

## Doneの定義
- 見出し入力（例: `# H1` / `＃ H1`）が編集エリア・プレビュー双方で意図どおり表示される。
- ノート切替時に title/body が不整合なく同期される。
- `[[タイトル]]` のリンク同期（追加・削除）が壊れていない。
- `npm run lint` / `npm run typecheck` が成功。
- `.env.local` 設定済み環境で `/auth` と `/` が 500 にならない。

---

# 2. ここまでにやったこと（箇条書き、重要なコミット/PRがあればID）

- 本セッションでバレットリスト階層のPreview反映を追加修正（コミット予定）。
- `src/lib/noteUtils.ts` でインデント幅を2スペース単位の階層として正規化し、ネスト解釈を安定化。
- `src/app/globals.css` でネストした`ul`の見た目を強化（2階層目: circle, 3階層目以降: square）。
- 本セッションで不具合修正を実施（未コミット）。
- `src/components/NoteEditor.tsx` で、**同一ノート編集中の再同期を抑止**し、ノート切替時のみ`title/body`を再初期化するように変更。
  - これにより autosave 後の再描画で発生していた入力カーソルジャンプを抑制。
- `src/lib/noteUtils.ts` の `markdownLite` を改善。
  - 行頭空白や全角 `＃` を許容し、見出し判定を安定化。
  - インラインテキストをHTMLエスケープしてプレビューの安全性を向上。
- `npm run lint` / `npm run typecheck` の通過を確認。

> 重要: 次セッションでも HANDOFF.md を必ず更新する運用を継続すること。

---

# 3. 変更した主要ファイル（パス + 変更概要 + 影響範囲）

1. `src/app/page.tsx`
   - Home画面の構成・文言を英語化、ボタン/フィルタ/作成シートのUI再編。
   - `FILTER_OPTIONS` / `getErrorMessage` を導入。
   - 影響範囲: ノート一覧表示、検索・フィルタ、作成、import導線。

2. `src/app/note/[id]/page.tsx`
   - 文言英語化、Connectionsシート見出し整理、エラーメッセージ処理整理。
   - 影響範囲: ノート詳細、links同期、related/backlinks/outgoing表示。

3. `src/components/NoteEditor.tsx`
   - `note` 切替時に `title/body` を `useEffect` で再同期する処理を追加。
   - 影響範囲: ノート編集体験、プレビュー表示整合性。

4. `src/app/globals.css`
   - 共通クラス（`surface`, `input-base`, `btn-ghost`, `btn-primary`）追加。
   - 影響範囲: Auth/Home/Note/BottomSheet/SuggestBar/Toast の外観。

5. `src/components/BottomSheet.tsx`
   - 背景/閉じるボタンのスタイル調整、文言英語化。
   - 影響範囲: 作成シート、Connectionsシート。

6. `src/components/SuggestBar.tsx`
   - サジェストバーのスタイル最小化。
   - 影響範囲: `[[` 入力時の候補表示。

7. `src/components/Toast.tsx`
   - Toast外観を共通surface化。
   - 影響範囲: 全画面通知表示。

8. `src/app/auth/page.tsx`
   - 文言英語化・ボタンスタイル共通化。
   - 影響範囲: OTPログイン画面。

9. `src/app/layout.tsx`
   - `<html lang="ja">` -> `<html lang="en">`。
   - 影響範囲: ページ言語属性。

---

# 4. 現在の状態（動く/動かない、どこが壊れているか）

## 動く
- `npm run lint` 成功。
- `npm run typecheck` 成功。

## 動かない / 要設定
- `.env.local` 未設定のまま `npm run dev` + `/auth` へアクセスすると **500**。
- 例外: `supabaseUrl is required.`（`src/lib/supabaseClient.ts` 初期化時）。

## 修正済み（今回）
- ユーザー報告の「バレットリストの階層がプレビューで表現されない」症状に対して、ネスト階層の解釈とCSS表示を改善。
- ユーザー報告の「ヘッダー入力が表示に反映されない」症状に対して、`markdownLite`の見出し判定を強化（先頭空白と全角`＃`に対応）。
- 入力中にカーソルが飛ぶ症状に対して、`NoteEditor`の再同期条件を「note.id変更時のみ」に限定。
## 未確認
- 前回PRの「inline comments」はローカルから参照不可で内容不明。
  - 確認方法: GitHub PR Review の Files changed タブで未解決コメントを確認。

---

# 5. 再現手順（コマンド、入力例、期待結果、実結果、ログ場所）

## A. `/auth` 500（env不足）
1. 実行:
   ```bash
   npm run dev
   ```
2. 別ターミナルで:
   ```bash
   curl -i http://127.0.0.1:3000/auth
   ```
3. 期待結果:
   - 認証画面HTML（200）
4. 実結果:
   - `HTTP/1.1 500 Internal Server Error`
   - サーバーログに `supabaseUrl is required.`
5. ログ場所:
   - 実行端末の標準出力
   - 本セッション検証時: `/tmp/plexus-dev.log`, `/tmp/plexus-auth-response.txt`

## B. ユーザー報告「ヘッダー反映不具合」
- 状態: **未再現（不明）**
- 確認方法（次セッション）:
  1. `.env.local` を設定して正常起動。
  2. ノート本文に `# Heading Test` を入力。
  3. Previewへ切替。
  4. `h1` としてレンダリングされるか、入力中タイトルとの不整合がないか確認。
  5. 失敗時は `src/lib/noteUtils.ts` の `markdownLite` 実装を重点調査。

---

# 6. テスト状況（実行したテスト、結果、未実施のテスト）

## 実行済み
- `npm run typecheck` -> 成功（今回の追加修正後もTypeScriptエラーなし）
- `npm run lint` -> 成功（今回の追加修正後もESLint warning/error なし）
- `npm run lint` -> 成功（ESLint warning/error なし）
- `npm run typecheck` -> 成功（TypeScriptエラーなし）
- `npm run dev` + `curl /auth` -> 500再現（env未設定時）

## 未実施
- `.env.local` を設定した状態でのE2E確認（Auth -> Home -> Note編集 -> Preview -> Links同期）。
- ユーザー報告不具合（ヘッダー反映）の再現試験。
- 実DBを使ったリンク同期の回帰（toInsert/toDelete差分更新）。

---

# 7. 未解決タスク（優先度順、次の一手を“具体的な手順”で）

## P0
1. **ヘッダー反映不具合の再現と原因特定**
   - 手順:
     1. `.env.local` を作成（`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`）。
     2. `npm run dev` 起動。
     3. ノート作成 -> 本文へ `#` 見出し入力 -> Preview切替。
     4. 反映不良時、`src/components/NoteEditor.tsx` と `src/lib/noteUtils.ts` の markdown変換ロジックを点検。

## P1
2. **Obsidianの知識ネットワーク機能の再現度チェック**
   - 手順:
     1. 3ノート以上作成。
     2. `[[title]]` を使い相互リンク作成。
     3. Backlinks/Outgoing/Related/To connect の整合性を目視確認。
     4. linksテーブル差分更新（追加/削除）がDB上で正しいか確認。

## P2
3. **前回PRのinline comment対応**
   - 状態: コメント内容不明。
   - 手順:
     1. GitHubで対象PRを開く。
     2. 未解決レビューコメントを抽出。
     3. 1件ずつIssue化または修正コミット化。

## P3
4. **UI変更後の回帰確認（最低限）**
   - 手順:
     1. Auth画面表示。
     2. Home検索/フィルタ。
     3. Note edit/preview。
     4. BottomSheet開閉、SuggestBar表示。

---

# 8. 重要な意思決定ログ（採用案/却下案と理由、トレードオフ）

- 採用: 全文言英語化。
  - 理由: 要件「文言は全て英語で統一」。
  - トレードオフ: 既存日本語ユーザーには一時的に違和感。

- 採用: 共通スタイルクラスを `globals.css` に追加。
  - 理由: Tailwind断片の重複削減と一貫性向上。
  - トレードオフ: コンポーネント個別最適化の自由度は下がる。

- 採用: `NoteEditor` で `note` 変更時に `title/body` を再同期。
  - 理由: ノート切替時の表示不整合防止。
  - トレードオフ: autosaveタイミングとの干渉リスク（要実地確認）。

- 不明: 前回PRのレビューコメント内容。
  - 理由: ローカル環境から確認不可。
  - 確認方法: GitHub PRのinline comment参照。

---

# 9. 環境・設定メモ（env、API keyの名前、URL設定、バージョン）

## 必須env
`.env.local` に以下を設定:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

## 主要コマンド
```bash
npm install
npm run dev
npm run lint
npm run typecheck
```

## 主要URL
- 開発: `http://localhost:3000`
- 認証画面: `http://localhost:3000/auth`

## バージョン（package.jsonベース）
- Next.js: `^15.0.0`（実行ログ上 `15.5.12`）
- React: `19.0.0`
- TypeScript: `^5.7.2`
- Supabase JS: `^2.49.1`

## 注意
- `npm warn Unknown env config "http-proxy"` が表示されるが、lint/typecheckは通過。

---

# 10. 次セッション開始時のチェックリスト（5〜10項目）

1. `git status --short` で作業ツリー確認（不要差分がないか）。
2. `.env.local` の2変数が設定済みか確認。
3. `npm install` 実行済みか確認。
4. `npm run dev` 起動後、`/auth` が500にならないことを確認。
5. ノート作成後、`# Heading Test` のPreview反映を確認。
6. `[[...]]` 入力でSuggestBar・links同期が動くか確認。
7. Connectionsシート（Related/Backlinks/Outgoing）が正しいか確認。
8. `npm run lint` / `npm run typecheck` を再実行。
9. GitHub PRのinline comments未解決分を確認。
10. 修正方針を最小単位のコミットに分割して着手。
11. 作業完了時にHANDOFF.mdの「実施内容・テスト結果・未解決事項」を更新。

---

**次に着手するタスクはこれ:** `.env.local` を正しく設定した状態で「ヘッダーが入力してもプレビューに反映されない」不具合を再現し、`NoteEditor` と `markdownLite` のどちらが原因かを切り分ける。
