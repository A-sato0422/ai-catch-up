# TASK.md — 進捗管理

Claude Code のセッションをまたいで進捗を管理するための資料。各セッションの開始時にここを読み、完了したらチェックを更新すること。

凡例: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了

---

## Current State（現在地）

- フェーズ: **フェーズ 0（フロント部分）完了 / フェーズ 6（フロントエンド MVP）完了 / Supabase・バッチ 未着手**
- 次にやること: Supabase プロジェクト作成（フェーズ 0 残り）→ バッチ実装（フェーズ 1〜5）
- 直近の決定: フロントは React + TypeScript + Vite + Tailwind CSS + React Router v6 でルート直下に実装（`web/` サブディレクトリ不使用）。ダークモード対応済み。モックデータで動作確認済み。Supabase 連携は次フェーズ。

---

## フェーズ 0: プロジェクト初期化

- [x] claude designで作成したモックデザインを再現（2026-06-19 完了）
- [x] `.gitignore` に `.env*` を登録（鍵混入防止）
- [ ] Supabase プロジェクト作成、`articles` テーブルを SPEC §5 のスキーマで作成
- [ ] インデックス作成（UNIQUE(url) ほか SPEC §5.2）
- [ ] RLS 方針決定（自分専用: 読み取りを anon に許可 / 書き込みは service_role のみ）
- [ ] GitHub Actions Secrets 登録（SUPABASE_URL / SUPABASE_SERVICE_KEY / GEMINI_API_KEY / QIITA_TOKEN）

## フェーズ 1: 共通基盤（抽象化レイヤー）

- [ ] 型定義: `RawArticle` / `SourceAdapter` / `Enrichment` / `LLMProvider`（CLAUDE.md §3）
- [ ] `normalizeUrl()` 実装（SPEC §5.3）+ テスト
- [ ] Supabase クライアント（バッチ用 service_role / フロント用 anon）
- [ ] upsert ロジック（URL 一意キー、既存スキップ）

## フェーズ 2: ソースアダプタ（1 つずつ）

- [ ] `githubReleases`（claude-code）… Atom パース
- [ ] `githubReleases`（gemini-cli）… **リポジトリ URL を実装前に確認**
- [ ] `qiita`（API v2、タグ別、要 QIITA_TOKEN）
- [ ] `zenn`（トピック RSS）
- [ ] `hatena`（キーワード検索 RSS）
- [ ] `googleDevBlog` / `deepmind`（公式 RSS、URL 確認）
- [ ] `anthropicNews`（第三者フィード。差し替え可能な実装に）
- [ ] アダプタ登録配列（`sources/index.ts`）
- [ ] キーワード関連度フィルタ（`relevance.ts`、必要ソースのみ）

## フェーズ 3: LLM プロバイダ

- [ ] プロンプト設計（SPEC §6: 要約/分類/スコアを 1 コールで JSON 出力）
- [ ] `gemini.ts` 実装（Flash 主、JSON 厳格パース、失敗時フォールバック）
- [ ] Flash 枠超過時に Flash-Lite へ自動フォールバックする実装
- [ ] RPM 制御（Flash は約 6 秒間隔）
- [ ] 本文の打ち切り（2,000〜3,000 文字）を enrich 前処理に実装
- [ ] `claude.ts` スタブ（将来差し替え用、インターフェースのみ先に固定）
- [ ] `LLM_PROVIDER` 環境変数によるプロバイダ選択

## フェーズ 4: 収集パイプライン

- [ ] `collect.ts`: fetch → フィルタ → 重複排除 → enrich → upsert
- [ ] 初回バックフィル対策（取得期間を絞る or 初回のみ Flash-Lite）
- [ ] fail-soft（ソース単位の例外処理とログ）
- [ ] ローカル実行確認（`npm run collect`）
- [ ] `.github/workflows/collect.yml`（cron + workflow_dispatch）

## フェーズ 5: クリーンアップ

- [ ] `cleanup.ts`: 非お気に入り & N 日超を物理削除
- [ ] `.github/workflows/cleanup.yml`（週次 cron）

## フェーズ 6: フロントエンド

**モックデザイン（Claude designで作成済み）を参照して実装完了。**

- [x] Vite + React + TS + Tailwind CSS セットアップ（2026-06-19 完了）
- [x] ホーム画面実装（ロボット + 吹き出し + 5 ナビボタン）
- [x] ルーティング（React Router v6、/, /top5, /update, /tips, /tips-gemini, /fav）
- [x] TOP5 画面（番号列・ソースバッジ・アコーディオン展開）
- [x] アップデート画面（プロダクト色帯・ブランド列・外部リンク）
- [x] Tips（Claude Code）画面（ソースバッジ・アコーディオン）
- [x] Tips（Gemini）画面（ソースバッジ・アコーディオン）
- [x] お気に入り画面（色帯あり・デフォルト塗り星）
- [x] 記事カード（タイトル/要約/ソース/日付/★/重要度バッジ/展開）
- [x] お気に入りトグル（フロントのみ、Supabase 連携は次フェーズ）
- [x] ダークモード対応（data-theme 切替）
- [x] レスポンシブ対応（モバイル〜デスクトップ）
- [x] vercel.json（SPA rewrites）
- [ ] Supabase 読み取りフック（実データ接続）
- [ ] 空状態の表示（データなし時）
- [ ] Vercel デプロイ

## フェーズ 7: 仕上げ

- [ ] 全体疎通（収集 → 表示 → お気に入り → クリーンアップ）
- [ ] エラー表示（フェーズ6の空状態とは別に、取得失敗時の表示も確認）
- [ ] README 整備
- [ ] 拡張シナリオ a/b/c の動作確認（SPEC §9）

---

## 実装前に確認が必要な事項（2026-06-14 実物確認実施）

- [x] **claude-code releases.atom** … 確認済 `https://github.com/anthropics/claude-code/releases.atom`（最新 v2.1.177）
- [x] **gemini-cli の GitHub リポジトリ** … 確認済 `https://github.com/google-gemini/gemini-cli/releases.atom`。※nightly/preview 混入のため安定版フィルタを実装
- [x] **Google DeepMind Blog RSS** … 確認済 `https://deepmind.google/blog/rss.xml`（要 Gemini キーワードフィルタ）
- [ ] **Google Developers Blog の RSS URL** … 候補 `https://developers.googleblog.com/feeds/posts/default`。実装時に実物確認（広範のためフィルタ必須）
- [x] **Qiita の対象タグ名** … 確認済。slug `claudecode` / API `query=tag:ClaudeCode`、Gemini は `tag:Gemini`
- [x] **Zenn の対象トピック名** … 確認済 `claudecode` / `gemini`（`zenn.dev/topics/{topic}/feed`）
- [x] **はてブ キーワード検索 RSS** … パターン確認済 `b.hatena.ne.jp/q/{query}?mode=rss&sort=recent`
- [x] **anthropic.com/news の第三者フィード** … 確認済（live）`https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml`。もろい前提・差し替え可能に
- [x] 保持期間 = 30 日（非お気に入り）、収集頻度 = 1 日 1 回（既定）に確定

## 未決事項（仕様で未確定・必要になったら確認）

- 現時点でなし（下記は確定。詳細は SPEC / DECISIONS 参照）
  - お気に入り一覧の見せ方 → 独立画面（ホームからボタン遷移）
  - 重要度 → UI にバッジ表示（スコア 8 以上のみ）
  - TOP5 の対象期間 → 当日のみ
