# SPEC_EXPANSION.md — 機能拡張 変更仕様（v2）

MVP リリース後の機能拡張の変更内容をまとめた文書。**本ファイルの確定内容は SPEC.md / DECISIONS.md に反映すること**（反映後、本ファイルはアーカイブ可）。進捗は `TASK_EXPANSION.md` で管理する。

---

## 1. 拡張の概要

| # | 機能 | 概要 |
|---|---|---|
| 1 | カスタム画面設定 | 設定画面のチェックボックスで、ホーム画面に表示するボタン（画面）をユーザーが選択できる |
| 2 | 属性別パーソナライズ | 初回訪問時に属性選択ポップアップを表示し、属性に応じたチェックのプリセットを適用 |
| 3 | カードの一目理解 | 重要度の理由・タグ・対象者・難易度を LLM が付与し、カードで即座に判断できるようにする |
| 4 | Slack 通知 | 当日 TOP5 + 一言サマリーを Incoming Webhook で通知 |
| 5 | ホーム吹き出しの動的化 | ハードコーディングをやめ、TOP5 から LLM 生成した一言サマリーを表示 |

**設計原則（変更なし）**: 引き算思想 / 1 記事 1 LLM コール（D-006）/ ソースアダプタ・LLM プロバイダ・upsert の抽象化維持。

---

## 2. LLM 前提の更新

- 使用モデル: **Gemini 3.1 Flash-Lite（15 RPM / 500 RPD）**。SPEC §6.5 の「Flash 250 + Flash-Lite 1,000」の記述は無効（2025-12 の無料枠削減により変更済み）。
- 日次コール数の設計値: **収集上限 合計 約280 件/日 + 一言サマリー 1 コール**。500 RPD に対し約 4 割の余白を残す（枠の再削減リスク・リトライ・同日再実行への保険。RPD リセットは太平洋時間 0 時 = JST 16 時である点に注意）。
- RPM 制御: 1 件ごとに約 4 秒間隔（15 RPM 内）。280 件時の実行時間は約 20 分。GitHub Actions 無料枠（private 2,000 分/月）内に収まるが、実行時間をログで監視する。
- 初回バックフィル対策: 従来の「初回のみ期間を絞る」方式を廃止し、**クエリ別日次上限（§5）で兼ねる**。

---

## 3. データモデル変更

### 3.1 `articles` テーブル — カラム追加

| カラム | 型 | 説明 |
|---|---|---|
| `audience` | text, nullable | `engineer` / `backoffice` / `executive`（LLM 出力） |
| `difficulty` | int, nullable | 1〜3（初級/中級/上級）。実質エンジニア記事用。business 系は 1 固定 |
| `importance_reason` | text, nullable | 重要な理由の短文（10〜15 字。例「破壊的変更」）（LLM 出力） |
| `tags` | text[], nullable | トピックタグ 2〜3 個（LLM 出力） |
| `popularity` | int, nullable | ソース固有の人気指標（Qiita ストック数 / はてブ ブクマ数）。rank 用 |

- `category` の値を拡張: `update` / `tips` / **`business`** / **`case_study`**
- `product` の値を拡張: `claude_code` / `gemini` / **`codex`** / `other`
- `is_favorite` は**廃止方向（非推奨）**。お気に入りは localStorage 管理へ移行（§7.4）。カラム自体は残してよいが、cleanup・フロントは参照しない。
- 既存記事のバックフィルは**行わない**。30 日ローテーションで自然に新形式へ入れ替わる（切替期は難易度フィルタ画面が疎になることを許容）。

### 3.2 `daily_summaries` テーブル — 新設

```sql
create table daily_summaries (
  date        date primary key,   -- JST の日付
  summary_ja  text not null,      -- ロボット吹き出し用の一言サマリー（3 行以内・口語）
  created_at  timestamptz default now()
);
```

- collect の最終ステップで、当日 TOP5 確定後にタイトル + 要約を 1 コールで渡して生成し、date で upsert。
- **全体 TOP5 ベースの共通サマリー 1 本のみ**。属性別の作り分けはしない（コール数が属性の組み合わせ分増えるため却下）。
- Slack 通知（§8）の冒頭文にも流用する。

---

## 4. LLM 加工仕様の変更（SPEC §6 差分）

### 4.1 出力 JSON（拡張後）

```json
{
  "summary_ja": "日本語 3 行程度の要約",
  "category": "update | tips | business | case_study",
  "importance_score": 1,
  "importance_reason": "重要な理由（10〜15字）",
  "tags": ["タグ1", "タグ2"],
  "audience": "engineer | backoffice | executive",
  "difficulty": 1
}
```

