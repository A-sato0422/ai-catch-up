import Parser from 'rss-parser';
import type { SourceAdapter, RawArticle } from '../types.js';
import { isRelevantToGemini } from '../lib/relevance.js';

const parser = new Parser();
const EXCERPT_MAX = 3000;
const SOURCE_ID = 'google_dev_blog';

// URL は SPEC §3 で「候補・未確定」。実装時に実物確認推奨
const FEED_URL = 'https://developers.googleblog.com/feeds/posts/default';

export const googleDevBlog: SourceAdapter = {
  id: SOURCE_ID,
  async fetch(): Promise<RawArticle[]> {
    const feed = await parser.parseURL(FEED_URL);
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
