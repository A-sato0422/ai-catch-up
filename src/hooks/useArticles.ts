import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { loadButtonSelection } from '../lib/buttonSettings';
import { buildFreeScreens } from '../lib/screens';
import { matchesFilter } from '../lib/screenFilter';
import type { Article, ScreenConfig, SourceType } from '../types';

const TOP5_WINDOW_MS = 24 * 60 * 60 * 1000;
const TOP5_LIMIT = 5;
// TOP5 はチェック中カテゴリへの絞り込み（D-030・SPEC_EXPANSION §6）後に先頭5件を採用するため、
// 絞り込みで目減りする分の余裕を持たせて広めに候補を取得する
const TOP5_CANDIDATE_LIMIT = 50;
// D-030: 自由枠（グループ単位の新画面）は published_at 降順・最新20件で打ち切る
const LIST_LIMIT = 20;

const KNOWN_PRODUCTS = new Set(['claude_code', 'gemini', 'codex', 'other']);
const KNOWN_AUDIENCES = new Set(['engineer', 'backoffice', 'executive']);
const KNOWN_CATEGORIES = new Set(['update', 'tips', 'business', 'case_study']);

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
  const audience = typeof row.audience === 'string' ? row.audience : '';

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
    // G-5: TOP5 の絞り込み（matchesFilter）用の生値。LLM 出力欠損時（CLAUDE.md §4）は undefined のまま保存する
    product: KNOWN_PRODUCTS.has(product) ? (product as Article['product']) : undefined,
    audience: KNOWN_AUDIENCES.has(audience) ? (audience as Article['audience']) : undefined,
    category: KNOWN_CATEGORIES.has(category) ? (category as Article['category']) : undefined,
    difficulty: typeof row.difficulty === 'number' ? row.difficulty : undefined,
    // G-5: 重要度バッジ併記 + タグチップ表示用（SPEC_EXPANSION §7.6）。欠損時は undefined
    importanceReason: typeof row.importance_reason === 'string' ? row.importance_reason : undefined,
    tags: Array.isArray(row.tags) ? row.tags.filter((t): t is string => typeof t === 'string') : undefined,
  };
}

export interface UseArticlesResult {
  articles: Article[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 画面（ScreenConfig）に応じた記事一覧を取得する。
 * TOP5 は `special` を持つ固定枠として従来どおり特別処理する（D-023）。
 * お気に入り（`special: 'fav'`）は G-4 で localStorage 管理に移行したため、
 * このフックは呼ばれない想定（`ListPage` 側で分岐し `lib/favorites.ts` から描画する）。
 * それ以外（自由枠。グループ単位の filter + sort）は汎用クエリで処理する。
 */
export function useArticles(screenConfig: ScreenConfig): UseArticlesResult {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('articles').select(
        'id, url, source, product, title, excerpt, summary_ja, category, importance_score, importance_reason, tags, audience, difficulty, author, published_at'
      );

      if (screenConfig.special === 'top5') {
        // 直近24時間に公開された記事を重要度降順で取得する。
        // バッチは1日1回のみ実行のため、暦日境界だと実行タイミング次第で新着が
        // 「前日扱い」になり永久に表示されなくなる（D-023）。実行タイミング非依存にするため
        // 暦日ではなくローリングウィンドウで判定する。
        // D-030: 選定対象はチェック中カテゴリの記事に絞るため、絞り込み後に5件へ削れるよう
        // ここでは候補を広め（TOP5_CANDIDATE_LIMIT件）に取得しておく。
        const windowStart = new Date(Date.now() - TOP5_WINDOW_MS).toISOString();
        query = query
          .gte('published_at', windowStart)
          .order('importance_score', { ascending: false })
          .limit(TOP5_CANDIDATE_LIMIT);
      } else {
        // 自由枠（グループ単位）: filter を合成する。product/audience は単一値の等価検索、
        // category/difficulty は複数指定可のため .in() を使う（§7.1）
        const { filter } = screenConfig;
        if (filter.product) query = query.eq('product', filter.product);
        if (filter.audience) query = query.eq('audience', filter.audience);
        if (filter.difficulty && filter.difficulty.length > 0) {
          query = query.in('difficulty', filter.difficulty);
        }
        if (filter.category && filter.category.length > 0) {
          query = query.in('category', filter.category);
        }
        // filter.keywords は ScreenConfig 型（§7.1）には存在するが、現状 deriveCustomButtons が
        // キーワード条件を生成する画面を持たないため未配線（将来キーワード指定の画面を追加する際に実装する）

        query = query
          .order(screenConfig.sort === 'importance' ? 'importance_score' : 'published_at', {
            ascending: false,
          })
          .limit(LIST_LIMIT);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      let mapped = (data ?? []).map(row => rowToArticle(row as Record<string, unknown>));

      if (screenConfig.special === 'top5') {
        // D-030: TOP5 の選定対象をユーザーがチェック中（ホームに表示中）のカテゴリに絞る。
        // 自由枠を1つも選択していない場合は絞り込み条件が空集合になり必ず0件になってしまうため、
        // フィルタ自体をスキップして全件を対象にする（フォールバック。完了報告で判断理由を共有）。
        const freeScreens = buildFreeScreens(loadButtonSelection());
        if (freeScreens.length > 0) {
          mapped = mapped.filter(article =>
            freeScreens.some(screen => matchesFilter(article, screen.filter))
          );
        }
        mapped = mapped.slice(0, TOP5_LIMIT);
      }

      setArticles(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(message);
      console.error('[useArticles] fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [screenConfig]);

  useEffect(() => {
    void fetchArticles();
  }, [fetchArticles]);

  return { articles, loading, error, refetch: fetchArticles };
}
