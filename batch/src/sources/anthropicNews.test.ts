import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockParseURL } = vi.hoisted(() => ({ mockParseURL: vi.fn() }));
vi.mock('rss-parser', () => ({ default: class { parseURL = mockParseURL; } }));

import { anthropicNews } from './anthropicNews.js';

describe('anthropicNews', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('RSS フィードを RawArticle に正しくマッピングする', async () => {
    mockParseURL.mockResolvedValue({
      items: [
        {
          title: 'Claude 4 発表',
          link: 'https://www.anthropic.com/news/claude-4',
          guid: 'https://www.anthropic.com/news/claude-4',
          isoDate: '2026-06-20T00:00:00Z',
          contentSnippet: 'Anthropic が Claude 4 を発表',
        },
      ],
    });

    const articles = await anthropicNews.fetch();

    expect(articles).toHaveLength(1);
    const [a] = articles;
    expect(a.url).toBe('https://www.anthropic.com/news/claude-4');
    expect(a.product).toBe('claude_code');
    expect(a.source).toBe('anthropic_news');
    expect(a.title).toBe('Claude 4 発表');
    expect(a.publishedAt).toBe('2026-06-20T00:00:00Z');
  });

  it('フィルタなしで全記事を返す（Anthropic の記事は全て関連）', async () => {
    mockParseURL.mockResolvedValue({
      items: [
        { title: '記事A', link: 'https://anthropic.com/a', guid: 'a', isoDate: '2026-06-20T00:00:00Z' },
        { title: '記事B', link: 'https://anthropic.com/b', guid: 'b', isoDate: '2026-06-19T00:00:00Z' },
      ],
    });

    expect(await anthropicNews.fetch()).toHaveLength(2);
  });
});
