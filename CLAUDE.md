# CLAUDE.md

このファイルは Claude Code への常時指示書です。実装時は **必ず本ファイルと `SPEC.md` を読んでから** 作業を開始し、進捗は `TASK.md` に記録すること。設計判断の理由・却下案は `DECISIONS.md`（ADR）を参照し、新たな判断をしたら同ファイルに追記すること。

> **【機能拡張フェーズの特例】** 現在は MVP リリース後の機能拡張作業中。この間は **`SPEC_EXPANSION.md` が差分仕様の正典**（`SPEC.md` と矛盾したら SPEC_EXPANSION.md が優先）で、進捗は **`TASK_EXPANSION.md`** に記録する。拡張完了時に SPEC.md へ反映し、SPEC_EXPANSION.md / TASK_EXPANSION.md はアーカイブする。設計判断 D-024〜D-032 は反映済み。

---

## 1. プロジェクト概要

**プロダクト名（仮）**: AI Catchup（Claude Code / Gemini 最新情報アグリゲーター）

**目的**: Claude Code と Gemini の最新情報を 1 つのサイトに集約し、「1 日 1 回見るだけでキャッチアップが完了する」状態を作る。英語の一次情報は日本語要約で提示する。

**利用形態**: まずは自分専用の MVP。需要があれば公開も視野（DB 設計・認証は将来の公開を阻害しない範囲で配慮するが、MVP では作り込まない）。

**コンセプトの軸**: 汎用 RSS リーダー（Feedly 等）の「足し算（全部見せる）」ではなく、**特化ツールの「引き算（今日の重要なものだけに絞る）」**。機能追加で迷ったら、この軸（情報を減らす方向か）で判断する。

---

## 2. 技術スタック

| 領域 | 技術 |
|---|---|
| フロントエンド | React + TypeScript + Vite |
| CSS | Tailwind CSS（ユーティリティファースト。カスタムカラーは `tailwind.config.ts` で定義） |
| ルーティング | **React Router v6**（`BrowserRouter`）を使用。TOP5・お気に入りは固定枠、他の画面は `ScreenConfig`（SPEC_EXPANSION §7.1）からデータ駆動で生成（自由枠は最大 4 つ） |
| レスポンシブ | モバイル・デスクトップ両対応。Tailwind のブレークポイント (`sm:` / `md:` / `lg:`) を使用 |
| ロボット画像 | `src/assets/robots/` に配置（`robot-search.png` / `robot-rest.png`） |
| ホスティング（表示） | Vercel |
| DB / BaaS | Supabase (PostgreSQL) |
| バッチ実行基盤 | GitHub Actions（`schedule` cron + `workflow_dispatch`） |
| バッチ言語 | TypeScript（Node.js 20） |
| RSS/Atom パース | `rss-parser` |
| LLM（要約・分類・スコアリング） | Gemini 3.1 Flash-Lite 無料枠（15 RPM / 500 RPD。差し替え可能な抽象化の裏） |
| 通知 | Slack Incoming Webhook（当日 TOP5 + 一言サマリーを 1 日 1 投稿） |
| ユーザー設定・お気に入り | localStorage（認証なし。★はスナップショット保存で DB の物理削除と独立） |

> フロントとバッチは疎結合。フロントは Supabase を読むだけ。収集・加工は GitHub Actions 側に閉じる。

---

## 3. アーキテクチャの核（最重要・絶対に守る）

後付けが困難なため、**MVP の初期段階でこの 3 つの抽象化を必ず実装する**。

### 3.1 ソースアダプタ（Source Adapter）
全ての情報源は共通インターフェースを満たすアダプタとして実装し、**`batch/src/sources/index.ts`（.ts の登録ファイル）の設定配列（`SourceConfig[]`）に登録する**。新ソース（例: Codex）の追加 = アダプタ 1 つ実装 + 配列に 1 行追加。**既存コードに手を入れない**こと。登録ファイルは JSON ではなく `.ts` とする（アダプタ＝関数を参照するため、また `product` 等の値の型チェックを効かせるため）。

