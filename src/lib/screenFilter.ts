// TOP5 のチェック中カテゴリ絞り込み（SPEC_EXPANSION §6・D-030）。
// 「ユーザーが現在チェックしている（ホームに表示中の）カテゴリの記事のみ」を
// TOP5 の選定対象にするための判定ロジック。DB クエリではなくフロント側フィルタで行う。
import type { Article, ArticleFilter } from '../types';

/**
 * 記事が ScreenConfig の filter 条件に一致するか判定する純粋関数。
 * filter に指定が無い軸は無条件で一致とみなす（`ArticleFilter` の各フィールドは任意）。
 * 記事側に生値（product/audience/category/difficulty）が欠損している場合、
 * その軸に絞り込み条件があれば不一致として扱う（LLM 出力欠損時は「対象外」に倒す）。
 *
 * 判断メモ: audience/difficulty はフェーズBで追加された欠損しうるフィールドのため、
 * デプロイ直後は「既存記事のバックフィルをしない」方針（CLAUDE.md §4）により対象外になりうる。
 * 一見 TOP5 が空になりうるが、TOP5 は直近24時間のローリングウィンドウ（D-023）のため、
 * 新バッチが1回実行されれば翌日には解消する一時的な状態。これは「空＝バグではなく今日は
 * 静かだった」という本アプリの既存の空状態デザイン（SPEC_EXPANSION §7.6）でカバーされるため、
 * 欠損値を緩く許容（除外しない）するよりも、audience/categoryの誤帰属（例: 旧データの
 * category=tips がバックオフィス向けか判別できないまま一致扱いになる）を避けられるこちらを採用する。
 */
export function matchesFilter(article: Article, filter: ArticleFilter): boolean {
  if (filter.product && article.product !== filter.product) return false;
  if (filter.audience && article.audience !== filter.audience) return false;

  if (filter.difficulty && filter.difficulty.length > 0) {
    if (article.difficulty === undefined || !filter.difficulty.includes(article.difficulty)) {
      return false;
    }
  }

  if (filter.category && filter.category.length > 0) {
    if (article.category === undefined || !filter.category.includes(article.category)) {
      return false;
    }
  }

  // keywords は ScreenConfig 型には存在するが、現状 deriveCustomButtons が
  // キーワード条件を生成する画面を持たないため未配線（useArticles.ts の既存コメント参照）
  return true;
}
