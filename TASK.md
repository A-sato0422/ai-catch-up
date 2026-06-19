# TASK.md — 進捗管理

Claude Code のセッションをまたいで進捗を管理するための資料。各セッションの開始時にここを読み、完了したらチェックを更新すること。

凡例: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了

---

## Current State（現在地）

- フェーズ: **要件定義 完了 / ソース実物確認 完了 / UI モックデザイン完了（Claude designで作成済み、プロジェクトファイル直下の各 .png）/ 実装 未着手**
- 次にやること: フェーズ 0（プロジェクト初期化）。なお Google Developers Blog のフィード URL のみ実装時に最終確認
- 直近の決定: 画面構成をタブ切替からホーム画面 + ボタン遷移（5 画面）に変更（DECISIONS.md D-021）。全ソースの URL・タグ・トピックを 2026-06-14 に実物確認（Google Developers Blog の正確な URL のみ未確定）。gemini-cli は nightly 混入のためフィルタ要、DeepMind/Google Blog は Gemini キーワードフィルタ要。

---

## フェーズ 0: プロジェクト初期化

- [ ] claude designで作成したモックデザインを再現
- [ ] `.gitignore` に `.env*` を登録（鍵混入防止）
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

**モックデザイン（Claude designで作成済み）を必ず参照しながら実装する。** 参照ファイル:
  - `ホーム画面.png` … マスコット・一言サマリー・5 ボタン
  - `TOP画面.png` … 今日の重要 TOP5
  - `アップデート画面.png` … 新機能・アップデート（プロダクト色帯あり）
  - `Tips画面.png` … Tips（Claude Code / Gemini、色帯なし、アコーディオン展開含む）
  - `お気に入り画面.png` … お気に入り一覧（色帯あり、塗り星アイコン）
  - `データなし画面.png` … 空状態（お気に入り 0 件時の表示パターン）

- [ ] Vite + React + TS セットアップ
- [ ] Supabase 読み取りフック
- [ ] ホーム画面実装（マスコット + 一言サマリー吹き出し + 5 円形ボタン、ホバーでピル形状に展開）（`ホーム画面.png` 準拠）
- [ ] ルーティング（ホーム → 各画面、各画面に「← ホーム」導線）
- [ ] TOP5 画面（`TOP画面.png` 準拠）
- [ ] アップデート画面（`アップデート画面.png` 準拠、プロダクト色帯）
- [ ] Tips（Claude Code）画面（`Tips画面.png` 準拠、色帯なし）
- [ ] Tips（Gemini）画面（`Tips画面.png` 準拠、色帯なし）
- [ ] お気に入り画面（`お気に入り画面.png` 準拠、色帯あり・塗り星）
- [ ] 記事カード（タイトル/要約/ソース/日付（日付のみ・時刻なし）/リンク/★/重要度バッジ（スコア8以上のみ）/アコーディオン展開）
- [ ] お気に入りトグル（is_favorite 更新）
- [ ] 空状態の表示（`データなし画面.png` 準拠）
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
