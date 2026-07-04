import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Article, Screen, SourceType } from '../types';

// DB の source 文字列を UI の SourceType に変換する
// source は 'github_claude_code' | 'qiita_gemini' | 'deepmind_blog' | ... のような形式
function toSourceType(source: string): SourceType {
  if (source.startsWith('github')) return 'github';
  if (source.startsWith('qiita')) return 'qiita';
  if (source.startsWith('zenn')) return 'zenn';
  if (source.startsWith('hatena')) return 'hatena';
  // google_dev_blog / deepmind_blog / anthropic_news はすべて 'google' 扱い
  return 'google';
}

// published_at (ISO 8601) を 'YYYY/MM/DD' 形式に変換する
function formatDate(publishedAt: string): string {
  const d = new Date(publishedAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

// DB 行を Article 型にマッピングする
function rowToArticle(row: Record<string, unknown>): Article {
  const source = typeof row.source === 'string' ? row.source : '';
  const summaryJa = typeof row.summary_ja === 'string' ? row.summary_ja : '';
  const excerpt = typeof row.excerpt === 'string' ? row.excerpt : '';
  const product = typeof row.product === 'string' ? row.product : '';
  const category = typeof row.category === 'string' ? row.category : '';

  return {
    id: typeof row.id === 'string' ? row.id : '',
    url: typeof row.url === 'string' ? row.url : '',
    titleA: typeof row.title === 'string' ? row.title : '',
    src: toSourceType(source),
    date: typeof row.published_at === 'string' ? formatDate(row.published_at) : '',
    imp: typeof row.importance_score === 'number' ? row.importance_score : 0,
    // summary_ja があればそれを使い、なければ excerpt にフォールバック
    full: summaryJa || excerpt,
    claude: product === 'claude_code',
    tag: category || undefined,
    isFavDb: row.is_favorite === true,
  };
}

export interface UseArticlesResult {
  articles: Article[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useArticles(screen: Screen): UseArticlesResult {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('articles').select(
        'id, url, source, product, title, excerpt, summary_ja, category, importance_score, author, published_at, is_favorite'
      );

      switch (screen) {
        case 'top5': {
          // 直近24時間に公開された記事を重要度降順で最大5件取得
          // バッチは1日1回のみ実行のため、暦日境界だと実行タイミング次第で新着が
          // 「前日扱い」になり永久に表示されなくなる（D-023）。実行タイミング非依存にするため
          // 暦日ではなくローリングウィンドウで判定する。
          const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          query = query
            .gte('published_at', windowStart)
            .order('importance_score', { ascending: false })
            .limit(5);
          break;
        }
        case 'update':
          query = query
            .eq('category', 'update')
            .order('published_at', { ascending: false })
            .limit(30);
          break;
        case 'tips':
          query = query
            .eq('category', 'tips')
            .eq('product', 'claude_code')
            .order('published_at', { ascending: false })
            .limit(30);
          break;
        case 'tipsGemini':
          query = query
            .eq('category', 'tips')
            .eq('product', 'gemini')
            .order('published_at', { ascending: false })
            .limit(30);
          break;
        case 'fav':
          query = query
            .eq('is_favorite', true)
            .order('published_at', { ascending: false })
            .limit(50);
          break;
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      const mapped = (data ?? []).map(row => rowToArticle(row as Record<string, unknown>));
      setArticles(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(message);
      console.error('[useArticles] fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [screen]);

  useEffect(() => {
    void fetchArticles();
  }, [fetchArticles]);

  return { articles, loading, error, refetch: fetchArticles };
}
