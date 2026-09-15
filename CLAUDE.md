# Claude Safety Rules

## 削除系コマンドの禁止（重要）

以下のルールはこのワークスペース内のすべての会話で絶対に守られる：

- Claude はファイルまたはディレクトリを削除するコマンドを一切生成してはならない。
  例：rm, rm -rf, rm *, rmdir, unlink, cache --delete,
      lftp mirror --delete, rsync --delete, git clean -df, find -delete 等。

- 削除が必要な場合でも、Claude は削除コマンドを提案せず、
  「手動で削除してください」といった説明に留めること。

- 削除の推奨・削除操作の自動判断も禁止。

- ssh / lftp / デプロイ系スクリプトを生成する場合でも、
  削除コマンドの生成は禁止。

これらはすべての会話・コード生成に適用される。

## シークレット管理（重要）

- `config/master.key` など機密ファイルを `git add` するコードを生成してはならない
- デプロイスクリプト・セットアップ手順でも同様
- シークレットは必ず環境変数（RAILS_MASTER_KEY 等）で渡すこと
- `.gitignore` への追加を確認する手順を必ずコードに含めること
- 初回コミット前に `git status` でステージング確認を促すこと

---

## プロジェクト概要

**受託業務標準フローテンプレート（デモ版）**。受託業務（システム開発・改修・保守運用・調査）は案件ごとに進め方が属人化しやすく、「どの工程で」「何を作り」「何を満たせば次へ進んでよいか」が担当者の経験に依存する。本リポジトリは、**工程・成果物・判断基準を一体で定義した標準フローテンプレート**を、案件プロファイル（契約形態・業務種別・規模・要件確定度）から派生規則により決定的に展開し、ゲート判定（通過・条件付き通過・不通過）で工程の通過可否を判定できる展示物として実装する。

成果物ファイル自体の作成・保管は対象外。**フローの定義と進行判定**のみを扱い、成果物は状態（未作成・作成中・レビュー済・承認済・要更新）のみを管理する。

仕様の正は [`requirements.md`](requirements.md)（用語定義・案件プロファイル・工程/成果物/判断基準マスタ・派生規則・ゲート判定仕様・ER図・DFD・シーケンス図・クラス図・状態遷移図・ユースケース図を含む）。実装前に必ず参照すること。本ファイルには要約と横断的な注意点のみを記す。

**現状（2026-09-15時点）：Issue #1（実装）・#3（vite/vitest脆弱性修正）・#5（wrangler v4アップグレード）を実装・マージ済み、タグ `v01.01.00`。本番デプロイ済み・本番ユーザーテスト実施済み（Claude Desktopのブラウザツールで実施。詳細は本ファイル「本番デプロイ」節）。既知の未修正バグ2件あり（「既知の未修正バグ」節参照）。**

## アーキテクチャ（requirements.md 2.3 / 5 / 10 / 11 が正）

デモ版の簡略構成として **Cloudflare 一本化**を採用する（AI・解析・重い処理を持たず、CRUD と表示が主体のため。Railway は使用しない）。

| 層 | 技術 | デプロイ先 |
|---|---|---|
| フロントエンド | Cloudflare Pages（TypeScript） | Cloudflare |
| アプリケーション | Cloudflare Workers（TypeScript） | Cloudflare |
| DB | D1（SQLite） | Cloudflare |
| 定期実行 | Cron Triggers | Cloudflare |

- **フロントエンドのフレームワークは requirements.md が特定していない**（「Cloudflare Pages（TypeScript）」のみ規定）。実装Issueで決定すること。同構成の先例（`org-cube-model-router-demo`・`auth-link-triage-ledger-demo`）を参考にできるが、本リポジトリで独自に選定してよい。
- 日次リセット（JST 03:00・全テーブル削除。マスタは対象外）は Cron Trigger から Worker を起動して実行する（requirements.md 13.5 / 19章）。
- フロントエンドとアプリケーションの通信は同一システム内の通信。到達経路（同一オリジン化・Worker Route 等）は `org-cube-model-router-demo`（`/api/*` をゾーンの Worker Route で振り向け）を参考にできる。
- 認証・認可は設計に組み込まない（requirements.md 18章）。**Cookie ベースのセッションキーがオーナーキー**であり、全テーブルが `session_id` を持ち、参照条件に必ず含める（セッションをまたいだレコードの参照・操作を防止すること）。
- Bot 対策はハニーポット方式（不可視の入力欄・値が入っていれば拒否）。reCAPTCHA は用いない。

### 派生規則ロジック（requirements.md 6.5章が正・多数の工程・成果物・判断基準をまたぐため要約）