```ts
type SourceId = string;            // 'github_claude_code' | 'qiita' | 'zenn' | ...
type Product = 'claude_code' | 'gemini' | 'codex' | 'other';

interface RawArticle {
  url: string;          // 正規化前の元 URL
  externalId?: string;  // ソースが振った固有 ID（任意・デバッグ/将来用）
  source: SourceId;
  product: Product;
  title: string;
  excerpt?: string;     // 本文 or 冒頭抜粋（要約の入力に使う）
  author?: string;
  publishedAt: string;  // ISO 8601
  popularity?: number;  // ソース固有の人気指標（Qiita ストック数 / はてブ ブクマ数）。rank 用
}

interface SourceAdapter {
  id: SourceId;
  fetch(): Promise<RawArticle[]>;
}

// 登録配列の要素。上限管理の単位はアダプタではなく「取得クエリ」（D-031）
interface SourceConfig {
  adapter: SourceAdapter;
  dailyLimit: number;                                // enrich に回す上限件数/日（合計約 280 件/日）
  rank?: (a: RawArticle, b: RawArticle) => number;   // 上限超過時の選抜順。未指定なら publishedAt 降順
}
```

上限超過でカットした件数は**クエリ別に実行ログへ出力**する（次にどのクエリを広げるかデータで判断するため）。

### 3.2 LLM プロバイダ抽象化（LLM Provider）
要約・分類・重要度判定は「プロバイダ」インターフェースの裏に隠す。Gemini → Claude API の切り替えは `LLM_PROVIDER` 環境変数の変更のみで完結させる。入出力 JSON 形式はプロバイダ間で統一する。

使用モデルは **Gemini 3.1 Flash-Lite（15 RPM / 500 RPD）単独**（D-024。旧 Flash → Flash-Lite フォールバックは 2025-12 の無料枠削減で廃止）。1 件ごとに約 4 秒間隔を空けて RPM を制御し、日次コール数は**収集上限 合計約 280 件 + 一言サマリー 1 コール**（500 RPD の約 56%。約 4 割を余白として残す。RPD リセットは太平洋時間 0 時 = JST 16 時）。本文は LLM へ渡す前に 2,000〜3,000 文字で打ち切る。

```ts
type Category = 'update' | 'tips' | 'business' | 'case_study';
type Audience = 'engineer' | 'backoffice' | 'executive';

interface Enrichment {
  summaryJa: string;            // 日本語 3 行要約
  category: Category;
  importanceScore: number;      // 1〜10
  importanceReason: string;     // 重要な理由の短文（10〜15 字。例「破壊的変更」）
  tags: string[];               // トピックタグ 2〜3 個
  audience: Audience;
  difficulty: number;           // 1〜3（初級/中級/上級）。迷ったら低い方に倒す
}

interface LLMProvider {
  enrich(article: RawArticle): Promise<Enrichment>;
}
```

分類は複合ラベルにせず **category × audience × difficulty の直交 3 軸**（D-025）。画面のフィルタ条件は全てこの 3 軸 + product の組み合わせで表現する。

### 3.3 重複排除（Upsert）
保存は **URL 正規化後の値を一意キー**にした upsert。既存ならスキップ。これにより収集頻度（1 日 1 回 → 複数回）を自由に変更してもデータが重複しない。

---

## 4. コーディング規約

- TypeScript は `strict: true`。`any` を避け、上記インターフェースに型を寄せる。
- 1 記事の加工は **LLM 1 コール**で要約・分類・スコア・理由・タグ・対象者・難易度を同時取得する（コール数を増やさない。D-006）。
- LLM 出力の拡張フィールド（`importance_reason` / `tags` / `audience` / `difficulty`）は欠損しうる前提で、欠損時は null で保存する。既存記事のバックフィルはしない（30 日ローテーションで自然に入れ替わる）。
- LLM へ渡す本文は **2,000〜3,000 文字で打ち切る**（プロンプト肥大化・トークン制限超過の防止）。
- 外部 I/O（fetch / DB / LLM）は必ず try-catch。1 ソースの失敗が全体を止めないよう、ソース単位で握りつぶしてログに残す（fail-soft）。
- LLM 出力は JSON パースに失敗しうる前提で、パース失敗時のフォールバック（要約なしで保存 or スキップ）を実装する。
- 関数・変数は意図が分かる命名。コメントは「なぜ」を書く（「何を」はコードで表現）。

