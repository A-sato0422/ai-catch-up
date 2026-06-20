import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUpsert, mockFrom } = vi.hoisted(() => {
  const mockUpsert = vi.fn();
  const mockFrom = vi.fn(() => ({ upsert: mockUpsert }));
  return { mockUpsert, mockFrom };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

import { upsertArticle } from './upsert.js';
import type { ArticleInsert } from './upsert.js';

const baseArticle: ArticleInsert = {
  url: 'https://zenn.dev/articles/abc?utm_source=twitter',
  source: 'zenn',
  product: 'claude_code',
  title: 'テスト記事',
  publishedAt: '2026-06-20T00:00:00Z',
};

describe('upsertArticle', () => {
  beforeEach(() => {
    mockUpsert.mockReset();
    mockFrom.mockClear();
  });

  it('URL を正規化して articles テーブルに upsert する', async () => {
    mockUpsert.mockResolvedValue({ error: null });

    await upsertArticle(baseArticle);

    expect(mockFrom).toHaveBeenCalledWith('articles');
    const [data, options] = mockUpsert.mock.calls[0];
    expect(data.url).toBe('https://zenn.dev/articles/abc'); // utm パラメータが除去される
    expect(options).toMatchObject({ onConflict: 'url', ignoreDuplicates: true });
  });

  it('Enrichment フィールドを正しいカラム名にマッピングする', async () => {
    mockUpsert.mockResolvedValue({ error: null });

    await upsertArticle({
      ...baseArticle,
      summaryJa: '日本語要約',
      category: 'update',
      importanceScore: 8,
      llmProvider: 'gemini',
      externalId: 'ext-123',
    });

    const [data] = mockUpsert.mock.calls[0];
    expect(data.summary_ja).toBe('日本語要約');
    expect(data.category).toBe('update');
    expect(data.importance_score).toBe(8);
    expect(data.llm_provider).toBe('gemini');
    expect(data.external_id).toBe('ext-123');
  });

  it('Supabase がエラーを返したとき Error をスローする', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'connection refused' } });

    await expect(upsertArticle(baseArticle)).rejects.toThrow('connection refused');
  });
});