フローは工程マスタ（18工程・requirements.md 6.3）と派生規則（R01〜R18・6.5）から生成する。**派生規則は R01 から順に適用し、後の規則が前の規則が生成した工程を変形してよい。** 契約形態（請負/準委任/ハイブリッド）×業務種別（新規開発/改修/保守運用/調査）×規模（小/中/大）×要件確定度（確定/未確定）の組み合わせから、常に同一の工程列・成果物・判断基準・ゲート種別が導出されること（決定性・再現性、requirements.md 8.6章）が提供価値の中核である。各工程は生成根拠となった規則識別子を保持し、画面から参照できる。不成立の組み合わせ（ハイブリッド×保守運用）は R18 で受理を拒否し、警告を伴う組み合わせ（請負×未確定、請負×保守運用）は R11・R13 で追加の成果物・判断基準を生成する。

### ゲート判定ロジック（requirements.md 7章が正）

判定は判断基準のチェック状態のみから導く（人手による上書きなし）。**必須基準に1つでも未達→不通過。必須が全て達成され推奨に未達→条件付き通過（未達推奨基準を持越し課題として登録）。必須・推奨が全て達成→通過。** 顧客承認・検収ゲートは承認記録（承認ロール・承認日）の存在が必須基準であり、これが無い場合は他の基準の達成状況に関わらず不通過とする。終端前工程（P13/P14）は、未解決の持越し課題または未合意の変更要求が1件でもあれば不通過（R17）。

## AIモデル分担（デモ版共通・`rictaworks/context` の `ClaudeCode.md` が正）

| フェーズ | 担当モデル |
|---|---|
| Issue分割 | Sonnet |
| 実装 | Haiku |
| reviewer, pr-checker | Sonnet |
| Security Review | Opus |
| コンテンツライティング | GPT |
| ファクトチェック | Gemini |

上記はルート `H:\マイドライブ\RictaWorks\CLAUDE.md` の「開発 AI 役割分担（受託案件共通）」節（AIか人間かの大分類・モデル名は参考値と明記）とは別内容であり、こちらはデモ版に固有の具体的モデル割当てである。実際には本リポジトリの実装・レビューは Claude Code（モデルは都度変わる）で一括して行っており、上記は目安として記載する。

## 開発フロー

- **実装方式：1 issue のワンショットで実装する**（requirements.md 17章）。複数 Issue に分割しない。
- ブランチワークフロー：`src/**` の変更は main に直接コミット・プッシュせず、必ずブランチを切って `gh pr create` で PR を作成する。`src/**` 以外（このファイル・`DOCS/`・`SPEC/` 等）は main への直接 push を許可する。
- **AIセッティング（CLAUDE.md本文・`.claude/`配下の設定・エージェント定義等）はPRを作らず、必ずmainブランチで直接コミット・pushすること。** PR化しない。
- **デモ版のため公開スピードを優先し、正式な code-review・audit・security-gate・report を省略してよい**。フローは `issue → setting & coding → security review → add, commit, push → reviewer & pr-checker → merge → user test` のみとする（merge で本番デプロイされる構成が前提）。
- コミット前に必ずセキュリティレビューを行うこと。マージ前に必ず reviewer と pr-checker を実行すること（`.claude/agents/` に定義。後述）。
- TDD 厳守：plan → red test → coding → green test。フロントの確認は curl / wget --mirror / playwright で行う。
- 時刻は JST、エンコードは UTF-8。日本語版のみ開発する（requirements.md の対象外に多言語化は含まれない）。
- 文字列リテラルは設定ファイル／DB に分離し、ハードコードを検出するテストを書くこと。
- ネイティブの `alert()` / `confirm()` / `prompt()` は使用禁止。フォールバック禁止（例外処理を明示的に書く）。
- デフォルトアイコンは FontAwesome。絵文字は使用しない。
- 環境変数は `.env`（`.env.example` がテンプレート）を参照する。開発環境・本番環境の判定を実装し分岐できるようにする。
- バージョン番号は `メジャー2桁.マイナー2桁.デバッグ2桁`（初期値 `01.01.00`）。タグは最初から `git tag -a`（注釈付き）。
- コンテンツ（画面文言等）は**ですます調**で統一する（だである調禁止）。案件ラベルには実在の顧客名・個人名を含めないよう画面で案内する（requirements.md 9.1 / 18章）。

## ディレクトリ構成（管理用）

以下を `mkdir` で作成すること。運用ルールに従って更新する（`.gitignore` により `SPEC/` 以外は公開/非公開に関わらずコミットされないローカル専用ディレクトリ）。

