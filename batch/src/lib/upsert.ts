import type { RawArticle, Enrichment } from '../types.js';
import { supabase } from './supabase.js';
import { normalizeUrl } from './normalizeUrl.js';

// RawArticle + Enrichment（省略可）+ llmProvider を合わせた upsert 入力型
export type ArticleInsert = RawArticle & Partial<Enrichment> & { llmProvider?: string };

export async function upsertArticle(article: ArticleInsert): Promise<void> {
  const url = normalizeUrl(article.url);

  const { error } = await supabase.from('articles').upsert(
    {
      url,
      source: article.source,
      external_id: article.externalId,
      product: article.product,
      title: article.title,
      excerpt: article.excerpt,
      author: article.author,
      published_at: article.publishedAt,
      summary_ja: article.summaryJa,
      category: article.category,
      importance_score: article.importanceScore,
      llm_provider: article.llmProvider,
    },
    // 既存 URL はスキップ（update しない）。CLAUDE.md §3.3
    { onConflict: 'url', ignoreDuplicates: true }
  );

  if (error) {
    throw new Error(`upsert failed for "${url}": ${error.message}`);
  }
}
