import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockParseURL } = vi.hoisted(() => ({ mockParseURL: vi.fn() }));
vi.mock('rss-parser', () => ({ default: class { parseURL = mockParseURL; } }));

import { hatenaClaudeCode, hatenaGemini } from './hatena.js';

const relatedItem = {
  title: 'Claude Code で開発が変わった',
  link: 'https://example.com/article',
  guid: 'https://example.com/article',
  isoDate: '2026-06-20T00:00:00Z',
  contentSnippet: 'Claude Code を使った開発事例',
};

const unrelatedItem = {
  title: 'Python のベストプラクティス',
  link: 'https://example.com/python',
  guid: 'https://example.com/python',
  isoDate: '2026-06-20T00:00:00Z',
  contentSnippet: 'Python に関する記事',
};

describe('hatenaClaudeCode', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('Claude Code に関連する記事だけを返す', async () => {
    mockParseURL.mockResolvedValue({ items: [relatedItem, unrelatedItem] });

    const articles = await hatenaClaudeCode.fetch();

    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe(relatedItem.title);
    expect(articles[0].product).toBe('claude_code');
    expect(articles[0].source).toBe('hatena_claude_code');
  });

  it('クエリをエンコードした URL で RSS を取得する', async () => {
    mockParseURL.mockResolvedValue({ items: [] });
    await hatenaClaudeCode.fetch();
    expect(mockParseURL).toHaveBeenCalledWith(
      'https://b.hatena.ne.jp/q/Claude%20Code?mode=rss&sort=recent'
    );
  });
});

describe('hatenaGemini', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('Gemini に関連しない記事を除外する', async () => {
    mockParseURL.mockResolvedValue({
      items: [
        { ...relatedItem, title: 'Gemini 2.5 を試した', contentSnippet: 'Gemini APIを使った' },
        unrelatedItem,
      ],
    });

    const articles = await hatenaGemini.fetch();
    expect(articles).toHaveLength(1);
    expect(articles[0].product).toBe('gemini');
  });
});
