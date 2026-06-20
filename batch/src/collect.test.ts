import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RawArticle } from './types.js';

// --- モック定義（vi.hoisted で全変数を事前初期化）---
const { mockEnrich, mockUpsertArticle, mockDbIn, mockSource1, mockSource2 } = vi.hoisted(() => ({
  mockEnrich: vi.fn(),
  mockUpsertArticle: vi.fn(),
  mockDbIn: vi.fn(),
  mockSource1: { id: 'source1', fetch: vi.fn() },
  mockSource2: { id: 'source2', fetch: vi.fn() },
}));

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
  sources: [mockSource1, mockSource2],
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
    // デフォルト: DB に既存 URL なし
    mockDbIn.mockResolvedValue({ data: [], error: null });
    mockEnrich.mockResolvedValue(defaultEnrichment);
    mockUpsertArticle.mockResolvedValue(undefined);
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
});
