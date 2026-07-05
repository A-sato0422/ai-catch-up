import Parser from 'rss-parser';
import type { SourceAdapter, RawArticle, Product } from '../types.js';
import { isRelevantToClaudeCode, isRelevantToGemini, isRelevantToAiAdoption, isRelevantToAiBusiness } from '../lib/relevance.js';

// はてなブックマークの独自 XML 要素（hatena:bookmarkcount）を item.bookmarkCount として取得する
interface HatenaItemFields {
  bookmarkCount?: string;
}

const parser = new Parser<Record<string, unknown>, HatenaItemFields>({
  customFields: { item: [['hatena:bookmarkcount', 'bookmarkCount']] },
});
const EXCERPT_MAX = 3000;

// bookmarkCount は文字列で返ることが多いため数値変換のガードを入れる（欠損・非数値は undefined）
function parseBookmarkCount(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function makeHatenaAdapter(params: {
  id: string;
  query: string;
  product: Product;
  isRelevant: (text: string) => boolean;
  // 既定（タグ検索 + users=3 相当）は「AI 導入」「生成AI ビジネス」のような一般語クエリではほぼヒットしないため、
  // 新規クエリでは target（title/text）と users（最小ブクマ数）の明示が必須（SPEC_EXPANSION §5.1 / D-034）。
  // 未指定時は既存の hatenaClaudeCode / hatenaGemini と挙動・URL を変えない。
  target?: 'title' | 'text';
  users?: number;
}): SourceAdapter {
  return {
    id: params.id,
    async fetch(): Promise<RawArticle[]> {
      let url = `https://b.hatena.ne.jp/q/${encodeURIComponent(params.query)}?mode=rss&sort=recent`;
      if (params.target !== undefined) url += `&target=${params.target}`;
      if (params.users !== undefined) url += `&users=${params.users}`;
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
          popularity: parseBookmarkCount(item.bookmarkCount),
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

// AI 導入事例系（SPEC_EXPANSION §5.1 / D-034）。target=title・users=1 の明示が必須。
export const hatenaAiAdoption = makeHatenaAdapter({
  id: 'hatena_ai_adoption',
  query: 'AI 導入',
  target: 'title',
  users: 1,
  product: 'other',
  isRelevant: isRelevantToAiAdoption,
});

// 生成AI ビジネス系（SPEC_EXPANSION §5.1 / D-034）。target=text・users=1 の明示が必須。
export const hatenaAiBusiness = makeHatenaAdapter({
  id: 'hatena_ai_business',
  query: '生成AI ビジネス',
  target: 'text',
  users: 1,
  product: 'other',
  isRelevant: isRelevantToAiBusiness,
});
