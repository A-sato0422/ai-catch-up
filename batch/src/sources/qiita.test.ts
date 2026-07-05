import { describe, it, expect, vi, beforeEach } from 'vitest';

import { qiitaClaudeCode, qiitaGemini, qiitaCodex } from './qiita.js';

const mockItem = {
  id: 'abc123',
  url: 'https://qiita.com/user/items/abc123',
  title: 'Claude Code でコードレビューを自動化した',
  body: '本文テキスト'.repeat(100),
  created_at: '2026-06-20T00:00:00+09:00',
  user: { id: 'testuser' },
  stocks_count: 42,
};

describe('qiitaClaudeCode', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('Qiita API レスポンスを RawArticle に正しくマッピングする', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [mockItem],
    } as Response);

    const articles = await qiitaClaudeCode.fetch();

    expect(articles).toHaveLength(1);
    const [a] = articles;
    expect(a.url).toBe(mockItem.url);
    expect(a.externalId).toBe(mockItem.id);
    expect(a.product).toBe('claude_code');
    expect(a.source).toBe('qiita_claude_code');
    expect(a.author).toBe('testuser');
    expect(a.publishedAt).toBe(mockItem.created_at);
    // excerpt は 3000 文字以下に打ち切られる
    expect(a.excerpt?.length).toBeLessThanOrEqual(3000);
    // stocks_count が popularity にマッピングされる（rank 用。SPEC_EXPANSION §5.2）
    expect(a.popularity).toBe(42);
  });

  it('stocks_count が欠損している場合 popularity は undefined になる', async () => {
    const { stocks_count, ...itemWithoutStocks } = mockItem;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [itemWithoutStocks],
    } as Response);

    const articles = await qiitaClaudeCode.fetch();
    expect(articles[0].popularity).toBeUndefined();
  });

  it('QIITA_TOKEN がある場合 Authorization ヘッダを付与する', async () => {
    process.env.QIITA_TOKEN = 'test-token';
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    await qiitaClaudeCode.fetch();

    const [, options] = mockFetch.mock.calls[0];
    expect((options as RequestInit).headers).toMatchObject({ Authorization: 'Bearer test-token' });
    delete process.env.QIITA_TOKEN;
  });

  it('API がエラーを返したとき Error をスローする', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    } as Response);

    await expect(qiitaClaudeCode.fetch()).rejects.toThrow('429');
  });
});

describe('qiitaGemini', () => {
  it('product が gemini に設定される', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ ...mockItem, url: 'https://qiita.com/user/items/gem1' }],
    } as Response);

    const articles = await qiitaGemini.fetch();
    expect(articles[0].product).toBe('gemini');
    expect(articles[0].source).toBe('qiita_gemini');
  });
});

describe('qiitaCodex', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('product が codex に設定され tag:codex クエリを使う', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ ...mockItem, url: 'https://qiita.com/user/items/codex1' }],
    } as Response);

    const articles = await qiitaCodex.fetch();
    expect(articles[0].product).toBe('codex');
    expect(articles[0].source).toBe('qiita_codex');
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('query=tag:codex');
  });
});
