# TASK_EXPANSION.md — 機能拡張 進捗管理

MVP リリース後の機能拡張のタスク管理。仕様の正典は `SPEC_EXPANSION.md`（確定後に SPEC.md / DECISIONS.md へ反映）。各セッションの開始時にここを読み、完了したらチェックを更新すること。

凡例: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了

---

## Current State（現在地）

- フェーズ: **フェーズ A〜H ほぼ全完了（2026-07-10）**。残りはユーザー作業のみ。**フェーズ I（デザイン修正）を追加（2026-07-11）。未着手・実装はまだ行っていない**
- 事前確認: URL 系 5 件は確認済み（2026-07-04。D-033）。Slack Webhook は発行・Secrets 登録済み。残りはユーザー作業 1 件（AI Studio レート制限の実測確認）のみ
- マイグレーション 003/004 は適用済み（ユーザー確認）
- G-5 の要フォローアップは解消済み（2026-07-10。既存記事に新カラムが全件埋まっており TOP5 のカテゴリ絞り込みが実データで正常動作することを Playwright で確認）
- フェーズ H: 全体疎通のうちフロント側（表示・設定変更・お気に入り）・属性プリセット5通り・難易度フィルタ空状態・GitHub Actions実行時間は Playwright / gh CLI で自動検証済み（2026-07-10）。SPEC.md への反映・README 更新・`.env.example` 新設も完了。**残るのは実 Slack Webhook への疎通確認のみ（ユーザー判断で今回は見送り。ユニットテストでのfail-soft検証はフェーズFで完了済み）**
- 未実施の手動確認（実ネットワーク・実APIキーが必要なため自動化スキップ）: フェーズBの分類結果目視確認（5〜10件。品質面の主観判断のため引き続きユーザー確認推奨）、フェーズDの全クエリ取得件数・カット件数確認
- 前提: LLM は Gemini 3.1 Flash-Lite（15 RPM / 500 RPD）。日次収集上限 合計約 280 件 + サマリー 1 コール

---

## 実装前に確認が必要な事項

（URL 系 5 件は 2026-07-04 に実物確認済み。詳細は D-033）

- [x] **openai/codex の GitHub Releases Atom URL** … `https://github.com/openai/codex/releases.atom` ✅HTTP 200。**ただし `rust-vX.Y.Z-alpha.N` 形式の alpha ビルドが毎日大量に流れる → gemini-cli の nightly と同様、安定版のみに絞るフィルタ必須**（`-alpha` / `-beta` / `-rc` を含むタグを除外）
- [x] **Qiita の Codex タグ名** … slug は **`codex`** で確定（`query=tag:codex`）。実在確認済み（記事 908 件 / フォロワー 803）
- [x] **Zenn の Codex トピック名** … **`https://zenn.dev/topics/codex/feed`** ✅HTTP 200・記事あり（トピック名「Codex」）
- [x] ~~**Google News RSS 検索 URL**~~ … 確認の結果、**不採用に変更（D-034）**。リダイレクト URL で横断重複排除が効かない・人気指標なし・description が薄い・新規アダプタ実装が必要、の 4 点が理由。代替として**はてブ検索 RSS 2 本**を採用: 「AI 導入」（`target=title`）/「生成AI ビジネス」（`target=text`）、いずれも `users=1`・UTF-8 %エンコード・各 40 件返却を実測確認済み。**既定（タグ検索 + users=3）のままだとほぼヒットしないため `target` と `users` の明示が必須**
- [x] **PR TIMES または ITmedia AI+ の RSS URL** … **ITmedia AI+ を採用**: `https://rss.itmedia.co.jp/rss/2.0/aiplus.xml` ✅20 件・全件 AI 関連・元記事 URL 直リンク・pubDate JST。PR TIMES は却下（`index.rdf` は全業種プレスリリースの firehose で AI 専門フィードが無い。D-033）
- [x] **AI Studio でプロジェクトの実測レート制限を確認** … Flash-Lite が 15 RPM / 500 RPD であることを確認（枠は予告なく変動するため）※ユーザー作業
- [x] **Slack アプリ作成 + Incoming Webhook URL 発行** … 発行済み・GitHub Actions Secrets に `SLACK_WEBHOOK_URL` 登録済み（2026-07-07 確認）