従来どおり **1 記事 1 コール**（D-006）。フィールド追加による追加コストは出力トークン数十のみ。

### 4.2 分類軸の設計

複合ラベル（「エンジニア初級向け」等）を単一 enum にせず、**category × audience × difficulty の直交 3 軸**に分解する。チェックボックス（§7.2）は全てこの 3 軸 + product のフィルタ条件の組み合わせで表現する。

### 4.3 difficulty の判定基準（プロンプトに明記すること）

| 値 | 基準 |
|---|---|
| 1（初級） | インストール・初期設定・基本コマンド・「はじめてみた」系。前提知識なしで読める |
| 2（中級） | Skill / Subagent / Hooks / MCP 等の機能活用、ワークフロー改善。日常利用者向け |
| 3（上級） | 内部挙動の解析、リリースノートの読み解き、大規模運用・CI 組み込み、複数ツールの組み合わせ |

- 難易度判定は揺れやすい前提で、プロンプトに具体例を書き込み運用しながら育てる。
- 誤分類の許容方針: 初級ユーザーに上級記事が混ざるのは軽傷、逆は避ける（迷ったら低い方に倒す）。

### 4.4 category の追加定義

- `business`: AI 業界動向・企業の提携/調達・料金/市場ニュースなど、経営層の関心事。
- `case_study`: 企業・組織への AI 導入事例、業務適用レポート（バックオフィス/経営層向け）。

---

## 5. 収集仕様の変更（SPEC §3 差分）

### 5.1 新規ソース

全 URL は 2026-07-04 に実物確認済み（詳細は D-033）。

| ソース | product | 取得方法 | エンドポイント（確認済） | 備考 |
|---|---|---|---|---|
| GitHub Releases (openai/codex) | codex | Atom | `https://github.com/openai/codex/releases.atom` | ✅確認済。**alpha ビルド多数混入 → `-alpha`/`-beta`/`-rc` 除外フィルタ必須** |
| Qiita tag:codex | codex | API v2 | `query=tag:codex` | ✅確認済（slug `codex`・記事 908 件） |
| Zenn topics/codex | codex | RSS | `https://zenn.dev/topics/codex/feed` | ✅確認済 |
| はてブ検索「AI 導入」（導入事例系） | other | RSS | `https://b.hatena.ne.jp/q/AI%20%E5%B0%8E%E5%85%A5?mode=rss&sort=recent&target=title&users=1` | ✅確認済（40 件・当日分あり）。元記事直リンク + ブクマ数あり。**`target=title` と `users=1` の明示必須**（既定はタグ検索 + users=3）。D-034 |
| はてブ検索「生成AI ビジネス」（ビジネス系） | other | RSS | `https://b.hatena.ne.jp/q/%E7%94%9F%E6%88%90AI%20%E3%83%93%E3%82%B8%E3%83%8D%E3%82%B9?mode=rss&sort=recent&target=text&users=1` | ✅確認済（40 件・当日分あり）。同上。クエリ語は運用しながら調整可 |
| ITmedia AI+ | other | RSS | `https://rss.itmedia.co.jp/rss/2.0/aiplus.xml` | ✅確認済（20 件・全件 AI 関連）。**PR TIMES は却下**（全業種 firehose で絞り込み不能。D-033） |

> **Google News RSS は不採用（D-034）**: リンクがリダイレクト URL で横断重複排除が効かない・人気指標なし・description が薄い・新規アダプタ実装が必要、の 4 点をはてブ検索が全て解消するため置き換えた。

はてブの title/text 検索は検索マッチが緩く無関係記事が混ざりやすいため、**「広く取る × きつく濾す」をセット**とし、relevance.ts のキーワードフィルタ強化を前提条件とする。

### 5.2 クエリ別日次上限（SourceConfig）

上限管理の単位はアダプタではなく**取得クエリ**。設定は `sources/index.ts` の配列に持たせる。

```ts
interface SourceConfig {
  adapter: SourceAdapter;
  dailyLimit: number;                                // enrich に回す上限件数/日
  rank?: (a: RawArticle, b: RawArticle) => number;   // 未指定なら publishedAt 降順
}
```

