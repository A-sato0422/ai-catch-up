import type { SourceAdapter, RawArticle, Product } from '../types.js';

const QIITA_API = 'https://qiita.com/api/v2/items';
const PER_PAGE = 50;
const EXCERPT_MAX = 3000;

interface QiitaItem {
  id: string;
  url: string;
  title: string;
  body: string;
  created_at: string;
  user?: { id: string };
}

function makeQiitaAdapter(params: {
  id: string;
  tag: string;
  product: Product;
}): SourceAdapter {
  return {
    id: params.id,
    async fetch(): Promise<RawArticle[]> {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = process.env.QIITA_TOKEN;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = `${QIITA_API}?query=tag:${params.tag}&per_page=${PER_PAGE}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Qiita API error: ${res.status} ${res.statusText}`);

      const items = await res.json() as QiitaItem[];
      return items.map(item => ({
        url: item.url,
        externalId: item.id,
        source: params.id,
        product: params.product,
        title: item.title,
        excerpt: item.body?.slice(0, EXCERPT_MAX),
        author: item.user?.id,
        publishedAt: item.created_at,
      }));
    },
  };
}

export const qiitaClaudeCode = makeQiitaAdapter({
  id: 'qiita_claude_code',
  tag: 'ClaudeCode',
  product: 'claude_code',
});

export const qiitaGemini = makeQiitaAdapter({
  id: 'qiita_gemini',
  tag: 'Gemini',
  product: 'gemini',
});