## フェーズ A: スキーマ・型の拡張（他フェーズの土台）【完了 2026-07-05】

- [x] `articles` にカラム追加: `audience` / `difficulty` / `importance_reason` / `tags` / `popularity`（`supabase/migrations/003_expand_schema.sql`）
- [x] `daily_summaries` テーブル新設（date PK / summary_ja / created_at）（同上）
- [x] 型定義の拡張: `Product` に `codex`、`Category` に `business` / `case_study`、`Enrichment` に新 4 フィールド、`RawArticle` に `popularity?`（`batch/src/types.ts`）
- [x] `SourceConfig` 型の新設（adapter / dailyLimit / rank?）（同上）
- [x] cleanup.ts の条件変更: `is_favorite` 参照を削除し「published_at が 30 日超は全削除」に単純化

## フェーズ B: LLM プロンプト拡張【完了 2026-07-05】

- [x] 出力 JSON に `importance_reason` / `tags` / `audience` / `difficulty` を追加（SPEC_EXPANSION §4.1）
- [x] `category` の判定基準に `business` / `case_study` の定義を追記（§4.4）
- [x] `difficulty` の判定基準（1〜3）と具体例をプロンプトに明記（§4.3。迷ったら低い方に倒す）
- [x] JSON パースの拡張フィールド対応（欠損時のフォールバック: null で保存）
- [~] サンプル記事 5〜10 件で分類結果を目視確認（特に difficulty の揺れ）— 実 API 呼び出しが必要なため未実施。運用開始後に確認する
- [x] `batch/src/lib/upsert.ts` に `audience` / `difficulty` / `importance_reason` / `tags` の保存を追加（現状は Enrichment を列ごと手動マッピングしており、このままだと LLM が出力しても DB に保存されず捨てられるため）

## フェーズ C: 収集パイプラインの上限・rank 対応【完了 2026-07-05】

- [x] `sources/index.ts` を `SourceConfig[]` に変更し、全クエリに `dailyLimit` を設定（§5.2 の表の値。`hatenaGemini` は表に明記が無かったため `hatenaClaudeCode` と対称に dailyLimit=15・ブクマ数降順としている）
- [x] collect.ts: fetch 後・enrich 前に dailyLimit で件数カット（rank 指定があればソートしてから）
- [x] Qiita アダプタ: `popularity`（ストック数）を埋める + rank 関数（ストック数降順）
- [x] はてブ アダプタ: `popularity`（`hatena:bookmarkcount`）を埋める + rank 関数（ブクマ数降順）
- [x] RPM 制御を 4 秒間隔に調整（15 RPM 内）
- [x] **クエリ別のカット件数をログ出力**（どのクエリの上限を次に広げるか判断するため）
- [x] `batch/src/lib/upsert.ts` に `popularity` の保存を追加（フェーズBで追加した4項目と合わせて Enrichment/RawArticle 由来の新カラムが揃う）

## フェーズ D: 新ソースアダプタ【完了 2026-07-05】

- [x] `githubReleases`（openai/codex）… `https://github.com/openai/codex/releases.atom` で追加、登録配列に 1 行。**alpha/beta/rc ビルドの除外フィルタ必須**
- [x] `qiita` に Codex タグのクエリを追加（`query=tag:codex`）
- [x] `zenn` に codex トピックのクエリを追加（`https://zenn.dev/topics/codex/feed`）
- [x] `hatena` に検索クエリ 2 本を追加（D-034）: 「AI 導入」（`target=title&users=1`）/「生成AI ビジネス」（`target=text&users=1`）。新規アダプタ実装は不要（既存 hatena アダプタのクエリパラメータ化で対応）
- [x] `itmedia` アダプタ新規実装（`https://rss.itmedia.co.jp/rss/2.0/aiplus.xml`）
- [x] relevance.ts の強化: はてブ title/text 検索 / ITmedia 系用のキーワードフィルタ（「広く取る × きつく濾す」）。`isRelevantToAI`（広め共通判定）+ `isRelevantToAiAdoption`/`isRelevantToAiBusiness`（現状は同一ロジックだが将来の個別調整に備えて分離）
- [~] ローカル実行で全クエリの取得件数・カット件数を確認 — 実ネットワーク呼び出しが必要なため未実施。単体テストでロジック検証済み。運用開始後に確認する