| クエリ | 上限/日 | rank |
|---|---|---|
| GitHub Releases（claude-code / gemini-cli / codex） | 各 5 | 新着順 |
| 公式ブログ系（Google Dev / DeepMind / anthropic news） | 各 5 | 新着順 |
| Qiita ×3（ClaudeCode / Gemini / Codex） | 25 / 25 / 25 | **ストック数降順** |
| Zenn ×3（claudecode / gemini / codex） | 各 20 | 新着順 |
| はてブ検索「Claude Code」 | 15 | **ブクマ数降順** |
| はてブ検索 ×2（AI 導入 / 生成AI ビジネス） | 各 25 | **ブクマ数降順** |
| ITmedia AI+ | 15 | 新着順 |

**合計 約280 件/日**（500 RPD の約 56%）。

- rank 用に `RawArticle` へ `popularity?: number` を追加し、Qiita（`likes_count`/`stocks_count`）・はてブ（`hatena:bookmarkcount`）のアダプタのみ埋める。
- 上限は「保険が発動したときの質を上げる仕掛け」。平常時は上限に届かない想定。
- **クエリ別のカット件数を実行ログに出力**し、次にどのクエリを広げるかデータで判断できるようにする。

---

## 6. 保持・表示ウィンドウ（変更と維持）

- **物理削除は 30 日を維持**（7 日案は、フィードに残存する記事の削除→再収集→再 enrich ループ＝ゾンビ記事のリスクにより却下）。
- 表示は日数ウィンドウではなく**件数上限**で絞る:

| 画面 | 件数 |
|---|---|
| 今日の重要 TOP5 | 当日のみ 5 件（D-019 維持）。5 件未満なら少ないまま表示 |
| 各リスト画面 | **最新 20 件**（published_at 降順、`limit(20)`） |
| お気に入り | 全件（localStorage） |

- ページネーション・無限スクロールは付けない（「20 件で打ち切り」自体が引き算の実装）。件数は定数 1 箇所で調整可能にする。
- TOP5 の選定対象は**ユーザーがチェック中のカテゴリの記事のみ**に絞る（フロント側フィルタで実現、コストゼロ）。

---

## 7. フロントエンド仕様の変更（SPEC §7 差分）

### 7.1 画面のデータ駆動化（ScreenConfig）

5 画面のハードコードをやめ、「画面 = クエリ定義」としてデータ化する。ホーム画面のボタン配列は設定から動的生成（D-021 の構成は維持）。

```ts
interface ScreenConfig {
  id: string;
  label: string;
  icon: string;
  filter: {
    product?: Product;
    category?: Category;
    audience?: Audience;
    difficulty?: number;
    keywords?: string[];
  };
  sort: 'importance' | 'published_at';
}
```

### 7.2 設定画面のチェックボックス構成

チェック = ホーム画面にボタン表示。**TOP5 とお気に入りは固定枠**（チェック対象外・常時表示）。自由選択枠は**最大 4 つまで**（選びすぎ = 足し算への回帰を防ぐ）。

| グループ | 項目（product 別） | フィルタ条件 |
|---|---|---|
| エンジニア（初級） | Claude Code / Gemini / Codex | `audience=engineer, difficulty=1, category=tips, product=*` |
| エンジニア（中級） | Claude Code / Gemini / Codex | `audience=engineer, difficulty=2, category=tips, product=*` |
| エンジニア（上級） | Claude Code / Gemini / Codex | `audience=engineer, difficulty=3, category=tips, product=*` |
| アップデート | Claude Code / Gemini / Codex | `category=update, product=*` |
| バックオフィス | — | `audience=backoffice`（tips / case_study） |
| 経営者向け | — | `audience=executive`（business / case_study） |

### 7.3 初回属性選択ポップアップ

- 初回訪問判定は localStorage のフラグ。ホーム画面表示前にポップアップを出す。
- 属性 = **チェックのプリセット**（例:「エンジニア(初級)」を選ぶと difficulty=1 系にチェックが入った状態で開始）。
- 設定画面でいつでも組み替え可能。属性の再選択も設定画面から可能にする。

### 7.4 お気に入りの localStorage 化

- 複数人お試し利用のため、`articles.is_favorite`（全員共有のグローバル値）は使用をやめる。
- **★ 押下時に記事オブジェクト全体（title / summary_ja / url / source / published_at / score / reason / tags…）を localStorage にスナップショット保存**。お気に入り画面は localStorage から描画。
- これにより DB 側で記事が 30 日で物理削除されても、お気に入りの「永久保有」（D-012 の意図）はクライアント側で維持される。
- 容量: 1 件 約1KB × 5MB 上限 → 数千件まで問題なし。
- 制約（許容済み）: 端末をまたげない。将来の本格複数人対応時に Supabase 匿名認証 + `favorites` テーブルへ移行する。

