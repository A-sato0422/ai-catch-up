import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockParseURL } = vi.hoisted(() => ({ mockParseURL: vi.fn() }));
vi.mock('rss-parser', () => ({ default: class { parseURL = mockParseURL; } }));

import { hatenaClaudeCode, hatenaGemini, hatenaAiAdoption, hatenaAiBusiness } from './hatena.js';

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

describe('hatenaAiAdoption', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('AI 導入に関連する記事だけを返し product は other になる', async () => {
    mockParseURL.mockResolvedValue({
      items: [
        { ...relatedItem, title: 'AI導入で採用面接を効率化した事例', contentSnippet: '生成AIを使った業務改善' },
        unrelatedItem,
      ],
    });

    const articles = await hatenaAiAdoption.fetch();
    expect(articles).toHaveLength(1);
    expect(articles[0].product).toBe('other');
    expect(articles[0].source).toBe('hatena_ai_adoption');
  });

  it('target=title・users=1 を明示した URL で RSS を取得する', async () => {
    mockParseURL.mockResolvedValue({ items: [] });
    await hatenaAiAdoption.fetch();
    expect(mockParseURL).toHaveBeenCalledWith(
      'https://b.hatena.ne.jp/q/AI%20%E5%B0%8E%E5%85%A5?mode=rss&sort=recent&target=title&users=1'
    );
  });
});

describe('hatenaAiBusiness', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('生成AI ビジネスに関連する記事だけを返し product は other になる', async () => {
    mockParseURL.mockResolvedValue({
      items: [
        { ...relatedItem, title: '生成AIスタートアップが大型資金調達', contentSnippet: 'ビジネス動向の解説' },
        unrelatedItem,
      ],
    });

    const articles = await hatenaAiBusiness.fetch();
    expect(articles).toHaveLength(1);
    expect(articles[0].product).toBe('other');
    expect(articles[0].source).toBe('hatena_ai_business');
  });

  it('target=text・users=1 を明示した URL で RSS を取得する', async () => {
    mockParseURL.mockResolvedValue({ items: [] });
    await hatenaAiBusiness.fetch();
    expect(mockParseURL).toHaveBeenCalledWith(
      'https://b.hatena.ne.jp/q/%E7%94%9F%E6%88%90AI%20%E3%83%93%E3%82%B8%E3%83%8D%E3%82%B9?mode=rss&sort=recent&target=text&users=1'
    );
  });
});

describe('既存クエリの URL・挙動が変わらないこと（回帰確認）', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('hatenaClaudeCode / hatenaGemini は target・users を付与しない従来 URL のまま', async () => {
    mockParseURL.mockResolvedValue({ items: [] });
    await hatenaClaudeCode.fetch();
    expect(mockParseURL).toHaveBeenCalledWith('https://b.hatena.ne.jp/q/Claude%20Code?mode=rss&sort=recent');

    mockParseURL.mockResolvedValue({ items: [] });
    await hatenaGemini.fetch();
    expect(mockParseURL).toHaveBeenCalledWith('https://b.hatena.ne.jp/q/Gemini?mode=rss&sort=recent');
  });
});

describe('popularity（hatena:bookmarkcount）のマッピング', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('bookmarkCount（文字列）を数値の popularity に変換する', async () => {
    // rss-parser の customFields はテキストノードを文字列で返すことが多い
    mockParseURL.mockResolvedValue({
      items: [{ ...relatedItem, bookmarkCount: '15' }],
    });

    const articles = await hatenaClaudeCode.fetch();
    expect(articles[0].popularity).toBe(15);
  });

  it('bookmarkCount が数値で返っても popularity に変換する', async () => {
    mockParseURL.mockResolvedValue({
      items: [{ ...relatedItem, bookmarkCount: 7 }],
    });

    const articles = await hatenaClaudeCode.fetch();
    expect(articles[0].popularity).toBe(7);
  });

  it('bookmarkCount が欠損・非数値の場合 popularity は undefined になる', async () => {
    mockParseURL.mockResolvedValue({
      items: [relatedItem, { ...relatedItem, guid: 'x', bookmarkCount: 'N/A' }],
    });

    const articles = await hatenaClaudeCode.fetch();
    expect(articles[0].popularity).toBeUndefined();
    expect(articles[1].popularity).toBeUndefined();
  });
});
