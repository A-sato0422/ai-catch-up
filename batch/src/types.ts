export type SourceId = string;
export type Product = 'claude_code' | 'gemini' | 'codex' | 'other';
export type Category = 'update' | 'tips' | 'business' | 'case_study';
export type Audience = 'engineer' | 'backoffice' | 'executive';

export interface RawArticle {
  url: string;
  externalId?: string;
  source: SourceId;
  product: Product;
  title: string;
  excerpt?: string;
  author?: string;
  publishedAt: string; // ISO 8601
  popularity?: number; // ソース固有の人気指標（Qiita ストック数 / はてブ ブクマ数）。rank 用（CLAUDE.md §3.1）
}

export interface Enrichment {
  summaryJa: string;
  category: Category;
  importanceScore: number; // 1〜10
  // 記事内容に基づく product 判定（D-037）。取得クエリ由来の product はタグ付け・検索ヒットが
  // 著者任せのため誤爆しうる（例: Claude 記事に Gemini タグ）。LLM が内容から判定した値を優先し、
  // 欠損・不正時は RawArticle.product（取得経路由来）にフォールバックする
  product?: Product;
  // 拡張フィールド（SPEC_EXPANSION §3.1 / §4.1）。LLM 出力で欠損しうる前提のため任意
  // かつ DB では null 許容（CLAUDE.md §4: 欠損時は null で保存し、既存記事のバックフィルはしない）
  importanceReason?: string; // 重要な理由の短文（10〜15 字。例「破壊的変更」）
  tags?: string[]; // トピックタグ 2〜3 個
  audience?: Audience;
  difficulty?: number; // 1〜3（初級/中級/上級）。迷ったら低い方に倒す
}

export interface SourceAdapter {
  id: SourceId;
  fetch(): Promise<RawArticle[]>;
}

export interface LLMProvider {
  enrich(article: RawArticle): Promise<Enrichment>;
}

// クエリ単位の収集設定（CLAUDE.md §3.1 / SPEC_EXPANSION §5.2）。
// 上限管理の単位はアダプタではなく「取得クエリ」のため、1 アダプタが複数クエリを持つ場合は
// 呼び出し側で SourceConfig を複数用意する想定（例: Qiita の product 別クエリ）。
export interface SourceConfig {
  adapter: SourceAdapter;
  dailyLimit: number; // enrich に回す上限件数/日
  rank?: (a: RawArticle, b: RawArticle) => number; // 上限超過時の選抜順。未指定なら publishedAt 降順
}