### 7.5 ホーム吹き出し

- `daily_summaries` の当日行を fetch して表示（日付 + 要約のみ）。
- 当日行が無い場合のフォールバック文言を用意（例「今日はまだ情報を集めてるよ」）。

### 7.6 記事カード（表示要素の追加）

- 折りたたみ時: 重要度バッジに理由を併記（例「重要度 9 ｜ 破壊的変更」）+ タグチップ 1 行。
- 空状態: 「空 = バグではなく今日は静かだった」と伝わる文言にする（`データなし画面.png` 準拠）。

---

## 8. Slack 通知（新規）

- **Slack アプリを新規作成**し、Incoming Webhooks を有効化して URL を発行（旧 Legacy Custom Integrations は使わない。無料プランで可）。
- `batch/src/notify.ts` を追加し、collect.yml の最終ステップで実行: 当日 TOP5 を Supabase から取得 → `daily_summaries.summary_ja` を冒頭文に → Block Kit 形式で Webhook に POST。
- LLM コールなし（既存の summary_ja を流用）。
- Secrets: `SLACK_WEBHOOK_URL` を追加。
- レート制限は 1 req/秒だが 1 日 1 投稿のため考慮不要。

---

## 9. 変更しない事項（確認）

- 物理削除 30 日 / 週次 cleanup（cleanup の条件から `is_favorite` 参照は削除し「30 日超は全削除」に単純化）
- 1 記事 1 LLM コール（D-006）
- URL 正規化 upsert による重複排除（D-007）
- ホーム + ボタン遷移の画面構成（D-021）
- TOP5 は当日のみ（D-019）
- モノレポ / GitHub Actions / Vercel / Supabase 構成

---

## 10. DECISIONS.md への反映（反映済み）

**2026-07-04 反映済み。** 本節の追記案は当初 D-022〜D-030 の番号で起案したが、DECISIONS.md に既存の D-022（Vitest 採用）/ D-023（TOP5 の 24 時間化）と衝突するため、**D-024〜D-032 に振り直して反映した**。以降は DECISIONS.md 側を正とする（本節の旧本文は重複回避のため削除）。

| 起案時 | 反映後 | 内容 |
|---|---|---|
| D-022 | **D-024** | LLM は Gemini 3.1 Flash-Lite 単独、設計値は枠の約 56% |
| D-023 | **D-025** | 分類軸を category × audience × difficulty の直交 3 軸に拡張 |
| D-024 | **D-026** | カード可読性向上は enrich 1 コールへのフィールド追加で実現 |
| D-025 | **D-027** | ScreenConfig によるデータ駆動 + 固定枠 2 + 自由枠最大 4 |
| D-026 | **D-028** | ユーザー設定・属性・お気に入りは localStorage 管理 |
| D-027 | **D-029** | 物理削除は 30 日を維持 |
| D-028 | **D-030** | 表示は件数上限（リスト 20 件） |
| D-029 | **D-031** | クエリ別日次上限 + rank による優先拾い |
| D-030 | **D-032** | ホーム吹き出しは daily_summaries で動的化 |

<details>
<summary>旧追記案（アーカイブ。内容は DECISIONS.md に反映済み）</summary>

### D-022. LLM は Gemini 3.1 Flash-Lite 単独、設計値は枠の約 56%
- **決定**: Gemini 3.1 Flash-Lite（15 RPM / 500 RPD）を使用。日次収集上限は合計約 280 件とし、約 4 割の余白を残す。
- **理由**: 2025-12 の無料枠削減により旧前提（Flash 250 + Flash-Lite 1,000）が無効化。余白は枠の再削減・リトライ・同日再実行（RPD リセットは JST 16 時）への保険。
- **却下案**: 枠の 9 割まで使う設計（上記 3 リスクのどれかで即詰まる）。

### D-023. 分類軸を category 単軸から「category × audience × difficulty」の直交 3 軸に拡張
- **決定**: LLM 出力に `audience`（engineer/backoffice/executive）と `difficulty`（1〜3）を追加。同一 1 コールに相乗りさせる。
- **理由**: 属性別の表示分けを追加コストゼロで実現するため。複合ラベルを単一 enum にすると属性追加時に組み合わせが爆発する。
- **却下案**: 複合 enum（組み合わせ爆発）。属性別に要約を作り分ける（1 記事 × 属性数のコールで枠が破綻）。

