# CLAUDE.md

このファイルは Claude Code への常時指示書です。実装時は **必ず本ファイルと `SPEC.md` を読んでから** 作業を開始し、進捗は `TASK.md` に記録すること。設計判断の理由・却下案は `DECISIONS.md`（ADR）を参照し、新たな判断をしたら同ファイルに追記すること。

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
| ルーティング | **React Router v6**（`BrowserRouter`）を使用。URL: `/`, `/top5`, `/update`, `/tips`, `/tips-gemini`, `/fav` |
| レスポンシブ | モバイル・デスクトップ両対応。Tailwind のブレークポイント (`sm:` / `md:` / `lg:`) を使用 |
| ロボット画像 | `src/assets/robots/` に配置（`robot-search.png` / `robot-rest.png`） |
| ホスティング（表示） | Vercel |
| DB / BaaS | Supabase (PostgreSQL) |
| バッチ実行基盤 | GitHub Actions（`schedule` cron + `workflow_dispatch`） |
| バッチ言語 | TypeScript（Node.js 20） |
| RSS/Atom パース | `rss-parser` |
| LLM（要約・分類・スコアリング） | Gemini API 無料枠（差し替え可能な抽象化の裏） |

> フロントとバッチは疎結合。フロントは Supabase を読むだけ。収集・加工は GitHub Actions 側に閉じる。

---

## 3. アーキテクチャの核（最重要・絶対に守る）

後付けが困難なため、**MVP の初期段階でこの 3 つの抽象化を必ず実装する**。

### 3.1 ソースアダプタ（Source Adapter）
全ての情報源は共通インターフェースを満たすアダプタとして実装し、**`batch/src/sources/index.ts`（.ts の登録ファイル）の設定配列に登録する**。新ソース（例: Codex）の追加 = アダプタ 1 つ実装 + 配列に 1 行追加。**既存コードに手を入れない**こと。登録ファイルは JSON ではなく `.ts` とする（アダプタ＝関数を参照するため、また `product` 等の値の型チェックを効かせるため）。

```ts
type SourceId = string;            // 'github_claude_code' | 'qiita' | 'zenn' | ...
type Product = 'claude_code' | 'gemini' | 'other'; // 将来 'codex' 等を追加

interface RawArticle {
  url: string;          // 正規化前の元 URL
  externalId?: string;  // ソースが振った固有 ID（任意・デバッグ/将来用）
  source: SourceId;
  product: Product;
  title: string;
  excerpt?: string;     // 本文 or 冒頭抜粋（要約の入力に使う）
  author?: string;
  publishedAt: string;  // ISO 8601
}

interface SourceAdapter {
  id: SourceId;
  fetch(): Promise<RawArticle[]>;
}
```

### 3.2 LLM プロバイダ抽象化（LLM Provider）
要約・分類・重要度判定は「プロバイダ」インターフェースの裏に隠す。Gemini → Claude API の切り替えは `LLM_PROVIDER` 環境変数の変更のみで完結させる。入出力 JSON 形式はプロバイダ間で統一する。

Gemini プロバイダの内部では、**まず Flash（250 RPD）を使い、その日の枠を使い切ったら Flash-Lite（1,000 RPD）へ自動フォールバック**する（無料枠はモデル別枠のため合計約 1,250 RPD）。Flash は 10 RPM 制限があるので 1 件ごとに約 6 秒間隔を空ける。本文は LLM へ渡す前に 2,000〜3,000 文字で打ち切る。

```ts
interface Enrichment {
  summaryJa: string;            // 日本語 3 行要約
  category: 'update' | 'tips';  // 新機能・アップデート / Tips
  importanceScore: number;      // 1〜10
}

interface LLMProvider {
  enrich(article: RawArticle): Promise<Enrichment>;
}
```

### 3.3 重複排除（Upsert）
保存は **URL 正規化後の値を一意キー**にした upsert。既存ならスキップ。これにより収集頻度（1 日 1 回 → 複数回）を自由に変更してもデータが重複しない。

---

## 4. コーディング規約

- TypeScript は `strict: true`。`any` を避け、上記インターフェースに型を寄せる。
- 1 記事の加工は **LLM 1 コール**で要約・分類・スコアを同時取得する（コール数を増やさない）。
- LLM へ渡す本文は **2,000〜3,000 文字で打ち切る**（プロンプト肥大化・トークン制限超過の防止）。
- 外部 I/O（fetch / DB / LLM）は必ず try-catch。1 ソースの失敗が全体を止めないよう、ソース単位で握りつぶしてログに残す（fail-soft）。
- LLM 出力は JSON パースに失敗しうる前提で、パース失敗時のフォールバック（要約なしで保存 or スキップ）を実装する。
- 関数・変数は意図が分かる命名。コメントは「なぜ」を書く（「何を」はコードで表現）。

---

## 5. セキュリティ（厳守）

- **シークレットを絶対にコミットしない。** `SUPABASE_SERVICE_KEY` / `GEMINI_API_KEY` / `QIITA_TOKEN` は GitHub Actions Secrets と `.env`（gitignore 済み）のみで管理。
- フロントから Supabase を叩く場合は **anon key + RLS** を使う。`service_role` key は **バッチ（GitHub Actions）専用**で、クライアントに絶対出さない。
- `.env*` は `.gitignore` に登録。コミット前に `git diff` で鍵が混入していないか確認する。
- 万一鍵を push してしまった場合は、履歴から消すだけでなく**該当キーを必ずローテーション（再発行）**する。

---

## 6. ディレクトリ構成（想定）

フロントは Vite のルート（リポジトリルート直下）に配置。`web/` サブディレクトリは使わない。

```
.
├── CLAUDE.md
├── SPEC.md
├── TASK.md
├── index.html                # フロント（Vite + React）のエントリ
├── vite.config.ts
├── src/                      # フロントのソース
│   ├── components/
│   ├── hooks/
│   └── lib/supabase.ts
├── batch/                    # 収集・加工バッチ
│   └── src/
│       ├── sources/          # ソースアダプタ群（3.1）
│       │   ├── index.ts      # アダプタ登録配列
│       │   ├── githubReleases.ts
│       │   ├── qiita.ts
│       │   ├── zenn.ts
│       │   ├── hatena.ts
│       │   └── anthropicNews.ts
│       ├── llm/              # LLM プロバイダ（3.2）
│       │   ├── index.ts      # プロバイダ選択（env）
│       │   ├── gemini.ts
│       │   └── claude.ts     # 将来用スタブ可
│       ├── lib/
│       │   ├── normalizeUrl.ts  # URL 正規化（3.3）
│       │   ├── relevance.ts     # キーワード関連度フィルタ
│       │   └── supabase.ts
│       ├── collect.ts        # 収集パイプライン本体
│       └── cleanup.ts        # 古い記事の物理削除
└── .github/workflows/
    ├── collect.yml
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

- 着手前に `TASK.md` の現在地（Current State）を確認し、完了したら該当タスクのチェックを更新する。
- 仕様の解釈に迷ったら `SPEC.md` を正典とする。`SPEC.md` に無い判断が必要になったら、勝手に決めず TASK.md の「未決事項」に書き出して確認を仰ぐ。
- スコープ外（`SPEC.md` の Non-Goals）には手を出さない。
