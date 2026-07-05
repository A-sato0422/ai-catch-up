// お気に入りの localStorage 管理（G-4. SPEC_EXPANSION.md §7.4）。
// 複数人お試し利用のため articles.is_favorite（全員共有のグローバル値）は使わず、
// ★ 押下時に記事オブジェクト全体をスナップショット保存する。これにより DB 側で
// 記事が 30 日で物理削除されても、お気に入りの「永久保有」（D-012 の意図）はクライアント側で維持される。
import type { Article } from '../types';

export const FAVORITES_STORAGE_KEY = 'aiCatchup.favorites.v1';

// 記事 id をキーにしたレコード。id で自然に重複排除できる。
type FavoritesRecord = Record<string, Article>;

/**
 * localStorage から保存済みレコードを読み込む。
 * 未保存・パース失敗・形式不正（オブジェクト以外）の場合は空扱いにフォールバックする（fail-soft）。
 */
function readRecord(): FavoritesRecord {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw === null) return {};

    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as FavoritesRecord;
  } catch {
    // localStorage 不可（プライベートモード等）・JSON 破損時は空扱いにする
    return {};
  }
}

/** localStorage への書き込み。容量超過等で失敗しても機能停止させない（fail-soft）。 */
function writeRecord(record: FavoritesRecord): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // 保存不可でも表示自体はメモリ上の state で成立するため無視する
  }
}

/**
 * 保存済みのお気に入りを配列で返す（お気に入りに追加した順序を維持）。
 * 画面表示（published_at 降順）は `sortByDateDesc` を使うか、呼び出し側でソートすること。
 */
export function loadFavorites(): Article[] {
  return Object.values(readRecord());
}

/**
 * `article.date`（'YYYY/MM/DD' 形式）の降順で並べ替える。
 * この形式は辞書順 = 時系列順になるため、Date への変換なしに文字列比較で足りる。
 */
export function sortByDateDesc(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    if (a.date === b.date) return 0;
    return a.date > b.date ? -1 : 1;
  });
}

/** 指定した記事 id がお気に入り登録済みか */
export function isFavorited(id: string): boolean {
  return id in readRecord();
}

/**
 * ★ のトグル。登録済みなら削除、未登録なら記事オブジェクト全体をスナップショット保存する。
 * 更新後のお気に入り一覧（保存順の配列）を返す。
 */
export function toggleFavorite(article: Article): Article[] {
  const record = readRecord();
  if (article.id in record) {
    delete record[article.id];
  } else {
    record[article.id] = article;
  }
  writeRecord(record);
  return Object.values(record);
}