### D-024. カード可読性向上は enrich 1 コールへのフィールド追加で実現
- **決定**: `importance_reason`（重要な理由の短文）と `tags`（2〜3 個）を LLM 出力に追加し、カードに表示する。
- **理由**: 「重要度 7」だけでは何にとっての重要度か判断できない。既存コールへの相乗りで追加コストは実質ゼロ。
- **却下案**: 既存記事のバックフィル（不要。30 日ローテーションで自然に入れ替わる）。

### D-025. カスタム画面は ScreenConfig によるデータ駆動 + 固定枠 2 + 自由枠最大 4
- **決定**: 画面 = クエリ定義（ScreenConfig）としてデータ化し、設定画面のチェックボックスでホームのボタンを選択可能にする。TOP5 とお気に入りは固定枠、自由選択は最大 4 つ。
- **理由**: チェックの粒度を product × category × audience × difficulty に揃えると、属性プリセットも新プロダクト追加も設定の組み合わせで完結する。上限 4 は選びすぎ（足し算への回帰）の防止。
- **却下案**: 画面のハードコード継続（カスタム不可）。無制限チェック（引き算思想に反する）。

### D-026. ユーザー設定・属性・お気に入りは localStorage 管理
- **決定**: お試し段階の複数人利用では、設定/属性/お気に入りを localStorage に保存。お気に入りは★押下時に記事オブジェクト全体をスナップショット保存し、お気に入り画面は localStorage から描画する。
- **理由**: 認証（メール & パスワード）の手間を避けたい段階のため。`articles.is_favorite` は全員共有のグローバル値になり複数人では成立しない。スナップショット方式なら DB の物理削除と独立して「永久保有」を維持できる。
- **却下案**: is_favorite 継続（複数人で衝突）。Supabase 認証 + favorites テーブル（お試し段階では過剰。将来の本格対応時の移行先とする）。

### D-027. 物理削除は 30 日を維持（7 日案は却下）
- **決定**: 保持期間は 30 日のまま。cleanup の条件から is_favorite 参照を外し「30 日超は全削除」に単純化。
- **理由**: RSS/Atom フィードには数週間分の過去記事が残るため、7 日削除だと「削除 → 新規と誤判定 → 再収集・再 enrich」のゾンビループが発生する。
- **却下案**: 7 日削除 + fetch 時の日付フィルタ（30 日維持ならフィルタ自体が不要で、よりシンプル）。

### D-028. 表示は日数ウィンドウではなく件数上限（リスト 20 件）
- **決定**: 各リスト画面は published_at 降順の最新 20 件。ページネーションなし。TOP5 の選定対象はチェック中カテゴリの記事に絞る。
- **理由**: 「当日+前日」の日数方式は過疎カテゴリ（Codex・導入事例）で空画面が構造的に発生する。20 件は活況カテゴリで約 2 日分に相当し当初意図を保ちつつ、過疎カテゴリでは自動的に過去へ遡って埋まる。
- **却下案**: 当日+前日表示(空画面が発生)。無限スクロール（引き算思想に反する）。

### D-029. クエリ別日次上限 + ソース固有指標による優先拾い（rank）
- **決定**: enrich に回す件数をクエリ単位で制限（合計約 280/日）。上限超過時の選抜は、指標のあるソース（Qiita: ストック数、はてブ: ブクマ数）のみ人気降順、それ以外は新着順。カット件数を実行ログに出力する。
- **理由**: importance_score は enrich の出力のため選抜には使えない（順序が逆）。enrich 前に無料で得られる指標のみ活用。初回バックフィル対策もこの上限が兼ねる。
- **却下案**: 全件 enrich してスコアで選抜（本末転倒）。全ソース新着順のみ（指標があるソースで質を捨てることになる）。

### D-030. ホーム吹き出しは daily_summaries テーブルで動的化（全体共通 1 本）
- **決定**: 当日 TOP5 確定後に 1 コールで一言サマリーを生成し、`daily_summaries`（date, summary_ja, created_at）へ upsert。フロントは当日行を表示し、無ければフォールバック文言。Slack 通知の冒頭文にも流用。
- **理由**: 追加コールは 1 日 1 回のみで枠への影響が無視できる。属性別に作り分けると属性の組み合わせ分コールが増えるため、共通 1 本とする。
- **却下案**: ハードコード継続。属性別サマリー生成（コール数増・引き算思想にも反する）。

</details>
