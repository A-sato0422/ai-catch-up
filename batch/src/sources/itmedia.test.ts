import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockParseURL } = vi.hoisted(() => ({ mockParseURL: vi.fn() }));
vi.mock('rss-parser', () => ({ default: class { parseURL = mockParseURL; } }));

import { itmediaAiPlus } from './itmedia.js';

const aiItem = {
  title: '生成AIで業務効率化、A社が導入事例を公開',
  link: 'https://www.itmedia.co.jp/aiplus/articles/2607/05/news001.html',
  guid: 'https://www.itmedia.co.jp/aiplus/articles/2607/05/news001.html',
  isoDate: '2026-07-05T09:00:00+09:00',
  contentSnippet: 'AI活用による業務効率化の事例を紹介する。',
};

describe('itmediaAiPlus', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('RSS フィードを RawArticle に正しくマッピングする', async () => {
    mockParseURL.mockResolvedValue({ items: [aiItem] });

    const articles = await itmediaAiPlus.fetch();

    expect(articles).toHaveLength(1);
    const [a] = articles;
    expect(a.url).toBe(aiItem.link);
    expect(a.title).toBe(aiItem.title);
    expect(a.product).toBe('other');
    expect(a.source).toBe('itmedia_ai_plus');
    expect(a.publishedAt).toBe(aiItem.isoDate);
    expect(a.externalId).toBe(aiItem.guid);
  });

  it('aiplus.xml の URL を使う', async () => {
    mockParseURL.mockResolvedValue({ items: [] });
    await itmediaAiPlus.fetch();
    expect(mockParseURL).toHaveBeenCalledWith('https://rss.itmedia.co.jp/rss/2.0/aiplus.xml');
  });

  it('AI に無関係な記事は保険フィルタで除外する（通常は起こらない想定）', async () => {
    mockParseURL.mockResolvedValue({
      items: [
        aiItem,
        { title: '週末のグルメ特集', link: 'https://example.com/food', guid: 'food1', isoDate: '2026-07-05T09:00:00+09:00', contentSnippet: '美味しいラーメン屋を紹介' },
      ],
    });

    const articles = await itmediaAiPlus.fetch();
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe(aiItem.title);
  });

  it('フィードが空のとき空配列を返す', async () => {
    mockParseURL.mockResolvedValue({ items: [] });
    expect(await itmediaAiPlus.fetch()).toEqual([]);
  });
});