## フェーズ E: 一言サマリー（吹き出し）生成【完了 2026-07-05】

- [x] `batch/src/summarize.ts`: 当日 TOP5 のタイトル + 要約から一言サマリー（3 行以内・口語）を 1 コール生成
- [x] `daily_summaries` へ date で upsert
- [x] collect.yml の最終ステップに組み込み（enrich 完了後）
- [x] 記事 0 件の日の挙動を確認（生成スキップ or 定型文）→ フォールバック定型文採用

## フェーズ F: Slack 通知【完了 2026-07-07】

- [x] Secrets に `SLACK_WEBHOOK_URL` を登録（ユーザー作業。登録済み）
- [x] `batch/src/notify.ts`: 当日 TOP5 + `daily_summaries.summary_ja` を Block Kit 形式で POST（TOP5 定義は summarize.ts と同一の直近24時間・importance_score 降順。LLM コールなし。記事 0 件の日は「静かだった」旨の本文で投稿）
- [x] collect.yml の最終ステップに組み込み（サマリー生成の後。summarize と同じ流儀で `continue-on-error: true`）
- [x] fail-soft: 通知失敗が collect 全体を落とさないことを確認 — **ユニットテストで検証済み**（SLACK_WEBHOOK_URL 未設定 / TOP5 取得失敗 / daily_summaries 取得失敗 / POST reject / 非2xx 応答の 5 ケースすべてで例外を投げず正常終了。`batch/src/notify.test.ts`）。実 Webhook への疎通確認はフェーズ H の全体疎通で実施すること

## フェーズ G: フロントエンド

### G-1. 画面のデータ駆動化【完了 2026-07-05】
- [x] `ScreenConfig` 型実装（§7.1。既存の同名型は `ScreenDisplayConfig` にリネームして衝突回避）
- [x] 既存 5 画面 + 新画面をプリセット定義に変換（§7.2 の表。`buttonSettings.ts` の `deriveCustomButtons` をアダプタ経由で再利用）
- [x] ホーム画面のボタン配列を設定から動的生成（TOP5 / お気に入りは固定枠）。BottomNav も同じ統合リストで動的化（ユーザー確認済み）
- [x] リスト画面を ScreenConfig 汎用コンポーネント化（filter + sort + `limit(20)`）。ブラウザで動作確認済み（7ボタン表示・`/screen/:groupKey` 遷移・TOP5/お気に入り/不正グループのリダイレクトすべて正常、コンソールエラーなし）

### G-2. 設定画面（デザイン正本: claude.ai/design「Button Settings.dc.html」。D-035）【完了 2026-07-05】
- [x] チェックボックス UI（5 グループ: Gemini / Claude Code / Codex / バックオフィス / 経営者向け。グループ内複数チェックは 1 ボタンに統合、合計最大 7 ボタン = 固定 2 + 自由枠 5）
- [x] 選択数カウンター（ボタン数 N/5）・保存 / キャンセル・ダークモード対応
- [x] localStorage への保存・読込
- [x] 属性の再選択導線（G-3 依存。「属性から選び直す」ボタンから `AttributePopup` を再オープン、選択は即時反映）

