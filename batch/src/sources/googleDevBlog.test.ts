import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockParseURL } = vi.hoisted(() => ({ mockParseURL: vi.fn() }));
vi.mock('rss-parser', () => ({ default: class { parseURL = mockParseURL; } }));

import { googleDevBlog } from './googleDevBlog.js';

describe('googleDevBlog', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('Gemini 関連記事だけを返す', async () => {
    mockParseURL.mockResolvedValue({
      items: [
        { title: 'Gemini API の新機能', link: 'https://developers.googleblog.com/gemini-api', guid: 'g1', isoDate: '2026-06-20T00:00:00Z', contentSnippet: 'Gemini API アップデート' },
        { title: 'Android 開発のベストプラクティス', link: 'https://developers.googleblog.com/android', guid: 'g2', isoDate: '2026-06-20T00:00:00Z', contentSnippet: 'Android 向けガイド' },
      ],
    });

    const articles = await googleDevBlog.fetch();

    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('Gemini API の新機能');
    expect(articles[0].product).toBe('gemini');
    expect(articles[0].source).toBe('google_dev_blog');
  });

  it('全件が無関係なときは空配列を返す', async () => {
    mockParseURL.mockResolvedValue({
      items: [
        { title: 'Flutter 最新情報', link: 'https://developers.googleblog.com/flutter', guid: 'g3', isoDate: '2026-06-20T00:00:00Z', contentSnippet: 'Flutter の話' },
      ],
    });

    expect(await googleDevBlog.fetch()).toEqual([]);
  });
});
