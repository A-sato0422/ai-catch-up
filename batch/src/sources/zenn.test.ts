import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockParseURL } = vi.hoisted(() => ({ mockParseURL: vi.fn() }));
vi.mock('rss-parser', () => ({ default: class { parseURL = mockParseURL; } }));

import { zennClaudeCode, zennGemini, zennCodex } from './zenn.js';

const mockItem = {
  title: 'Claude Code で CI を自動化した',
  link: 'https://zenn.dev/user/articles/abc',
  guid: 'https://zenn.dev/user/articles/abc',
  isoDate: '2026-06-20T00:00:00Z',
  contentSnippet: '記事の本文要約',
  creator: 'zennuser',
};

describe('zennClaudeCode', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('RSS フィードを RawArticle に正しくマッピングする', async () => {
    mockParseURL.mockResolvedValue({ items: [mockItem] });

    const articles = await zennClaudeCode.fetch();

    expect(articles).toHaveLength(1);
    const [a] = articles;
    expect(a.url).toBe(mockItem.link);
    expect(a.product).toBe('claude_code');
    expect(a.source).toBe('zenn_claude_code');
    expect(a.author).toBe(mockItem.creator);
    expect(a.publishedAt).toBe(mockItem.isoDate);
  });

  it('claudecode トピック URL を使う', async () => {
    mockParseURL.mockResolvedValue({ items: [] });
    await zennClaudeCode.fetch();
    expect(mockParseURL).toHaveBeenCalledWith('https://zenn.dev/topics/claudecode/feed');
  });
});

describe('zennGemini', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('gemini トピック URL を使い product が gemini になる', async () => {
    mockParseURL.mockResolvedValue({ items: [mockItem] });

    const articles = await zennGemini.fetch();
    expect(articles[0].product).toBe('gemini');
    expect(mockParseURL).toHaveBeenCalledWith('https://zenn.dev/topics/gemini/feed');
  });
});

describe('zennCodex', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('codex トピック URL を使い product が codex になる', async () => {
    mockParseURL.mockResolvedValue({ items: [mockItem] });

    const articles = await zennCodex.fetch();
    expect(articles[0].product).toBe('codex');
    expect(articles[0].source).toBe('zenn_codex');
    expect(mockParseURL).toHaveBeenCalledWith('https://zenn.dev/topics/codex/feed');
  });
});
