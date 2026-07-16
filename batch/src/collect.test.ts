import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RawArticle } from './types.js';

type MockRank = (a: RawArticle, b: RawArticle) => number;

// --- モック定義（vi.hoisted で全変数を事前初期化）---
// dailyLimit はテストのデフォルトでは十分大きい値（100）にし、既存の「カットされない」前提のテストが
// そのまま通るようにする。実際にカットするケースは専用のテストケースで dailyLimit を上書きする。
const {
  mockEnrich,
  mockUpsertArticle,
  mockDbIn,
  mockSelectTopTopics,
  mockSaveTopTopics,
  mockSource1,
  mockSource2,
  sourceConfigs,
} = vi.hoisted(() => {
  const mockSource1 = { id: 'source1', fetch: vi.fn() };
  const mockSource2 = { id: 'source2', fetch: vi.fn() };
  return {
    mockEnrich: vi.fn(),
    mockUpsertArticle: vi.fn(),
    mockDbIn: vi.fn(),
    mockSelectTopTopics: vi.fn(),
    mockSaveTopTopics: vi.fn(),
    mockSource1,
    mockSource2,
    sourceConfigs: [
      { adapter: mockSource1, dailyLimit: 100, rank: undefined as MockRank | undefined },
      { adapter: mockSource2, dailyLimit: 100, rank: undefined as MockRank | undefined },
    ],
  };
});

vi.mock('./llm/index.js', () => ({
  createLLMProvider: () => ({ enrich: mockEnrich }),
}));

vi.mock('./lib/upsert.js', () => ({
  upsertArticle: mockUpsertArticle,
}));

vi.mock('./lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ in: mockDbIn })),
    })),
  },
}));

vi.mock('./sources/index.js', () => ({
  sourceConfigs,
}));

// 重要トピックのスナップショット（D-038）は supabase クエリの形状に依存させず関数ごとモックする
vi.mock('./lib/topTopics.js', () => ({
  selectTopTopics: mockSelectTopTopics,
  saveTopTopics: mockSaveTopTopics,
}));

import { collect } from './collect.js';

// --- テストデータ ---
const makeArticle = (url: string, daysAgo = 0): RawArticle => ({
  url,
  source: 'source1',
  product: 'claude_code',
  title: `記事: ${url}`,
  publishedAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
});

const defaultEnrichment = { summaryJa: '要約', category: 'tips' as const, importanceScore: 5 };

