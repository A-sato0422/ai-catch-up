# AI Catchup

Claude Code / Gemini の最新情報アグリゲーター。

「1 日 1 回見るだけでキャッチアップが完了する」を目指した特化ツール。汎用 RSS リーダーの「足し算（全部見せる）」ではなく、**引き算（今日の重要なものだけに絞る）** がコンセプト。英語の一次情報は Gemini API による日本語要約で提示する。

---

## 技術スタック

| 領域 | 技術 |
|---|---|
| フロントエンド | React + TypeScript + Vite + Tailwind CSS |
| ルーティング | React Router v6 |
| ホスティング | Vercel |
| DB / BaaS | Supabase (PostgreSQL) |
| バッチ実行 | GitHub Actions（cron + workflow_dispatch） |
| バッチ言語 | TypeScript（Node.js 20） |
| LLM | Gemini API（要約・分類・重要度判定） |

フロントとバッチは疎結合。フロントは Supabase を読むだけ。収集・加工は GitHub Actions 側に閉じる。

---

## ディレクトリ構成

```
.
├── index.html                # フロントのエントリ
├── src/                      # フロントのソース（React + Vite）
│   ├── components/
│   ├── hooks/useArticles.ts
│   ├── pages/
│   └── lib/supabase.ts
├── batch/                    # 収集・加工バッチ
│   └── src/
│       ├── sources/          # ソースアダプタ（GitHub/Qiita/Zenn/はてブ/Google 等）
│       ├── llm/              # LLM プロバイダ（Gemini）
│       ├── lib/              # 共通ライブラリ（URL 正規化・upsert 等）
│       ├── collect.ts        # 収集パイプライン
│       └── cleanup.ts        # 古い記事削除
└── .github/workflows/
    ├── collect.yml           # 毎日 07:00 JST
    └── cleanup.yml           # 毎週日曜 08:00 JST
```

---

## 画面構成

| URL | 画面 |
|---|---|
| `/` | ホーム（ロボット + 5 ナビボタン） |
| `/top5` | 今日の TOP5（当日記事を重要度順） |
| `/update` | アップデート一覧 |
| `/tips` | Tips（Claude Code） |
| `/tips-gemini` | Tips（Gemini） |
| `/fav` | お気に入り |

---

## 情報ソース

- GitHub Releases（`anthropics/claude-code` / `google-gemini/gemini-cli`）
- Qiita（ClaudeCode / Gemini タグ）
- Zenn（claudecode / gemini トピック）
- はてなブックマーク（キーワード検索）
- Google Developers Blog / DeepMind Blog（Gemini キーワードフィルタ）
- Anthropic News（第三者フィード）

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
```

> **セキュリティ注意**
> - `.env*` は `.gitignore` 登録済み。コミット前に `git diff` で鍵の混入がないか確認すること。
> - `SUPABASE_SERVICE_KEY` は GitHub Actions 専用。フロントコードに絶対含めない。
> - 万一鍵を push してしまった場合は、履歴削除に加えて**必ずキーをローテーション（再発行）**する。

### 2. Supabase セットアップ

1. Supabase プロジェクトを作成する。
2. SQL Editor で `supabase/migrations/001_create_articles.sql` を実行する。
3. SQL Editor で `supabase/migrations/002_fix_grants.sql` を実行する。
4. Project URL / anon key / service_role key を取得して `.env` に設定する。

### 3. GitHub Actions Secrets

リポジトリの Settings > Secrets and variables > Actions に以下を登録する。

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `QIITA_TOKEN`

### 4. ローカル実行

```bash
# フロント（リポジトリルートで実行）
npm install
npm run dev

# バッチ（疎通確認用に BACKFILL_DAYS=1 を推奨）
cd batch
npm install
BACKFILL_DAYS=1 npm run collect   # 収集 → 加工 → Supabase 保存
npm run cleanup                   # 古い記事削除（30 日超・非お気に入り）
```
