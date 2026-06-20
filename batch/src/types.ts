export type SourceId = string;
export type Product = 'claude_code' | 'gemini' | 'other';
export type Category = 'update' | 'tips';

export interface RawArticle {
  url: string;
  externalId?: string;
  source: SourceId;
  product: Product;
  title: string;
  excerpt?: string;
  author?: string;
  publishedAt: string; // ISO 8601
}

export interface Enrichment {
  summaryJa: string;
  category: Category;
  importanceScore: number; // 1〜10
}

export interface SourceAdapter {
  id: SourceId;
  fetch(): Promise<RawArticle[]>;
}

export interface LLMProvider {
  enrich(article: RawArticle): Promise<Enrichment>;
}
