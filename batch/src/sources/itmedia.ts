import Parser from 'rss-parser';
import type { SourceAdapter, RawArticle } from '../types.js';
import { isRelevantToAI } from '../lib/relevance.js';

const parser = new Parser();
const EXCERPT_MAX = 3000;
const SOURCE_ID = 'itmedia_ai_plus';

// ITmedia AI+ は「全件 AI 関連」と SPEC_EXPANSION §5.1 に明記済みのフィード。
// フィルタは誤って無関係な記事が紛れた場合の保険として、広めの AI 関連キーワード判定を適用する。
export const itmediaAiPlus: SourceAdapter = {
  id: SOURCE_ID,
  async fetch(): Promise<RawArticle[]> {
    const feed = await parser.parseURL('https://rss.itmedia.co.jp/rss/2.0/aiplus.xml');
    return feed.items
      .filter(item => isRelevantToAI(`${item.title ?? ''} ${item.contentSnippet ?? ''}`))
      .map(item => ({
        url: item.link ?? '',
        externalId: item.guid,
        source: SOURCE_ID,
        product: 'other',
        title: item.title ?? '',
        excerpt: item.contentSnippet?.slice(0, EXCERPT_MAX),
        publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      }));
  },
};
