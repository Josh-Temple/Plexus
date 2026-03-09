# 1. 現在のゴール / Doneの定義

> 運用ルール: **このHANDOFF.mdはセッションごとに必ず更新すること**（作業有無にかかわらず、実施内容/未実施内容を追記）。

## 現在のゴール（優先順）
1. **ノート編集UXの改善**（初期表示はPreview、入力欄タップで編集モードへ遷移、カードUI強化）。
2. **Obsidian的な知識ネットワーク機能の再現を安定化**（`[[...]]`リンク同期、Backlinks/Outgoing/Related表示の実利用レベル化）。
3. 既存UI変更後の回帰確認（Home/Auth/Note編集/BottomSheet/SuggestBar/Toast）。

## Doneの定義
- 見出し入力（例: `# H1` / `＃ H1`）が編集エリア・プレビュー双方で意図どおり表示される。
- ノート切替時に title/body が不整合なく同期される。
- `[[タイトル]]` のリンク同期（追加・削除）が壊れていない。
- `npm run lint` / `npm run typecheck` が成功。
- `.env.local` 設定済み環境で `/auth` と `/` が 500 にならない。

---

# 2. ここまでにやったこと（箇条書き、重要なコミット/PRがあればID）


## 2026-03-05 Session Update (Open issues review for GitHub App flow)
- Reviewed README/HANDOFF and documented remaining risks after the GitHub App pivot.
- Added a README section for follow-up items: API authorization, repository allowlist, audit/rate limiting, and clearer GitHub error UX.
- No runtime behavior change; documentation-only clarification for next implementation cycle.

