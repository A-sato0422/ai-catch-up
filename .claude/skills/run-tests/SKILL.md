---
name: run-tests
description: フロント（src/）と batch/ のユニットテストを Vitest で実行するスキル。Stop hook・subagent から機械的に呼び出されることを想定。
---

# run-tests スキル

フロント（リポジトリルート直下 `src/`）と `batch/` のユニットテストを一貫した手順で実行する。
人間からの依頼時も、Stop hook / subagent からの自動呼び出し時も、この手順をそのまま実行する。

## テストフレームワーク

**Vitest**（フロント・バッチ共通）

| スコープ | 環境 | 設定ファイル |
|---|---|---|
| フロント（`src/`） | `jsdom` | `vitest.config.ts`（ルート） |
| バッチ（`batch/src/`） | `node` | `batch/vitest.config.ts` |

---

## テスト実行コマンド

### フロント — リポジトリルートで実行

```bash
# 全テスト実行
npm run test

# 単一ファイル実行
npm run test -- src/lib/normalizeUrl.test.ts
```

### batch/ — 必ず `cd batch &&` で移動してから実行

```bash
# 全テスト実行
cd batch && npm run test

# 単一ファイル実行
cd batch && npm run test -- src/lib/normalizeUrl.test.ts
```

---

## モック必須の外部依存

外部依存は **テスト内で必ずモック化** し、実ネットワーク呼び出し（HTTP リクエスト）をテスト中に発生させてはならない。

| 依存 | モック手段 |
|---|---|
| Supabase クライアント | `vi.mock('@supabase/supabase-js')` でモジュールごとモック |
| Gemini API | `vi.mock('../llm/gemini')` 等、LLMProvider 実装ファイルをモック |
| RSS / Atom フェッチ | `vi.spyOn(globalThis, 'fetch').mockResolvedValue(...)` |
| Qiita API フェッチ | 同上 |
| rss-parser | `vi.mock('rss-parser')` |

---

## 成功判定

**両スコープ（フロント・batch）とも exit code `0` で終了すること。**

exit code が `0` 以外はテスト失敗とみなす。

---

## 実行手順（Stop hook / subagent 向け）

1. リポジトリルートで `npm run test` を実行し、exit code を記録する。
2. `cd batch && npm run test` を実行し、exit code を記録する。
3. 両方が exit code `0` → 「テスト成功」として完了報告する。
4. いずれかが `0` 以外 → 失敗したテストのエラーメッセージを報告し、修正後に再実行する。

---

## テストファイルの慣習

- ファイル名: `*.test.ts`（`*.spec.ts` も可）
- 配置: テスト対象ファイルと同ディレクトリ（`src/lib/foo.ts` → `src/lib/foo.test.ts`）
- `import` は `vitest` から明示的に行う（例: `import { describe, it, expect, vi } from 'vitest'`）
