# TASK_EXPANSION.md — 機能拡張 進捗管理

MVP リリース後の機能拡張のタスク管理。仕様の正典は `SPEC_EXPANSION.md`（確定後に SPEC.md / DECISIONS.md へ反映）。各セッションの開始時にここを読み、完了したらチェックを更新すること。

凡例: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了

---

## Current State（現在地）

- フェーズ: **機能拡張の要件確定済み / 実装 未着手**
- 事前確認: URL 系 5 件は確認済み（2026-07-04。D-033）。残りはユーザー作業 2 件（AI Studio レート制限の実測確認 / Slack Webhook 発行）のみで、いずれも実装と並行可能（Slack はフェーズ F までに必要）
- 次にやること: フェーズ A（スキーマ・型の拡張）
- 前提: LLM は Gemini 3.1 Flash-Lite（15 RPM / 500 RPD）。日次収集上限 合計約 280 件 + サマリー 1 コール

---

## 実装前に確認が必要な事項

（URL 系 5 件は 2026-07-04 に実物確認済み。詳細は D-033）

- [x] **openai/codex の GitHub Releases Atom URL** … `https://github.com/openai/codex/releases.atom` ✅HTTP 200。**ただし `rust-vX.Y.Z-alpha.N` 形式の alpha ビルドが毎日大量に流れる → gemini-cli の nightly と同様、安定版のみに絞るフィルタ必須**（`-alpha` / `-beta` / `-rc` を含むタグを除外）
- [x] **Qiita の Codex タグ名** … slug は **`codex`** で確定（`query=tag:codex`）。実在確認済み（記事 908 件 / フォロワー 803）
- [x] **Zenn の Codex トピック名** … **`https://zenn.dev/topics/codex/feed`** ✅HTTP 200・記事あり（トピック名「Codex」）
- [x] ~~**Google News RSS 検索 URL**~~ … 確認の結果、**不採用に変更（D-034）**。リダイレクト URL で横断重複排除が効かない・人気指標なし・description が薄い・新規アダプタ実装が必要、の 4 点が理由。代替として**はてブ検索 RSS 2 本**を採用: 「AI 導入」（`target=title`）/「生成AI ビジネス」（`target=text`）、いずれも `users=1`・UTF-8 %エンコード・各 40 件返却を実測確認済み。**既定（タグ検索 + users=3）のままだとほぼヒットしないため `target` と `users` の明示が必須**
- [x] **PR TIMES または ITmedia AI+ の RSS URL** … **ITmedia AI+ を採用**: `https://rss.itmedia.co.jp/rss/2.0/aiplus.xml` ✅20 件・全件 AI 関連・元記事 URL 直リンク・pubDate JST。PR TIMES は却下（`index.rdf` は全業種プレスリリースの firehose で AI 専門フィードが無い。D-033）
- [ ] **AI Studio でプロジェクトの実測レート制限を確認** … Flash-Lite が 15 RPM / 500 RPD であることを確認（枠は予告なく変動するため）※ユーザー作業
- [ ] **Slack アプリ作成 + Incoming Webhook URL 発行** … 現行の Slack app 方式で作成（Legacy Custom Integration は使わない）※ユーザー作業

## フェーズ A: スキーマ・型の拡張（他フェーズの土台）

- [ ] `articles` にカラム追加: `audience` / `difficulty` / `importance_reason` / `tags` / `popularity`
- [ ] `daily_summaries` テーブル新設（date PK / summary_ja / created_at）
- [ ] 型定義の拡張: `Product` に `codex`、`Category` に `business` / `case_study`、`Enrichment` に新 4 フィールド、`RawArticle` に `popularity?`
- [ ] `SourceConfig` 型の新設（adapter / dailyLimit / rank?）
- [ ] cleanup.ts の条件変更: `is_favorite` 参照を削除し「published_at が 30 日超は全削除」に単純化

## フェーズ B: LLM プロンプト拡張

- [ ] 出力 JSON に `importance_reason` / `tags` / `audience` / `difficulty` を追加（SPEC_EXPANSION §4.1）
- [ ] `category` の判定基準に `business` / `case_study` の定義を追記（§4.4）
- [ ] `difficulty` の判定基準（1〜3）と具体例をプロンプトに明記（§4.3。迷ったら低い方に倒す）
- [ ] JSON パースの拡張フィールド対応（欠損時のフォールバック: null で保存）
- [ ] サンプル記事 5〜10 件で分類結果を目視確認（特に difficulty の揺れ）

## フェーズ C: 収集パイプラインの上限・rank 対応

- [ ] `sources/index.ts` を `SourceConfig[]` に変更し、全クエリに `dailyLimit` を設定（§5.2 の表の値）
- [ ] collect.ts: fetch 後・enrich 前に dailyLimit で件数カット（rank 指定があればソートしてから）
- [ ] Qiita アダプタ: `popularity`（ストック数）を埋める + rank 関数（ストック数降順）
- [ ] はてブ アダプタ: `popularity`（`hatena:bookmarkcount`）を埋める + rank 関数（ブクマ数降順）
- [ ] RPM 制御を 4 秒間隔に調整（15 RPM 内）
- [ ] **クエリ別のカット件数をログ出力**（どのクエリの上限を次に広げるか判断するため）

## フェーズ D: 新ソースアダプタ