// --- テスト ---
describe('collect', () => {
  beforeEach(() => {
    mockSource1.fetch.mockReset();
    mockSource2.fetch.mockReset();
    mockEnrich.mockReset();
    mockUpsertArticle.mockReset();
    mockDbIn.mockReset();
    mockSelectTopTopics.mockReset();
    mockSaveTopTopics.mockReset();
    // デフォルト: DB に既存 URL なし
    mockDbIn.mockResolvedValue({ data: [], error: null });
    mockEnrich.mockResolvedValue(defaultEnrichment);
    mockUpsertArticle.mockResolvedValue(undefined);
    // デフォルト: スナップショット対象トピックなし・保存成功
    mockSelectTopTopics.mockResolvedValue([]);
    mockSaveTopTopics.mockResolvedValue(undefined);
    // sourceConfigs は共有オブジェクトのため、dailyLimit/rank を上書きしたテスト後に元へ戻す
    sourceConfigs[0].dailyLimit = 100;
    sourceConfigs[1].dailyLimit = 100;
    sourceConfigs[0].rank = undefined;
    sourceConfigs[1].rank = undefined;
  });

  it('全ソースから記事を収集して enrich + upsert する', async () => {
    mockSource1.fetch.mockResolvedValue([makeArticle('https://example.com/a')]);
    mockSource2.fetch.mockResolvedValue([makeArticle('https://example.com/b')]);

    await collect();

    expect(mockEnrich).toHaveBeenCalledTimes(2);
    expect(mockUpsertArticle).toHaveBeenCalledTimes(2);
  });

  it('1 ソースが失敗しても他のソースの処理を続ける（fail-soft）', async () => {
    mockSource1.fetch.mockRejectedValue(new Error('network error'));
    mockSource2.fetch.mockResolvedValue([makeArticle('https://example.com/b')]);

    await collect();

    // source2 の記事は処理される
    expect(mockEnrich).toHaveBeenCalledTimes(1);
    expect(mockUpsertArticle).toHaveBeenCalledTimes(1);
  });

  it('DB に既存の URL がある記事は enrich をスキップする', async () => {
    mockSource1.fetch.mockResolvedValue([
      makeArticle('https://example.com/existing'),
      makeArticle('https://example.com/new'),
    ]);
    mockSource2.fetch.mockResolvedValue([]);
    mockDbIn.mockResolvedValue({
      data: [{ url: 'https://example.com/existing' }],
      error: null,
    });

    await collect();

    expect(mockEnrich).toHaveBeenCalledTimes(1);
    const [[calledArticle]] = mockEnrich.mock.calls;
    expect(calledArticle.url).toBe('https://example.com/new');
  });

  it('バッチ内で同一 URL が重複している場合は 1 回だけ処理する', async () => {
    mockSource1.fetch.mockResolvedValue([makeArticle('https://example.com/dup')]);
    mockSource2.fetch.mockResolvedValue([makeArticle('https://example.com/dup')]);

    await collect();

    expect(mockEnrich).toHaveBeenCalledTimes(1);
  });

  it('backfillDays を指定すると古い記事を除外する', async () => {
    mockSource1.fetch.mockResolvedValue([
      makeArticle('https://example.com/recent', 1),   // 1 日前 → 含む
      makeArticle('https://example.com/old', 10),     // 10 日前 → 除外
    ]);
    mockSource2.fetch.mockResolvedValue([]);

    await collect(7); // 直近 7 日のみ

    expect(mockEnrich).toHaveBeenCalledTimes(1);
    const [[calledArticle]] = mockEnrich.mock.calls;
    expect(calledArticle.url).toBe('https://example.com/recent');
  });

  it('1 記事の enrich 失敗で残りの記事の処理を続ける（fail-soft）', async () => {
    mockSource1.fetch.mockResolvedValue([
      makeArticle('https://example.com/fail'),
      makeArticle('https://example.com/ok'),
    ]);
    mockSource2.fetch.mockResolvedValue([]);
    mockEnrich
      .mockRejectedValueOnce(new Error('LLM error'))
      .mockResolvedValueOnce(defaultEnrichment);

    await collect();

    expect(mockUpsertArticle).toHaveBeenCalledTimes(1);
  });

  it('LLM が判定した product が取得経路由来の値を上書きして upsert される', async () => {
    // zenn_gemini 経由（product: gemini）で取れた Claude 記事、という誤爆ケース
    mockSource1.fetch.mockResolvedValue([
      { ...makeArticle('https://example.com/claude-article'), product: 'gemini' },
    ]);
    mockSource2.fetch.mockResolvedValue([]);
    mockEnrich.mockResolvedValue({ ...defaultEnrichment, product: 'claude_code' as const });

    await collect();

    const [[upserted]] = mockUpsertArticle.mock.calls;
    expect(upserted.product).toBe('claude_code');
  });

  it('LLM の product が欠損（undefined）の場合は取得経路由来の product を維持する', async () => {
    mockSource1.fetch.mockResolvedValue([
      { ...makeArticle('https://example.com/no-product'), product: 'gemini' },
    ]);
    mockSource2.fetch.mockResolvedValue([]);
    // キー自体は存在して値が undefined、というスプレッド事故が起きやすい形で検証する
    mockEnrich.mockResolvedValue({ ...defaultEnrichment, product: undefined });

    await collect();

    const [[upserted]] = mockUpsertArticle.mock.calls;
    expect(upserted.product).toBe('gemini');
  });

  it('URL に utm パラメータが含まれている場合は正規化してから重複チェックする', async () => {
    mockSource1.fetch.mockResolvedValue([
      makeArticle('https://example.com/a?utm_source=feed'),
    ]);
    mockSource2.fetch.mockResolvedValue([]);
    mockDbIn.mockResolvedValue({
      data: [{ url: 'https://example.com/a' }], // 正規化済み URL が DB にある
      error: null,
    });

    await collect();

    // 正規化後に既存と判定されるので enrich されない
    expect(mockEnrich).not.toHaveBeenCalled();
  });

  it('dailyLimit を超えた分はカットされ enrich に回らない', async () => {
    sourceConfigs[0].dailyLimit = 3;
    mockSource1.fetch.mockResolvedValue([
      makeArticle('https://example.com/1', 5),
      makeArticle('https://example.com/2', 4),
      makeArticle('https://example.com/3', 3),
      makeArticle('https://example.com/4', 2),
      makeArticle('https://example.com/5', 1),
    ]);
    mockSource2.fetch.mockResolvedValue([]);

    // backfillDays を広めに取り、dailyLimit カットの効果だけを検証する
    await collect(30);

    // 5 件 fetch したが dailyLimit=3 のため 3 件だけ enrich される
    expect(mockEnrich).toHaveBeenCalledTimes(3);
  });

  it('rank 指定時は publishedAt ではなく rank の順序で上位 dailyLimit 件が優先される', async () => {
    sourceConfigs[0].dailyLimit = 2;
    // popularity 降順の rank を指定。publishedAt 的には最も古い記事が最優先されるべきケース
    sourceConfigs[0].rank = (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0);
    mockSource1.fetch.mockResolvedValue([
      { ...makeArticle('https://example.com/low', 1), popularity: 1 },
      { ...makeArticle('https://example.com/high', 10), popularity: 100 },
      { ...makeArticle('https://example.com/mid', 5), popularity: 50 },
    ]);
    mockSource2.fetch.mockResolvedValue([]);

    // backfillDays を広めに取り、rank によるカットの効果だけを検証する
    await collect(30);

    expect(mockEnrich).toHaveBeenCalledTimes(2);
    const calledUrls = mockEnrich.mock.calls.map(([article]) => article.url);
    // popularity 上位 2 件（high, mid）が選ばれ、最下位（low）はカットされる
    expect(calledUrls).toEqual(
      expect.arrayContaining(['https://example.com/high', 'https://example.com/mid'])
    );
    expect(calledUrls).not.toContain('https://example.com/low');
  });

  it('enrich 完了後に重要トピックを選定して daily_topics へ保存する（D-038）', async () => {
    const topics = [
      {
        articleId: 'a1111111-1111-1111-1111-111111111111',
        groupLabel: 'Claude Code',
        title: 'Claude Code 4.0 リリース',
        url: 'https://example.com/claude-code-4',
        summary_ja: '破壊的変更あり',
        importance_score: 9,
        importance_reason: '破壊的変更',
      },
    ];
    mockSource1.fetch.mockResolvedValue([makeArticle('https://example.com/a')]);
    mockSource2.fetch.mockResolvedValue([]);
    mockSelectTopTopics.mockResolvedValue(topics);

    await collect();

    // ウィンドウ起点は ISO 8601 で 1 回だけ渡され、選定結果が JST 日付とともに保存される
    expect(mockSelectTopTopics).toHaveBeenCalledTimes(1);
    const [windowStart] = mockSelectTopTopics.mock.calls[0];
    expect(windowStart).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(mockSaveTopTopics).toHaveBeenCalledTimes(1);
    const [date, savedTopics] = mockSaveTopTopics.mock.calls[0];
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(savedTopics).toEqual(topics);
  });

  it('スナップショット保存が失敗しても collect は例外を投げない（fail-soft）', async () => {
    mockSource1.fetch.mockResolvedValue([makeArticle('https://example.com/a')]);
    mockSource2.fetch.mockResolvedValue([]);
    mockSaveTopTopics.mockRejectedValue(new Error('db error'));

    await expect(collect()).resolves.not.toThrow();

    // 収集・enrich 自体は完了している
    expect(mockUpsertArticle).toHaveBeenCalledTimes(1);
  });

  it('トピック選定が失敗しても collect は例外を投げず保存も行わない（fail-soft）', async () => {
    mockSource1.fetch.mockResolvedValue([makeArticle('https://example.com/a')]);
    mockSource2.fetch.mockResolvedValue([]);
    mockSelectTopTopics.mockRejectedValue(new Error('db error'));

    await expect(collect()).resolves.not.toThrow();

    expect(mockSaveTopTopics).not.toHaveBeenCalled();
  });
});
