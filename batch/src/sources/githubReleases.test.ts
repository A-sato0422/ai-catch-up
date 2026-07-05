import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockParseURL } = vi.hoisted(() => ({
  mockParseURL: vi.fn(),
}));

vi.mock('rss-parser', () => ({
  default: class {
    parseURL = mockParseURL;
  },
}));

import { githubReleasesClaudeCode, githubReleasesGeminiCli, githubReleasesCodex } from './githubReleases.js';

const mockItem = {
  title: 'v2.1.177',
  link: 'https://github.com/anthropics/claude-code/releases/tag/v2.1.177',
  guid: 'tag:github.com,2008:Repository/123/v2.1.177',
  isoDate: '2026-06-20T00:00:00Z',
  contentSnippet: 'Bug fixes and improvements.',
};

describe('githubReleasesClaudeCode', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('Atom フィードを RawArticle に正しくマッピングする', async () => {
    mockParseURL.mockResolvedValue({ items: [mockItem] });

    const articles = await githubReleasesClaudeCode.fetch();

    expect(articles).toHaveLength(1);
    const [a] = articles;
    expect(a.url).toBe(mockItem.link);
    expect(a.title).toBe(mockItem.title);
    expect(a.product).toBe('claude_code');
    expect(a.source).toBe('github_claude_code');
    expect(a.publishedAt).toBe(mockItem.isoDate);
    expect(a.externalId).toBe(mockItem.guid);
  });

  it('フィードが空のとき空配列を返す', async () => {
    mockParseURL.mockResolvedValue({ items: [] });
    expect(await githubReleasesClaudeCode.fetch()).toEqual([]);
  });
});

describe('githubReleasesGeminiCli', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('安定版リリースを通す', async () => {
    mockParseURL.mockResolvedValue({
      items: [{ ...mockItem, title: 'v1.0.0', link: 'https://github.com/google-gemini/gemini-cli/releases/tag/v1.0.0' }],
    });
    const articles = await githubReleasesGeminiCli.fetch();
    expect(articles).toHaveLength(1);
    expect(articles[0].product).toBe('gemini');
  });

  it('nightly ビルドを除外する', async () => {
    mockParseURL.mockResolvedValue({
      items: [
        { ...mockItem, title: 'nightly-20260620-120000' },
        { ...mockItem, title: 'v1.0.0-alpha.1' },
        { ...mockItem, title: 'v1.0.0-preview' },
        { ...mockItem, title: 'v1.0.0' },
      ],
    });
    const articles = await githubReleasesGeminiCli.fetch();
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('v1.0.0');
  });
});

describe('githubReleasesCodex', () => {
  beforeEach(() => mockParseURL.mockReset());

  it('安定版リリースを通し product が codex になる', async () => {
    mockParseURL.mockResolvedValue({
      items: [{ ...mockItem, title: 'rust-v0.5.0', link: 'https://github.com/openai/codex/releases/tag/rust-v0.5.0' }],
    });
    const articles = await githubReleasesCodex.fetch();
    expect(articles).toHaveLength(1);
    expect(articles[0].product).toBe('codex');
    expect(articles[0].source).toBe('github_codex');
  });

  it('openai/codex 特有の alpha ビルドタグ形式を除外する', async () => {
    mockParseURL.mockResolvedValue({
      items: [
        { ...mockItem, title: 'rust-v0.5.0-alpha.1' },
        { ...mockItem, title: 'rust-v0.5.0-alpha.12' },
        { ...mockItem, title: 'rust-v0.5.0-beta.1' },
        { ...mockItem, title: 'rust-v0.5.0-rc1' },
        { ...mockItem, title: 'rust-v0.5.0' },
      ],
    });
    const articles = await githubReleasesCodex.fetch();
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('rust-v0.5.0');
  });

  it('codex.atom URL を使う', async () => {
    mockParseURL.mockResolvedValue({ items: [] });
    await githubReleasesCodex.fetch();
    expect(mockParseURL).toHaveBeenCalledWith('https://github.com/openai/codex/releases.atom');
  });
});