- [ ] `githubReleases`（openai/codex）… `https://github.com/openai/codex/releases.atom` で追加、登録配列に 1 行。**alpha/beta/rc ビルドの除外フィルタ必須**
- [ ] `qiita` に Codex タグのクエリを追加（`query=tag:codex`）
- [ ] `zenn` に codex トピックのクエリを追加（`https://zenn.dev/topics/codex/feed`）
- [ ] `hatena` に検索クエリ 2 本を追加（D-034）: 「AI 導入」（`target=title&users=1`）/「生成AI ビジネス」（`target=text&users=1`）。新規アダプタ実装は不要（既存 hatena アダプタのクエリパラメータ化で対応）
- [ ] `itmedia` アダプタ新規実装（`https://rss.itmedia.co.jp/rss/2.0/aiplus.xml`）
- [ ] relevance.ts の強化: はてブ title/text 検索 / ITmedia 系用のキーワードフィルタ（「広く取る × きつく濾す」）
- [ ] ローカル実行で全クエリの取得件数・カット件数を確認

## フェーズ E: 一言サマリー（吹き出し）生成

- [ ] `batch/src/summarize.ts`: 当日 TOP5 のタイトル + 要約から一言サマリー（3 行以内・口語）を 1 コール生成
- [ ] `daily_summaries` へ date で upsert
- [ ] collect.yml の最終ステップに組み込み（enrich 完了後）
- [ ] 記事 0 件の日の挙動を確認（生成スキップ or 定型文）

## フェーズ F: Slack 通知

- [ ] Secrets に `SLACK_WEBHOOK_URL` を登録
- [ ] `batch/src/notify.ts`: 当日 TOP5 + `daily_summaries.summary_ja` を Block Kit 形式で POST
- [ ] collect.yml の最終ステップに組み込み（サマリー生成の後）
- [ ] fail-soft: 通知失敗が collect 全体を落とさないことを確認

## フェーズ G: フロントエンド

### G-1. 画面のデータ駆動化
- [ ] `ScreenConfig` 型実装（§7.1）
- [ ] 既存 5 画面 + 新画面をプリセット定義に変換（§7.2 の表）
- [ ] ホーム画面のボタン配列を設定から動的生成（TOP5 / お気に入りは固定枠）
- [ ] リスト画面を ScreenConfig 汎用コンポーネント化（filter + sort + `limit(20)`）

### G-2. 設定画面（デザイン正本: claude.ai/design「Button Settings.dc.html」。D-035）
- [x] チェックボックス UI（5 グループ: Gemini / Claude Code / Codex / バックオフィス / 経営者向け。グループ内複数チェックは 1 ボタンに統合、合計最大 7 ボタン = 固定 2 + 自由枠 5）
- [x] 選択数カウンター（ボタン数 N/5）・保存 / キャンセル・ダークモード対応
- [x] localStorage への保存・読込
- [ ] 属性の再選択導線（G-3 依存）

### G-3. 初回属性選択ポップアップ
- [ ] 初回訪問判定（localStorage フラグ）
- [ ] 属性選択 UI（エンジニア初級/中級/上級・バックオフィス・経営者）
- [ ] 属性 → チェックのプリセット適用

### G-4. お気に入りの localStorage 化
- [ ] ★ 押下時に記事オブジェクト全体をスナップショット保存
- [ ] お気に入り画面を localStorage から描画（全件表示・日数/件数制限なし）
- [ ] `is_favorite` 参照の削除（DB 更新処理の除去）

### G-5. カード・吹き出し
- [ ] カード: 重要度バッジに `importance_reason` 併記 + タグチップ表示
- [ ] TOP5 の選定対象をチェック中カテゴリに絞るフィルタ
- [ ] 吹き出し: `daily_summaries` 当日行を表示 + フォールバック文言
- [ ] 空状態の文言調整（「今日は静かだった」と伝わる表現）

## フェーズ H: 仕上げ

- [ ] 全体疎通: 収集（上限・rank）→ 分類（新軸）→ サマリー → Slack 通知 → 表示 → 設定変更 → お気に入り
- [ ] 属性プリセット 5 通りそれぞれでホーム画面のボタン構成を確認
- [ ] 難易度フィルタ画面が切替期に疎になることの表示確認（空状態が出ること）
- [ ] GitHub Actions の実行時間確認（280 件時 約 20 分の想定内か）
- [x] DECISIONS.md への反映（番号衝突のため **D-024〜D-032** に振り直して反映済み 2026-07-04）
- [x] CLAUDE.md への反映（LLM 前提・型定義・SourceConfig・Slack・localStorage 等を更新済み 2026-07-04）
- [ ] SPEC.md への反映（実装完了後に差分を統合し、SPEC_EXPANSION.md をアーカイブ）
- [ ] README 更新

---

## 未決事項（必要になったら確認）

- ~~PR TIMES / ITmedia AI+ のどちらを採用するか~~ → **ITmedia AI+ に決定**（2026-07-04 実物確認。D-033）
- ~~Google News 2 クエリの具体的な検索語~~ → **Google News 自体を不採用とし、はてブ検索「AI 導入」（title）/「生成AI ビジネス」（text）に決定**（2026-07-04 実物確認。D-034。クエリ語は運用しながら調整可）
- 将来の本格複数人対応（Supabase 匿名認証 + favorites テーブル移行）… 今回スコープ外
