import Parser from 'rss-parser';
import type { SourceAdapter, RawArticle } from '../types.js';
import { isRelevantToGemini } from '../lib/relevance.js';

const parser = new Parser();
const EXCERPT_MAX = 3000;
const SOURCE_ID = 'deepmind_blog';

export const deepmindBlog: SourceAdapter = {
  id: SOURCE_ID,
  async fetch(): Promise<RawArticle[]> {
    const feed = await parser.parseURL('https://deepmind.google/blog/rss.xml');
    return feed.items
      .filter(item => isRelevantToGemini(`${item.title ?? ''} ${item.contentSnippet ?? ''}`))
      .map(item => ({
        url: item.link ?? '',
        externalId: item.guid,
        source: SOURCE_ID,
        product: 'gemini',
        title: item.title ?? '',
        excerpt: item.contentSnippet?.slice(0, EXCERPT_MAX),
        publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      }));
  },
};
