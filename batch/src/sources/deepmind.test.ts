import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockParseURL } = vi.hoisted(() => ({ mockParseURL: vi.fn() }));
vi.mock('rss-parser', () => ({ default: class { parseURL = mockParseURL; } }));

import { deepmindBlog } from './deepmind.js';

describe('deepmindBlog', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('Gemini 関連記事だけを返す', async () => {
    mockParseURL.mockResolvedValue({
      items: [
        { title: 'Gemini 2.5 Flash リリース', link: 'https://deepmind.google/blog/gemini', guid: 'g1', isoDate: '2026-06-20T00:00:00Z', contentSnippet: 'Gemini の新機能' },
        { title: 'AlphaFold の最新研究', link: 'https://deepmind.google/blog/alphafold', guid: 'g2', isoDate: '2026-06-20T00:00:00Z', contentSnippet: 'タンパク質構造予測' },
      ],
    });

    const articles = await deepmindBlog.fetch();

    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('Gemini 2.5 Flash リリース');
    expect(articles[0].product).toBe('gemini');
    expect(articles[0].source).toBe('deepmind_blog');
  });

  it('フィールドを正しくマッピングする', async () => {
    mockParseURL.mockResolvedValue({
      items: [{ title: 'Gemma 3 公開', link: 'https://deepmind.google/blog/gemma3', guid: 'g3', isoDate: '2026-06-20T00:00:00Z', contentSnippet: 'Gemma モデル' }],
    });

    const [a] = await deepmindBlog.fetch();
    expect(a.url).toBe('https://deepmind.google/blog/gemma3');
    expect(a.externalId).toBe('g3');
    expect(a.publishedAt).toBe('2026-06-20T00:00:00Z');
  });
});