## 2026-03-05 Session Update (GitHub App pivot)
- Switched GitHub commit API auth flow from user-supplied PAT to server-side GitHub App authentication.
- Updated `src/app/api/github/commit/route.ts` to mint app JWT, resolve repository installation, issue installation token, and commit via Contents API.
- Removed token input from GitHub commit UI (`src/components/GitHubCommitPanel.tsx`) and note page wiring (`src/app/note/[id]/page.tsx`).
- Updated `README.md` to document GitHub App flow and required environment variables (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`).

## 2026-03-05 Session Update (GitHub Q&A clarification)
- Reviewed README and existing GitHub integration implementation to answer product-direction questions.
- Added a GitHub integration FAQ in `README.md` clarifying that current MVP uses PAT-based API calls, not GitHub App flow.
- Documented recommended input fields (`owner/repo/branch/path`) and token scope expectations for current operation.
- No runtime behavior change; documentation-only update.


## 2026-03-05 Session Update
- No code behavior changes were made in this session; only documentation was updated.
- Confirmed project direction: current architecture treats Supabase as source of truth for notes/links.
- Updated `README.md` with an explicit “Source of Truth” section and recommended GitHub export direction.
- User follow-up to address next session: clarify owner tasks for enabling GitHub commit integration (token/app setup + repo permissions).

## 2026-03-05 Session Update (GitHub refactor)
- Refactored GitHub commit UI into a dedicated component: `src/components/GitHubCommitPanel.tsx`.
- Reduced `src/app/note/[id]/page.tsx` complexity by delegating GitHub form rendering to the new component.
- Improved token handling: GitHub token is no longer persisted in `localStorage`; only repo metadata is persisted.
- Updated `README.md` to reflect the new token persistence behavior.
- Validation run: `npm run lint` and `npm run typecheck`.

## 2026-03-05 Session Update (GitHub integration)
- Implemented a GitHub commit MVP for notes.
- Added `src/app/api/github/commit/route.ts` to create/update files via GitHub Contents API.
- Extended `src/app/note/[id]/page.tsx` with a GitHub panel (owner/repo/branch/path/token + commit message + commit action).
- GitHub settings are persisted in browser `localStorage` (`plexus-github-config`) for convenience in MVP.
- Fixed a duplicated `<Link>` line in the Ambiguous wiki links rendering block.
- Updated `README.md` with GitHub integration usage and security caveat.
- Next step recommendation: replace localStorage token usage with secure server-side storage or GitHub App flow.

- 2026-02-16 本セッションで **Phase 2 (Home Discoverability)** の一部を実施（メタデータチップ + 検索対象トグル）。
- `src/app/page.tsx` に検索対象トグル（Title / Title + Body）を追加し、クエリ対象カラムを切り替え可能にした。
- `src/app/page.tsx` のノートカードにメタデータチップ（更新相対時刻 / Inbox / Pinned / Wikiリンク数）を追加した。
- PlaywrightでHome画面の更新後スクリーンショットを取得（`artifacts/home-phase2.png`）。
- 2026-02-16 本セッションで **Phase 1 (Stability & Onboarding)** の着手を実施。
- `src/lib/supabaseClient.ts` に envガード（不足キー検出 + `isSupabaseConfigured`）を追加し、未設定時の起動クラッシュを回避。
- `src/components/SetupRequired.tsx` を新規追加し、不足している `.env.local` キー名を画面表示するガイドUIを導入。
- `/`・`/auth`・`/note/[id]` で env未設定時に SetupRequired を表示するよう統一。
- `npm run lint` / `npm run typecheck` / `curl` による `/`, `/auth`, `/note/test-id` のHTTP 200確認を実施。
- Playwrightで `/auth` の setup-required 画面スクリーンショットを取得。
- 本セッションでMarkdownコードブロック（```）のPreview描画を追加。
- 本セッションでコードブロック右上にCopyボタンを追加し、クリックでクリップボードへコピーできるように対応。
- 本セッションでCopy成功/失敗のToast通知をNote画面に連携。
- 本セッションで `---` の水平線（`<hr />`）をPreviewで表示できるように対応（コミット予定）。
- 本セッションでバレットリスト階層のPreview反映を追加修正（コミット予定）。
- 本セッションで NoteEditor を「初期Preview表示 + タップで編集開始」の挙動に変更。
- 本セッションで NoteEditor をカード風UIに統一し、タイトル表示を強調。
- `src/lib/noteUtils.ts` でインデント幅を2スペース単位の階層として正規化し、ネスト解釈を安定化。
- `src/app/globals.css` でネストした`ul`の見た目を強化（2階層目: circle, 3階層目以降: square）。
- 本セッションで不具合修正を実施（未コミット）。
- `src/components/NoteEditor.tsx` で、**同一ノート編集中の再同期を抑止**し、ノート切替時のみ`title/body`を再初期化するように変更。
  - これにより autosave 後の再描画で発生していた入力カーソルジャンプを抑制。
- `src/lib/noteUtils.ts` の `markdownLite` を改善。
  - `---`（ハイフン3つ以上のみの行）を水平線として解釈し、Previewに`<hr />`を出力。
  - 行頭空白や全角 `＃` を許容し、見出し判定を安定化。
  - インラインテキストをHTMLエスケープしてプレビューの安全性を向上。
- `npm run lint` / `npm run typecheck` の通過を確認。

> 重要: 次セッションでも HANDOFF.md を必ず更新する運用を継続すること。

---

# 3. 変更した主要ファイル（パス + 変更概要 + 影響範囲）

0. `src/app/page.tsx`
   - 単体削除・一括削除の実行前に `window.confirm` ダイアログを表示するよう変更。
   - ノートカードのリンク領域を本文/メタデータまで拡張し、遷移しやすさを改善。
   - 影響範囲: Homeの削除操作安全性、ノート詳細への遷移操作性。

0. `src/app/page.tsx`
   - Homeの検索対象を`title`限定/`title+body`で切替可能に変更。
   - ノートカードに「更新時刻 / 状態 / wikiリンク数」のメタデータチップを追加。
   - 影響範囲: Homeの探索性、検索体験、一覧カード情報量。

1. `src/lib/noteUtils.ts`
   - Markdownのコードフェンス（```lang ... ```）をPreviewでHTML化し、ヘッダーに言語表示＋Copyボタンを出すように拡張。
   - 未クローズのコードフェンス終端なしケースでも末尾までをコードブロックとして描画。
   - 影響範囲: ノートPreviewレンダリング（コード表示/コピーUI）。

2. `src/components/NoteEditor.tsx`
   - Preview本文をクリック可能コンテナに変更し、コードコピーボタンクリック時は編集遷移せずClipboardコピーを実行。
   - コピー成功/失敗を親へ通知できる`onNotify`を追加。
   - 影響範囲: ノートPreview操作、コピー体験、Toast連携。

3. `src/app/note/[id]/page.tsx`
   - `NoteEditor`へ`onNotify={setToast}`を渡し、コピー結果をToastで表示。
   - 影響範囲: ノート詳細画面の通知。

8. `src/app/globals.css`
   - `.markdown-preview`配下にコードブロック用スタイル（ヘッダー、言語ラベル、Copyボタン、`pre/code`）を追加。
   - 影響範囲: Previewの見た目。

5. `src/app/page.tsx`
   - Home画面の構成・文言を英語化、ボタン/フィルタ/作成シートのUI再編。
   - `FILTER_OPTIONS` / `getErrorMessage` を導入。
   - 影響範囲: ノート一覧表示、検索・フィルタ、作成、import導線。

6. `src/app/note/[id]/page.tsx`
   - 文言英語化、Connectionsシート見出し整理、エラーメッセージ処理整理。
   - 影響範囲: ノート詳細、links同期、related/backlinks/outgoing表示。

7. `src/components/NoteEditor.tsx`
   - デフォルト表示をPreviewへ変更。
   - Preview時のタイトル/本文をタップするとEditに切り替わる挙動を追加。
   - カード風ラッパーと目立つタイトル表示（大きめタイポ）に変更。
   - 影響範囲: ノート編集体験、プレビュー導線、ビジュアル。

8. `src/app/globals.css`
   - 共通クラス（`surface`, `input-base`, `btn-ghost`, `btn-primary`）追加。
   - 影響範囲: Auth/Home/Note/BottomSheet/SuggestBar/Toast の外観。

9. `src/components/BottomSheet.tsx`
   - 背景/閉じるボタンのスタイル調整、文言英語化。
   - 影響範囲: 作成シート、Connectionsシート。

10. `src/components/SuggestBar.tsx`
   - サジェストバーのスタイル最小化。
   - 影響範囲: `[[` 入力時の候補表示。

11. `src/components/Toast.tsx`
   - Toast外観を共通surface化。
   - 影響範囲: 全画面通知表示。

12. `src/app/auth/page.tsx`
   - 文言英語化・ボタンスタイル共通化。
   - 影響範囲: OTPログイン画面。

13. `src/app/layout.tsx`
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
- ユーザー要望「アプリ起動時はデフォルトでプレビュー表示」に対応。
- ユーザー要望「入力欄タップで編集モード」に対応（Previewタイトル/本文をタップでEdit遷移）。
- ユーザー要望「カードっぽいUI + ページタイトル目立たせる」に対応（タイトル表示を強調）。
- ユーザー要望の「`---`で水平線を出したい」に対して、`markdownLite`で水平線記法をサポート。
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
- `npm run lint` -> 成功（Phase 2: Home metadata/search scope対応後）
- `npm run typecheck` -> 成功（Phase 2: Home metadata/search scope対応後）
- `npm run lint` -> 成功（コードブロックPreview/Copy対応後）
- `npm run typecheck` -> 成功（コードブロックPreview/Copy対応後）
- `npm run lint` -> 成功（NoteEditorのUI変更後）
- `npm run typecheck` -> 成功（NoteEditorのUI変更後）
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
4. **UI変更後の回帰確認（Home含む最低限）**
   - 手順:
     1. Auth画面表示。
     2. Home検索/フィルタ。
     3. Homeの検索対象トグル（Title / Title + Body）で結果差分を確認。
     4. Note edit/preview。
     5. BottomSheet開閉、SuggestBar表示。

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

**次に着手するタスクはこれ:** `.env.local` を正しく設定した状態で Phase 1 の残件（env設定ありで `/auth`・`/`・`/note/[id]` の動作確認）を完了し、その後に「ヘッダーが入力してもプレビューに反映されない」不具合の再現/切り分けに着手する。

---

# 11. 全改善案の段階実装プラン（2026-02-16追記）

> ユーザー要望: 「挙げた改善案を一気に実装すると詰まりそうなので、まずは計画をHANDOFFに明文化する」。

## 実装方針（安全に進める順序）
- **Phase 1（安定化）**: env未設定時のガード + 初期導線の破綻防止。
- **Phase 2（探索性向上）**: Home一覧情報・検索体験を改善。
- **Phase 3（リンク品質向上）**: `[[...]]` 同名解決/UI改善と未解決リンク導線。
- **Phase 4（編集効率）**: 保存ステータス可視化 + Suggested linksの行動導線追加。
- **Phase 5（検証と仕上げ）**: 回帰確認、UI微調整、ドキュメント更新。

## タスク一覧（優先順）
### P0: セットアップ/障害耐性
1. ✅ `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 未設定時に、クラッシュではなく設定ガイドUIを表示。
2. ✅ `/auth`・`/`（加えて `/note/[id]`）で「設定不足」時の導線を統一。
3. E2E最小確認（auth -> home -> note open）が落ちないことを確認。

### P1: Homeの使いやすさ
4. ノートカードに補助情報（更新日時、link/backlink件数、状態バッジ）を追加。
5. 一覧で複数選択して一括操作（Pin/Inbox/Delete）を可能にする。
6. 検索結果ハイライトと検索対象切替（title/body）を追加。

### P1: `[[...]]`リンク体験
7. 同名タイトルが複数あるときに候補選択UIを出し、意図したリンク先を選べるようにする。
8. 未解決リンク（存在しないタイトル）を可視化し、1タップ作成導線を追加。
9. Preview内の`[[...]]`リンク遷移先を実ノートに接続する。

### P2: 編集フロー
10. autosave状態のインジケータ（Saving... / Saved / Error）を追加。
11. ConnectionsのSuggested linksに「本文へ挿入」操作を追加。
12. Related算出ロジックにタイトル重み・更新日時重みを追加。

### P2: 認証
13. OTP送信後の状態管理（再送待ち、メール修正、状態表示）を追加。

### P3: QA / ドキュメント
14. lint/typecheck + 主要画面の手動回帰結果を記録。
15. README/HANDOFFを最新化（追加機能・既知制約・次アクション）。

## マイルストーン完了条件
- M1: env未設定でも500を避け、設定ガイド表示で復帰可能。
- M2: Homeで「探す/整理する」操作が1〜2タップ短縮。
- M3: `[[...]]`の誤リンクが実運用で発生しないレベル。
- M4: Note編集時に保存状態が明確で、リンク追加操作がシームレス。
- M5: 回帰確認とドキュメント更新を完了し、次セッションに安全に引き継げる。

## 実施メモ
- 詳細な実行順・受け入れ条件・チェックリストは `STEP.md` に分離して管理する。

---

## Session Update (2026-02-17)
- STEPの残タスク（Phase 2-5）を実装ベースで完了。
- HomeにSelection mode + bulk actions（Pin/Inbox/Delete）と検索ハイライトを追加。
- Noteにwikiリンク解決ステータス（resolved/ambiguous/unresolved）を導入し、ConnectionsにAmbiguous/Unresolvedセクションを追加。
- Unresolved linksからノートを即作成できるQuick Createを追加。
- Preview内wikiリンクをノート詳細にルーティングし、曖昧/未解決リンクは通知する挙動に変更。
- Autosaveステータス表示（Saving/Saved/Error）を追加し、Suggested linksにInsert操作を追加。
- Relatedスコアをtitle重み付きに調整。
- AuthにOTP sent-state UX（Resend cooldown / Edit email）を追加。
- README/STEPを更新し、今回リリース内容を反映。

### Session Verification
- `npm run lint`: pass
- `npm run typecheck`: pass
- Playwright screenshot: `browser:/tmp/codex_browser_invocations/6cd896be42c0f767/artifacts/artifacts/auth-otp-state.png`

### Remaining Manual Checks
- `.env.local` を実運用値で設定したうえで、Auth -> Home -> Create -> Edit -> Link -> Connections のE2E目視確認。

## Session Update (2026-02-17 recheck)
- ブランチ再点検を実施し、`npm run typecheck` で `NoteEditor` の `router.push` 型不一致を修正。
- `Home` の bulk action にエラーハンドリングを追加（失敗時にToast表示して状態を維持）。
- `Note` の link集計をユニーク化し、Ambiguous/Unresolved セクションに空状態メッセージを追加。
- `onSyncLinks` の未ログイン時に toast 表示されないケースを修正。


- 2026-02-17 本セッションで、Androidモバイルファースト改善を実装。
- `src/app/page.tsx` を再レイアウトし、stickyヘッダー + 横スクロール可能なフィルタチップ + 下部固定の選択モード一括アクションバー + 強調FABに更新。
- `src/components/NoteEditor.tsx` のモード切替を2択トグル（Preview/Edit）へ変更し、モバイル編集時の余白を調整。
- `src/components/BottomSheet.tsx` にドラッグダウンで閉じる挙動（タッチ開始/終了差分）とハンドルUIを追加。
- `src/components/SuggestBar.tsx` をリファクタリングし、表示位置オフセットを外部指定可能に拡張。
- `src/app/note/[id]/page.tsx` の保存状態表示に色付きステータスドットを追加。
- `src/app/globals.css` のボタン系スタイルを調整し、モバイルの最小タップ領域（44px）を確保。
- 検証: `npm run lint` / `npm run typecheck` / `npm run build` を通過。
- Playwrightでモバイル画面スクリーンショットを取得（`artifacts/mobile-home-redesign.png`）。


## Session Update (2026-03-05)
- Added a new server route `POST /api/save-note` for note-oriented GitHub persistence.
  - Accepts `title`, `content`, `path` (required), and optional `tags`, `owner`, `repo`, `branch`, `message`.
  - Writes Markdown with YAML frontmatter (`title`, `tags`, `created`) to GitHub via GitHub App auth.
  - Enforces safe note path policy: only `notes/*.md` and blocks path traversal (`..`).
- Refactored GitHub App token/contents helpers into `src/lib/githubApp.ts` and reused them from both routes.
- Hardened `/api/github/commit` with optional repository allowlist support via `GITHUB_ALLOWED_REPOS`.
- Updated README with the recommended `/api/save-note` flow and newly supported env vars.

### Suggested next steps
1. Switch the current note UI commit action from `/api/github/commit` to `/api/save-note` when path is in `notes/`.
2. Add user-level authorization before server-side commit/save endpoints are invoked.
3. Add conflict handling strategy for concurrent updates (SHA mismatch retry policy).
4. Add webhook endpoint for index/graph jobs once baseline save flow is stable.

## Session Update (2026-03-05, refactor)
- Refactored `markdownLite` internals in `src/lib/noteUtils.ts` to improve readability and maintainability without changing behavior.
- Extracted nested helper logic into top-level reusable helpers:
  - list state helpers (`closeListAtDepth`, `closeAllLists`, `ensureListDepth`)
  - line normalization helper (`normalizeMarkdownLine`)
  - indentation normalization helper (`normalizeIndent`)
- Added local types (`ListState`, `NormalizedLine`) to make parsing state explicit.
- Kept existing markdown features intact (headings, horizontal rules, code fences, wiki links, nested lists).

### Verification
- `npm run lint`: pass
- `npm run typecheck`: pass

### Notes for next session
- If additional markdown features are added (e.g., ordered lists or blockquotes), extend the extracted helper layer instead of reintroducing nested functions inside `markdownLite`.

## Session Update (2026-03-05, note creation reliability)
- Investigated the "could not add note" issue around note creation.
- Root cause: `cheapHash` relied solely on `crypto.subtle.digest`, which can be unavailable in some runtime/browser contexts, causing note create to fail before insert.
- Fix: Added a safe fallback hash path in `src/lib/noteUtils.ts` when `crypto.subtle` is not present.
- Result: Note creation/import flows no longer hard-fail in those environments; they still produce deterministic `body_hash` values.

### Verification
- `npm run lint`: pass
- `npm run typecheck`: pass

### Next-session notes
- If you need cryptographic guarantees for all environments, consider moving hash generation server-side (or adding a tiny SHA-256 polyfill).

---

# 8. Session update (2026-03-05)

## User-reported issues
1. Could not add notes from the quick-create sheet (button appeared unresponsive).
2. Could no longer log in via email OTP link.

## Changes made
1. Added `src/app/auth/callback/page.tsx` to complete Supabase OTP login by exchanging the `code` query parameter for a session, then redirecting to `/`.
2. Updated `src/app/auth/page.tsx`:
   - normalize email (`trim().toLowerCase()`),
   - include `emailRedirectTo` for OTP,
   - prevent duplicate submits with a `sending` state,
   - improve user-facing messages.
3. Updated `src/app/page.tsx` quick-create flow:
   - add `creating` state to prevent double-submit,
   - show button loading text,
   - if session is missing, show a clear toast and redirect to `/auth` immediately.

## Validation run
- `npm run lint` -> pass
- `npm run typecheck` -> pass

## Next checks for handoff
1. Verify Supabase dashboard Auth URL settings include your app URL and callback handling expectations.
2. Manual E2E test with real Supabase project:
   - sign in from `/auth`,
   - follow email magic link,
   - create note from Home quick-create sheet.
3. If note creation still fails for specific users, inspect RLS policies for `public.notes` insert permissions against `auth.uid()`.

## Latest session updates

- Fixed: `Create note` sheet on Home could feel unresponsive because any touch-end inside the sheet could close it.
  - Root cause: drag-close gesture listeners were attached to the whole sheet container, so normal taps in inputs/buttons could be interpreted as close gestures on some devices.
  - Change: moved touch gesture handling to the top drag handle only and track distance via touch-move before closing.
  - Verify: open Quick note -> tap title/body/create button repeatedly; sheet stays open unless backdrop tap/Close button/drag handle pull-down > 60px.

## Session Update (2026-03-08, GitHub App permissions clarification)

### Request handled
- User asked whether a GitHub App with both read/write permissions can open other files in an installed public repository.

### Changes made
- Updated `README.md` GitHub FAQ with a direct clarification:
  - Yes, reading other files is possible when the installation includes the repo and the app has the required read permission scope (e.g., Contents: Read).
  - Runtime allowlists/path restrictions in this app still take precedence over raw GitHub capability.

### Validation
- Documentation-only change; no runtime behavior changed.

### Next-session notes
- If product requirements include browser-side file browsing for connected repos, add a dedicated read API route (using installation token + server-side allowlist checks) instead of exposing broad read access directly from the client.

## Session Update (2026-03-08, follow-up on file selection UX)

### Request handled
- Follow-up question: whether users can browse and open files from within the current app UI, or must manually specify the target.

### Changes made
- Updated `README.md` FAQ to explicitly state current behavior:
  - No in-app repository file browser is implemented in the current UI.
  - Users must specify `owner/repo/branch/path` (or reuse saved values in localStorage).

### Validation
- Documentation-only clarification; no functional or API changes.

### Next-session notes
- If file browsing is needed, add a server-backed listing endpoint with installation-token auth and allowlist/path guardrails, then wire a picker UI in the GitHub modal.

## Session Update (2026-03-08, URL parsing follow-up)

### Request handled
- Follow-up question: whether users can paste a GitHub URL and have the app interpret/normalize it to open a repository file.

### Changes made
- Updated `README.md` FAQ to clarify:
  - This is feasible but not implemented yet.
  - Candidate supported URL patterns include `github.com/.../blob/...` and `raw.githubusercontent.com/...`.
  - Suggested implementation: normalize URL to `owner/repo/branch/path` and pass into a read endpoint.
  - Security note: keep server-side allowlist/path/ref validation mandatory.

### Validation
- Documentation-only clarification; no runtime behavior changed.

### Next-session notes
- If implementing this, add parser unit tests for malformed URLs, URL-encoded paths, branch names containing slashes, and SHA refs.

## Session Update (2026-03-08, GitHub URL open implementation)

### Request handled
- Implemented the discussed feature to paste a GitHub file URL, normalize it, and open repository file content in the note editor.

### Changes made
- Added UI in `GitHubCommitPanel`:
  - New URL input field.
  - `Open from URL` action to fetch and load content.
- Added API route `POST /api/github/open`:
  - Accepts GitHub file URL (`github.com/.../blob/...`, `raw.githubusercontent.com/...`, plus API contents URL).
  - Resolves `owner/repo/branch/path` with branch/path ambiguity handling.
  - Applies GitHub App installation auth and repository allowlist checks.
  - Returns normalized target + decoded UTF-8 content.
- Wired note page behavior:
  - Persist URL input in `localStorage`.
  - Open action updates GitHub target fields and imports fetched content into current note.
  - If content starts with `# ` heading, it is mapped to note title and remaining text becomes body.

### Validation
- `npm run lint` passed.
- `npm run typecheck` passed.

### Next-session notes
- Add focused unit tests for URL parsing edge cases (branch names with slashes, URL-encoded paths, malformed URLs, refs as SHA).
- Consider adding an explicit "import mode" option to preserve full raw markdown in body without title extraction.

## Session Update (2026-03-08, import reflection fix)

### Request handled
- User reported that opening from URL did not appear to reflect imported content in the editor.

### Root cause
- `NoteEditor` keeps internal `title/body` state and only re-initialized on note-id change, so same-note content updates from URL import could be missed in UI.

### Changes made
- Added `editorRevision` state in note page and increment it after successful URL import.
- Passed `key={`${note.id}-${editorRevision}`}` to `NoteEditor` so a successful import remounts the editor and reflects new content immediately.
- Updated README wording to explicitly say users should press **Open from URL** to run import.

### Validation
- `npm run lint` passed.
- `npm run typecheck` passed.

### Next-session notes
- Consider replacing remount-based sync with an explicit editor sync API if preserving cursor/selection through import becomes important.
