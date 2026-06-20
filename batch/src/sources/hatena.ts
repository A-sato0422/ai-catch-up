import Parser from 'rss-parser';
import type { SourceAdapter, RawArticle, Product } from '../types.js';
import { isRelevantToClaudeCode, isRelevantToGemini } from '../lib/relevance.js';

const parser = new Parser();
const EXCERPT_MAX = 3000;

function makeHatenaAdapter(params: {
  id: string;
  query: string;
  product: Product;
  isRelevant: (text: string) => boolean;
}): SourceAdapter {
  return {
    id: params.id,
    async fetch(): Promise<RawArticle[]> {
      const url = `https://b.hatena.ne.jp/q/${encodeURIComponent(params.query)}?mode=rss&sort=recent`;
      const feed = await parser.parseURL(url);
      return feed.items
        .filter(item => params.isRelevant(`${item.title ?? ''} ${item.contentSnippet ?? ''}`))
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

export const hatenaClaudeCode = makeHatenaAdapter({
  id: 'hatena_claude_code',
  query: 'Claude Code',
  product: 'claude_code',
  isRelevant: isRelevantToClaudeCode,
});

export const hatenaGemini = makeHatenaAdapter({
  id: 'hatena_gemini',
  query: 'Gemini',
  product: 'gemini',
  isRelevant: isRelevantToGemini,
});
