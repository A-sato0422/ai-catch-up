# AI Catchup

Claude Code / Gemini / Codex の最新情報アグリゲーター。

「1 日 1 回見るだけでキャッチアップが完了する」を目指した特化ツール。汎用 RSS リーダーの「足し算（全部見せる）」ではなく、**引き算（今日の重要なものだけに絞る）** がコンセプト。英語の一次情報は Gemini API による日本語要約で提示する。エンジニア（初級/中級/上級）・バックオフィス・経営者向けに、ホーム画面のボタン構成を属性に合わせてカスタマイズできる。

---

## 技術スタック

| 領域 | 技術 |
|---|---|
| フロントエンド | React + TypeScript + Vite + Tailwind CSS |
| ルーティング | React Router v6（TOP5・お気に入りは固定枠、他は `ScreenConfig` からデータ駆動生成） |
| ホスティング | Vercel |
| DB / BaaS | Supabase (PostgreSQL) |
| バッチ実行 | GitHub Actions（cron + workflow_dispatch） |
| バッチ言語 | TypeScript（Node.js 20） |
| LLM | Gemini 3.1 Flash-Lite（要約・分類・重要度判定） |
| 通知 | Slack Incoming Webhook（当日 TOP5 + 一言サマリーを 1 日 1 投稿） |
| ユーザー設定 | localStorage（認証なし。設定・属性・お気に入り） |

フロントとバッチは疎結合。フロントは Supabase を読むだけ。収集・加工は GitHub Actions 側に閉じる。

---

## ディレクトリ構成

```
.
├── index.html                # フロントのエントリ
├── src/                      # フロントのソース（React + Vite）
│   ├── components/            # AttributePopup / ArticleCard / Layout 等
│   ├── pages/                 # HomePage / ListPage / GroupScreenPage / SettingsPage
│   ├── lib/                   # buttonSettings / attributePresets / favorites / screens / screenFilter
│   ├── hooks/useArticles.ts
│   └── lib/supabase.ts
├── batch/                    # 収集・加工バッチ
│   └── src/
│       ├── sources/           # ソースアダプタ（GitHub/Qiita/Zenn/はてブ/ITmedia 等。index.ts に SourceConfig[] を集約）
│       ├── llm/                # LLM プロバイダ（Gemini）
│       ├── lib/                 # 共通ライブラリ（URL 正規化・upsert・relevance フィルタ等）
│       ├── collect.ts          # 収集パイプライン
│       ├── summarize.ts        # 当日 TOP5 → 一言サマリー生成
│       ├── notify.ts           # Slack 通知（Block Kit）
│       └── cleanup.ts          # 古い記事削除（30 日超）
├── supabase/migrations/       # DB マイグレーション（順番に適用）
└── .github/workflows/
    ├── collect.yml            # 収集 → enrich → サマリー → Slack 通知
    └── cleanup.yml            # 週次
```

---

## 画面構成

ホーム画面から、固定枠 2（TOP5・お気に入り）+ 自由枠最大 5（設定画面で選択したグループ）= 最大 7 ボタンへ遷移する構成。

| URL | 画面 |
|---|---|
| `/` | ホーム（ロボット + ボタン群 + 一言サマリー） |
| `/top5` | 今日の重要 TOP5（直近24時間・チェック中カテゴリに絞った重要度上位5件） |
| `/screen/:groupKey` | 自由枠（`gemini` / `claude` / `codex` / `backoffice` / `exec`。設定画面のチェックから動的生成） |
| `/fav` | お気に入り（localStorage 全件） |
| `/settings` | 設定画面（チェックボックスでボタン構成を選択。属性からの再選択も可） |

初回訪問時は属性選択ポップアップ（エンジニア初級/中級/上級・バックオフィス・経営者）が表示され、選んだ属性に応じたチェックのプリセットが自由枠に適用される。

---

## 情報ソース