| ディレクトリ | 用途 |
|---|---|
| `TASKS/` | タスク管理（ローカルのみ） |
| `DEBUG/` | バグ報告（ローカルのみ） |
| `CLIENT/` | クライアント要望等（ローカルのみ） |
| `WORK/` | 作業報告（ローカルのみ） |
| `ENV/` | `DEVELOPMENT.md`（開発環境）・`PRODUCTION.md`（本番環境）（ローカルのみ） |
| `SPEC/` | 仕様書。リバースエンジニアリング図（ER図・DFD・シーケンス図・クラス図・状態遷移図・ユースケース図）はまず `requirements.md` に集約済みだが、実装後に差分が生じた図はここに追記・更新する（コミット対象） |
| `DELETE/` | ゴミ箱（ローカルのみ・削除コマンドを使わずここへ移動する） |

## コマンド

`src/` 配下は `src/worker/**`（Cloudflare Workers・Hono・D1）と `src/frontend/**`（Cloudflare Pages・Vite・Vanilla TypeScript）の2系統。フローの展開・判定は同期処理で完結し、バックグラウンド処理は持たない（requirements.md 17章）。

| コマンド | 用途 |
|---|---|
| `npm install` | 依存関係のインストール |
| `npm run dev` | Worker（`wrangler dev --local`, :8787）とフロントエンド（`vite`, :5173）を同時起動。`/api` は `vite.config.ts` のproxyで:8787へ転送される |
| `npm run dev:worker` | Workerのみをローカル起動（:8787） |
| `npm run dev:frontend` | フロントエンドのみをローカル起動（:5173） |
| `npm run build` | フロントエンドの本番ビルド（`dist/frontend`） |
| `npm run typecheck` | Worker・フロントエンド双方の `tsc --noEmit` |
| `npm test` | vitestによる単体・結合テスト（`test/unit/`・`test/worker/`） |
| `npm run test:watch` | vitestをウォッチモードで実行 |
| `npm run test:e2e` | PlaywrightによるE2Eテスト（`test/e2e/`。`npm run dev` 相当のサーバーを自動起動） |
| `npm run db:migrate:local` | ローカルD1へマイグレーション（`src/worker/db/migrations/`）を適用 |

## 本番デプロイ（2026-09-15実施・デスクトップから実施済み）

**構成はPagesを使わずWorkers Assetsに一本化**（`org-cube-model-router-demo`のようなPages+Workers構成ではない）。理由：デプロイに使ったCloudflare APIトークンにPages編集権限が無く、`wrangler pages project create`が失敗したため。同じWorker（`contract-flow-template-demo`）がフロントエンド静的アセットとAPIの両方を配信する（`auth-link-triage-ledger-demo`・`rictaworks.jp`と同方式）。

- D1データベース `contract_flow_demo`（uuid `8022e729-6c51-47d4-8245-85db765302b8`）をCloudflare MCP経由で作成、`src/worker/db/migrations/0001_init.sql`を`d1_database_query`で直接適用（`wrangler d1 migrations apply`ではない）。
- `wrangler.toml`に`[env.production]`ブロックを追加し、`[env.production.assets]`（`directory = "./dist/frontend"`, `binding = "ASSETS"`, `run_worker_first = ["/api/*"]`）と`[[env.production.routes]]`（`pattern = "contract-flow-template-demo.rictaworks.jp"`, `custom_domain = true`）を設定。`/api/*`のみWorkerスクリプト（Hono）が処理し、それ以外は静的アセットを直接返す。
- デプロイコマンド：`npm run build`（フロントエンド）→`npx wrangler deploy --env production`（Worker+アセットを同時デプロイ、カスタムドメインも自動設定）。
- **デプロイ用トークンの罠**：`.deploy.<COMPUTERNAME>.enc`の既存`CLOUDFLARE_API_TOKEN`はDNS編集専用スコープでWorkers/D1権限が無く、`wrangler deploy`が認証段階で失敗した。既存の`rictaworks-jp build token`（Workers スクリプト:編集・D1:編集・Workers ルート:編集・SSL証明書:編集を含む）をCloudflareダッシュボードで「ロール」（再生成）し、新しい値を`CLOUDFLARE_API_TOKEN_BUILD`という別キーで`.deploy.<COMPUTERNAME>.enc`に保存した（値はチャットに出さず、コピー→クリップボード→PowerShellの`Get-Clipboard`経由で受け渡し）。`CLOUDFLARE_ACCOUNT_ID`は`9c5183bedab008ccef3581056752fa6f`。
- 本番URL：`https://contract-flow-template-demo.rictaworks.jp/`（ヘルスチェック `/api/health`）。

## 既知の未修正バグ（2026-09-15 本番ユーザーテストで発見）