---

## 5. セキュリティ（厳守）

- **シークレットを絶対にコミットしない。** `SUPABASE_SERVICE_KEY` / `GEMINI_API_KEY` / `QIITA_TOKEN` / `SLACK_WEBHOOK_URL` は GitHub Actions Secrets と `.env`（gitignore 済み）のみで管理。
- フロントから Supabase を叩く場合は **anon key + RLS** を使う。`service_role` key は **バッチ（GitHub Actions）専用**で、クライアントに絶対出さない。
- `.env*` は `.gitignore` に登録。コミット前に `git diff` で鍵が混入していないか確認する。
- 万一鍵を push してしまった場合は、履歴から消すだけでなく**該当キーを必ずローテーション（再発行）**する。

---

## 6. ディレクトリ構成（想定）

フロントは Vite のルート（リポジトリルート直下）に配置。`web/` サブディレクトリは使わない。

```
.
├── CLAUDE.md
├── SPEC.md                   # 仕様の正典（MVP）
├── SPEC_EXPANSION.md         # 機能拡張の差分仕様（拡張作業中の正典。完了後アーカイブ）
├── TASK.md
├── TASK_EXPANSION.md         # 機能拡張の進捗管理
├── DECISIONS.md              # 設計判断の記録（ADR）
├── index.html                # フロント（Vite + React）のエントリ
├── vite.config.ts
├── src/                      # フロントのソース
│   ├── components/
│   ├── hooks/
│   └── lib/supabase.ts
├── batch/                    # 収集・加工バッチ
│   └── src/
│       ├── sources/          # ソースアダプタ群（3.1）
│       │   ├── index.ts      # SourceConfig[] 登録配列（dailyLimit / rank もここ）
│       │   ├── githubReleases.ts  # claude-code / gemini-cli / codex
│       │   ├── qiita.ts
│       │   ├── zenn.ts
│       │   ├── hatena.ts          # 既存 + 導入事例/ビジネス系の検索クエリ 2 本（Google News は不採用。D-034）
│       │   ├── anthropicNews.ts
│       │   └── itmedia.ts         # ITmedia AI+（PR TIMES は却下。D-033）
│       ├── llm/              # LLM プロバイダ（3.2）
│       │   ├── index.ts      # プロバイダ選択（env）
│       │   ├── gemini.ts
│       │   └── claude.ts     # 将来用スタブ可
│       ├── lib/
│       │   ├── normalizeUrl.ts  # URL 正規化（3.3）
│       │   ├── relevance.ts     # キーワード関連度フィルタ（はてブ検索・ITmedia 等は必須）
│       │   └── supabase.ts
│       ├── collect.ts        # 収集パイプライン本体
│       ├── summarize.ts      # 当日 TOP5 → 一言サマリー生成（daily_summaries へ upsert）
│       ├── notify.ts         # Slack 通知（Block Kit / LLM コールなし）
│       └── cleanup.ts        # 古い記事の物理削除（published_at 30 日超は全削除）
└── .github/workflows/
    ├── collect.yml           # 収集 → enrich → サマリー → Slack 通知
    └── cleanup.yml
```

---

## 7. よく使うコマンド（実装に合わせて更新する）

```bash
# フロント（リポジトリルートで実行）
npm run dev
npm run build

# バッチ（ローカル実行）
cd batch && npm run collect      # 収集→加工→保存
cd batch && npm run cleanup      # 古い記事削除
```

---

## 8. 作業のルール

- 着手前に進捗ファイル（機能拡張中は `TASK_EXPANSION.md`、それ以外は `TASK.md`）の現在地（Current State）を確認し、完了したら該当タスクのチェックを更新する。
- 仕様の解釈に迷ったら `SPEC.md` を正典とする。ただし機能拡張の範囲は `SPEC_EXPANSION.md` が差分の正典（矛盾したらこちらが優先）。どちらにも無い判断が必要になったら、勝手に決めず進捗ファイルの「未決事項」に書き出して確認を仰ぐ。
- スコープ外（`SPEC.md` の Non-Goals）には手を出さない。
- 各フェーズの実装タスクは `.claude/agents/phase-implementer.md` の subagent に委譲すること。
