import Parser from 'rss-parser';
import type { SourceAdapter, RawArticle, Product } from '../types.js';

const parser = new Parser();
const EXCERPT_MAX = 3000;

// gemini-cli / openai-codex は nightly/alpha/beta/preview/rc ビルドが多数混入するため
// 安定版のみ通す（SPEC §3 備考 / SPEC_EXPANSION §5.1）。
// openai/codex のタグは `rust-vX.Y.Z-alpha.N` 形式で alpha が多数流れるため、この判定を再利用する。
export function isStableRelease(title: string): boolean {
  return !/nightly|alpha|beta|preview|rc\d*|\.dev\./i.test(title);
}

function makeGithubReleasesAdapter(params: {
  id: string;
  url: string;
  product: Product;
  filterTitle?: (title: string) => boolean;
}): SourceAdapter {
  return {
    id: params.id,
    async fetch(): Promise<RawArticle[]> {
      const feed = await parser.parseURL(params.url);
      return feed.items
        .filter(item => !params.filterTitle || params.filterTitle(item.title ?? ''))
        .map(item => ({
          url: item.link ?? '',
          externalId: item.guid,
          source: params.id,
          product: params.product,
          title: item.title ?? '',
          excerpt: item.contentSnippet?.slice(0, EXCERPT_MAX),
          publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
        }));
    },
  };
}

export const githubReleasesClaudeCode = makeGithubReleasesAdapter({
  id: 'github_claude_code',
  url: 'https://github.com/anthropics/claude-code/releases.atom',
  product: 'claude_code',
});

export const githubReleasesGeminiCli = makeGithubReleasesAdapter({
  id: 'github_gemini_cli',
  url: 'https://github.com/google-gemini/gemini-cli/releases.atom',
  product: 'gemini',
  filterTitle: isStableRelease,
});

export const githubReleasesCodex = makeGithubReleasesAdapter({
  id: 'github_codex',
  url: 'https://github.com/openai/codex/releases.atom',
  product: 'codex',
  filterTitle: isStableRelease,
});
