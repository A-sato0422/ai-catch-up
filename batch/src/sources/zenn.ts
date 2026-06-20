import Parser from 'rss-parser';
import type { SourceAdapter, RawArticle, Product } from '../types.js';

const parser = new Parser();
const EXCERPT_MAX = 3000;

function makeZennAdapter(params: {
  id: string;
  topic: string;
  product: Product;
}): SourceAdapter {
  return {
    id: params.id,
    async fetch(): Promise<RawArticle[]> {
      const feed = await parser.parseURL(`https://zenn.dev/topics/${params.topic}/feed`);
      return feed.items.map(item => ({
        url: item.link ?? '',
        externalId: item.guid,
        source: params.id,
        product: params.product,
        title: item.title ?? '',
        excerpt: item.contentSnippet?.slice(0, EXCERPT_MAX),
        author: item.creator,
        publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      }));
    },
  };
}

export const zennClaudeCode = makeZennAdapter({
  id: 'zenn_claude_code',
  topic: 'claudecode',
  product: 'claude_code',
});

export const zennGemini = makeZennAdapter({
  id: 'zenn_gemini',
  topic: 'gemini',
  product: 'gemini',
});