### G-3. 初回属性選択ポップアップ【完了 2026-07-05】
- [x] 初回訪問判定（localStorage フラグ。`aiCatchup.attributeOnboarded.v1`）
- [x] 属性選択 UI（エンジニア初級/中級/上級・バックオフィス・経営者）
- [x] 属性 → チェックのプリセット適用（プリセットマッピングは仕様に明記なく実装時に解釈。詳細は完了報告参照）。ブラウザ確認済み（初回表示・プリセット反映・2回目非表示・設定画面からの再選択、コンソールエラーなし）

### G-4. お気に入りの localStorage 化【完了 2026-07-05】
- [x] ★ 押下時に記事オブジェクト全体をスナップショット保存（`src/lib/favorites.ts`）
- [x] お気に入り画面を localStorage から描画（全件表示・日数/件数制限なし）。ブラウザ確認済み
- [x] `is_favorite` 参照の削除（DB 更新処理の除去）。あわせて `anon` の UPDATE 権限自体を revoke するマイグレーション追加（`004_remove_anon_update.sql`。以前確認した RLS の穴の解消。適用はユーザー側の作業）

### G-5. カード・吹き出し【完了 2026-07-05】
- [x] カード: 重要度バッジに `importance_reason` 併記 + タグチップ表示（`src/components/ArticleCard.tsx`）
- [x] TOP5 の選定対象をチェック中カテゴリに絞るフィルタ（`src/lib/screenFilter.ts`。欠損値は対象外に倒す方針。デプロイ直後〜次回バッチ実行までの一時的な空表示は既存の「今日は静かだった」空状態デザインでカバーされるため許容）
- [x] 吹き出し: `daily_summaries` 当日行を表示 + フォールバック文言（`src/lib/dailySummary.ts`）
- [x] 空状態の文言調整（「今日は静かだった」と伝わる表現）。ブラウザ確認済み（コンソールエラーなし、フォールバック文言・空状態文言とも表示確認済み。実データに`importance_reason`/`tags`が無いため表示ロジックはコードレビューで確認）
- [x] **要フォローアップ解消**（2026-07-10）: バッチが複数回運用された結果、既存記事に `audience`/`difficulty`/`importance_reason`/`tags` が全件（直近200件で確認）埋まっている状態になった。Playwright で実データを使い、デフォルト選択（Claude Code + Gemini 全難易度）で TOP5 に記事が表示され、カードに重要度理由・タグチップが正しく表示されることを確認済み。`matchesFilter` の欠損値ポリシー見直しは不要と判断

## フェーズ H: 仕上げ

- [~] 全体疎通: 収集（上限・rank）→ 分類（新軸）→ サマリー → Slack 通知 → 表示 → 設定変更 → お気に入り。
  - [x] 収集 → 分類 → サマリー: 実運用データで確認済み（articles 1,622 件、直近200件で新カラム全件埋まり、`daily_summaries` に当日行あり）
  - [x] 表示・設定変更・お気に入り: Playwright（Chromium）で実データを使い自動検証済み（2026-07-10）。属性プリセット反映・設定画面での選択変更→ホーム反映・TOP5表示（重要度バッジ+理由+タグチップ）・お気に入り追加/解除の一連動作を確認
  - [ ] Slack 通知: 実 Webhook への疎通確認は未実施（ユーザー判断で今回は見送り。ユニットテストでのfail-soft検証はフェーズFで完了済み）
- [x] 属性プリセット 5 通りそれぞれでホーム画面のボタン構成を確認（2026-07-10・Playwright）: エンジニア初級/中級/上級→Gemini・Claude Code・Codexの3ボタン、バックオフィス→1ボタン、経営者→1ボタン、いずれも localStorage 保存値・ホーム表示ラベルとも期待どおり
- [x] 難易度フィルタ画面が切替期に疎になることの表示　確認（空状態が出ること）（2026-07-10・Playwright。Supabaseレスポンスを空配列にモックして確定的に検証。「このカテゴリは今日は静からしいよ」「新しい記事が来たらすぐここに並ぶよ」の表示を確認）
- [x] GitHub Actions の実行時間確認（280 件時 約 20 分の想定内か）（2026-07-10・`gh run list` で実測: 4分30秒〜7分11秒。想定を大幅に下回り問題なし）
- [x] DECISIONS.md への反映（番号衝突のため **D-024〜D-032** に振り直して反映済み 2026-07-04）
- [x] CLAUDE.md への反映（LLM 前提・型定義・SourceConfig・Slack・localStorage 等を更新済み 2026-07-04）
- [x] SPEC.md への反映（2026-07-10。§2〜12 に統合し、SPEC_EXPANSION.md はアーカイブ済み注記を付与）
- [ ] README 更新