- GitHub Releases（`anthropics/claude-code` / `google-gemini/gemini-cli` / `openai/codex`。Codex は alpha/beta/rc ビルドを除外）
- Qiita（ClaudeCode / Gemini / Codex タグ。ストック数を popularity として保持）
- Zenn（claudecode / gemini / codex トピック）
- はてなブックマーク（キーワード検索。Claude Code / AI導入 / 生成AIビジネス。ブクマ数を popularity として保持）
- Google Developers Blog / DeepMind Blog（Gemini キーワードフィルタ）
- Anthropic News（第三者フィード）
- ITmedia AI+（ビジネス/業界動向）

各ソースはクエリ単位で日次上限（`dailyLimit`）を持ち、上限超過時は人気指標（あれば）または新着順で選抜する（`batch/src/sources/index.ts`）。

---

## LLM 加工

1 記事につき Gemini 3.1 Flash-Lite を 1 コール呼び出し、以下を同時取得する。

- `summary_ja`: 日本語 3 行要約
- `category`: `update` / `tips` / `business` / `case_study`
- `importance_score`: 重要度 1〜10
- `importance_reason`: 重要な理由の短文（10〜15字）
- `tags`: トピックタグ 2〜3個
- `audience`: `engineer` / `backoffice` / `executive`
- `difficulty`: 難易度 1〜3（初級/中級/上級）

日次収集上限は合計約 280 件 + サマリー生成 1 コール（Gemini 3.1 Flash-Lite の 500 RPD の約 56%）。

---

## セットアップ

### 1. 環境変数

`.env.example` をコピーして `.env` を作成する。

```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=   # バッチ専用（フロントには絶対出さない）
VITE_SUPABASE_URL=      # フロント用
VITE_SUPABASE_ANON_KEY= # フロント用（anon key + RLS）
GEMINI_API_KEY=
QIITA_TOKEN=            # 任意（未設定でも動作するが取得件数が減る）
LLM_PROVIDER=gemini     # gemini | claude（切替可能な抽象化）
SLACK_WEBHOOK_URL=      # Slack Incoming Webhook（未設定でも収集は継続。通知のみ fail-soft でスキップ）
```

> **セキュリティ注意**
> - `.env*` は `.gitignore` 登録済み。コミット前に `git diff` で鍵の混入がないか確認すること。
> - `SUPABASE_SERVICE_KEY` は GitHub Actions 専用。フロントコードに絶対含めない。
> - 万一鍵を push してしまった場合は、履歴削除に加えて**必ずキーをローテーション（再発行）**する。

### 2. Supabase セットアップ

1. Supabase プロジェクトを作成する。
2. SQL Editor で `supabase/migrations/` 配下のマイグレーションを番号順に実行する（`001` 〜 `004`）。
3. Project URL / anon key / service_role key を取得して `.env` に設定する。

### 3. GitHub Actions Secrets

リポジトリの Settings > Secrets and variables > Actions に以下を登録する。

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `QIITA_TOKEN`
- `SLACK_WEBHOOK_URL`

### 4. ローカル実行

```bash
# フロント（リポジトリルートで実行）
npm install
npm run dev

# バッチ
cd batch
npm install
npm run collect     # 収集 → 加工 → Supabase 保存
npm run summarize   # 当日 TOP5 → 一言サマリー生成（daily_summaries へ upsert）
npm run notify      # Slack 通知（SLACK_WEBHOOK_URL 未設定時は何もしない）
npm run cleanup     # 古い記事削除（published_at が 30 日超）
```

### 5. テスト

```bash
npm run test          # フロント（src/）のユニットテスト（Vitest + jsdom）
cd batch && npm test   # バッチ（batch/src/）のユニットテスト（Vitest）
```

---

## 仕様・設計判断のドキュメント

- `SPEC.md`: 仕様の正典。実装判断はこのドキュメントに従う。
- `DECISIONS.md`: 設計判断の記録（ADR）。「なぜその選択をしたか」を追う場合はこちら。
- `CLAUDE.md`: Claude Code 向けの常時指示書（アーキテクチャの核・コーディング規約・セキュリティ）。
