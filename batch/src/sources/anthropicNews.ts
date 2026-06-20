import Parser from 'rss-parser';
import type { SourceAdapter, RawArticle } from '../types.js';

const parser = new Parser();
const EXCERPT_MAX = 3000;
const SOURCE_ID = 'anthropic_news';

// 第三者フィード（SPEC §3 備考: 運営停止でも差し替え可能な実装にする）
// 差し替え時はこの定数を変更するだけでよい
const FEED_URL = 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml';

export const anthropicNews: SourceAdapter = {
  id: SOURCE_ID,
  async fetch(): Promise<RawArticle[]> {
    const feed = await parser.parseURL(FEED_URL);
    return feed.items.map(item => ({
      url: item.link ?? '',
      externalId: item.guid,
      source: SOURCE_ID,
      product: 'claude_code',
      title: item.title ?? '',
      excerpt: item.contentSnippet?.slice(0, EXCERPT_MAX),
      publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
    }));
  },
};