1. **【重大】請負・ハイブリッド契約が要件定義（P04）を永久に通過できない。** `src/frontend/pages/phaseDetailPage.ts`の`checkbox.disabled = c.autoAttached;`が、派生規則が追加した判断基準（`autoAttached: true`がデフォルト）のチェックボックスを常時disabledにしている。しかし`satisfied`が実データから動的に算出されるのは`gateEvaluator.ts`の`AUTO_COMPUTED_CRITERIA_TEXTS`（承認記録が存在する・持越し課題がゼロ・未合意の変更要求がゼロ）の3つだけで、R06が追加する「検収基準の合意」（請負に常時付与）・R08の「請負範囲・再見積の提示」（ハイブリッドに常時付与）・R14の2件（請負×調査）はチェック手段が無いまま必須基準として残り、P04が不通過のまま固定される。**請負・ハイブリッドの案件プロファイルではP04から先に進めない。** 準委任のみ影響なし（実機で完了まで確認済み）。修正案：`checkbox.disabled`の判定を、`autoAttached`ではなく`AUTO_COMPUTED_CRITERIA_TEXTS`に含まれるテキストかどうかに変更する。
2. **【重大】中止（`案件を中止する`）した案件はP18（クローズ）を永久に通過できず「クローズ」状態に到達できない。** `src/worker/routes/phase.ts`の`/phases/:phaseId/advance`ハンドラが`project.state === "中止"`のとき無条件に409エラー（`この案件は中止されています。クローズ工程のみ操作できます。`）を返す。しかしrequirements.md 8.3は「中止後はP18（クローズ）のみが進行可能」と規定しており、P18自身の前進もブロックされるのはこの規定と矛盾する。修正案：advanceハンドラで`phase.code === "P18"`のときは`project.state === "中止"`チェックを免除する。
3. **【中】ゲート再評価のたびに同一の持越し課題が重複登録される。** `src/worker/routes/phase.ts`の`/phases/:phaseId/evaluate`ハンドラが、条件付き通過の判定ごとに`CarryoverRepository.add()`を無条件に呼び出す。同一工程・同一テキストの未解決な持越し課題が既に存在するかを確認していないため、同じ工程を複数回評価する（差戻し後の再評価等、通常の使用でも起こりうる）と重複行が積み重なり、「持越し課題」一覧に同じ文言が複数回表示され、それぞれ個別に「この工程で解決する」を押す必要がある。修正案：追加前に同一(phase_id, text, state='未解決')の既存行を確認する。

いずれも実機（本番URL）で再現確認済み。Issue化・修正は本人判断。

| ファイル | 用途 |
|---|---|
| `requirements.md` | 仕様の正（用語定義・案件プロファイル・工程/成果物/判断基準マスタ・派生規則・ゲート判定・画面仕様・データ設計・ER図・DFD・シーケンス図・クラス図・状態遷移図・ユースケース図） |
| `DOCS/CRAP.md` | デザイン4原則（Contrast / Repetition / Alignment / Proximity） |
| `DOCS/DP.md` | 開発原則（YAGNI/KISS/DRY/SOLID等） |
| `DOCS/TM.md` | テストメソッド・フレームワーク概要 |
| `.claude/CC.md` | コンプライアンス10項目 |
| `.claude/OWASP10.md` | OWASP Top 10（セキュリティレビュー基準） |
| `.claude/QC10.md` | 品質管理10項目 |
| `.claude/TEST-HARNESS-SAFETY.md` | テストハーネスの安全性チェックリスト |
| `.claude/Manager.md` | プロジェクト管理指針 |
| `.claude/auto-optimizer.md` | CLAUDE.md 自動最適化エージェント用プロンプト |
| `.claude/init-prompt.md` | 本 CLAUDE.md 生成時に `rictaworks/context` の `ClaudeCode.md` から抽出した適用済みルール一覧（コミット対象外・参照用） |

## Sub Agent（`.claude/agents/` に定義済み）

- **pr-checker**：レビューはしない。PR のタイトルと本文を日本語にする。非エンジニア（ブラウザしか使わない利用者）向けのユーザーテスト手順を PR 本文に丁寧に書く。
- **tester**：全 PR を対象に、PR に書かれたユーザーテスト手順の実行スクリプトを作成する（`DOCS/TM.md` に記載のテストを含む）。テストは `test/pr***/` に作成し、対象は開発サーバーとする。
- **reviewer**：issue の受け入れ要件を満たすこと、および `.claude/CC.md`・`.claude/OWASP10.md`・`.claude/QC10.md`・`DOCS/CRAP.md`・`DOCS/DP.md`・`DOCS/TM.md` を満たすことを検証する。