## フェーズ I: デザイン修正【未着手】

- [ ] デザイン修正
  - [ ] ヘッダータイトル横の画像が以前のまま。ホーム画面に表示しているロボットを生成し変更。背景を透過し、ダークモード表示でもデザインが崩れないこと
  - [ ] 記事がない場合、`robot_01-DsPZyDqY.png` などの以前の画像をランダムで表示している。ホーム画面に表示しているロボットの画像を生成し変更。ランダム表示は不要なため1枚のみでよい
  - [ ] ヘッダーの設定ボタン、ダークモードボタンはサイズをもう少し大きくする。2つのボタンの間隔はもう少し小さくする
  - [ ] ホーム画面
    - [ ] 画面幅が小さくなると吹き出しとロボットが見づらいので、縦並びにする
    - [ ] 7つのボタンの下に「ボタンをカスタマイズする」リンクを配置し、設定画面に遷移できるようにする（リンクサイズは小さめでよい）
  - [ ] 重要トピック
    - [ ] サブタイトル「グループ別の重要トピック」→「直近24時間の重要記事をピックアップ。毎朝5時に更新」に変更
    - [ ] 各カード上部のカテゴリ名をもう少し大きくし、見出しとしてのデザインを追加
    - [ ] 「元記事を開く」ボタンが押せるとわかりにくいため、クリッカブルなデザインにしてホバー時にエフェクトを付ける
  - [ ] エンジニア画面: サブタイトルで「すべて」と省略せず、初級・中級・上級と表示する
  - [ ] バックオフィス画面: サブタイトルで「すべて」と省略しない
  - [ ] 経営層画面: サブタイトルで「すべて」と省略しない
  - [ ] お気に入り画面: お気に入りのカードのみ左端に青・オレンジの色帯が表示されている。他画面と同様に色帯は不要
  - [ ] 設定画面
    - [ ] 「最大5つまで選べます」の文言を削除し、選択数の上限を設けない
    - [ ] 一括全選択/解除ボタンを追加
    - [ ] PC表示時、「キャンセル」「保存する」ボタンを画面右下に固定表示する
    - [ ] 「属性から選びなおす」リンク押下時、モーダルが画面中央に出ずスクロールが必要になっている。現在表示中の画面中央にモーダルを表示するよう修正
    - [ ] 属性から選びなおすと保存ボタンを押さなくても変更が保存されてしまっている。保存ボタン押下後に反映されるよう修正
    - [ ] 属性再選択モーダルが×ボタンでしか閉じられない。モーダル画面外クリックでも閉じられるよう修正
  - [ ] 属性選択画面（初回のみ）
    - [ ] 設定画面と同様、チェックボックスで選択できるUIに変更
    - [ ] ホーム画面に表示されるボタンの数（デフォルトの重要トピック・お気に入りも含む）を分かりやすく表示し、キャッチアップ開始ボタンを設置

---

## 未決事項（必要になったら確認）

- ~~PR TIMES / ITmedia AI+ のどちらを採用するか~~ → **ITmedia AI+ に決定**（2026-07-04 実物確認。D-033）
- ~~Google News 2 クエリの具体的な検索語~~ → **Google News 自体を不採用とし、はてブ検索「AI 導入」（title）/「生成AI ビジネス」（text）に決定**（2026-07-04 実物確認。D-034。クエリ語は運用しながら調整可）
- 将来の本格複数人対応（Supabase 匿名認証 + favorites テーブル移行）… 今回スコープ外
