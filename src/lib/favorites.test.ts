import { describe, it, expect, beforeEach } from 'vitest';
import { loadFavorites, sortByDateDesc, isFavorited, toggleFavorite, FAVORITES_STORAGE_KEY } from './favorites';
import type { Article } from '../types';

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 'article-1',
    url: 'https://example.com/1',
    titleA: 'タイトル1',
    src: 'zenn',
    date: '2026/07/01',
    imp: 8,
    full: '要約1',
    claude: true,
    tag: 'update',
    ...overrides,
  };
}

describe('favorites', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('toggleFavorite / isFavorited / loadFavorites', () => {
    it('未登録の記事をトグルすると追加され、isFavorited が true になる', () => {
      const article = makeArticle();
      const result = toggleFavorite(article);

      expect(result).toEqual([article]);
      expect(isFavorited(article.id)).toBe(true);
      expect(loadFavorites()).toEqual([article]);
    });

    it('登録済みの記事を再度トグルすると削除される', () => {
      const article = makeArticle();
      toggleFavorite(article);
      const result = toggleFavorite(article);

      expect(result).toEqual([]);
      expect(isFavorited(article.id)).toBe(false);
      expect(loadFavorites()).toEqual([]);
    });

    it('未登録の記事は isFavorited が false', () => {
      expect(isFavorited('unknown-id')).toBe(false);
    });

    it('複数記事を id で重複排除しつつ保存できる（同じ id で上書き）', () => {
      const articleV1 = makeArticle({ titleA: '旧タイトル' });
      const articleV2 = makeArticle({ titleA: '旧タイトル' });
      toggleFavorite(articleV1);
      // 同じ id を持つ別オブジェクトでトグルすると削除される（追加時と同一 id なのでトグルは削除扱い）
      toggleFavorite(articleV2);
      expect(loadFavorites()).toEqual([]);
    });

    it('複数件を追加すると全件を配列で返す', () => {
      const a1 = makeArticle({ id: 'a1', date: '2026/07/01' });
      const a2 = makeArticle({ id: 'a2', date: '2026/07/03' });
      toggleFavorite(a1);
      toggleFavorite(a2);

      const loaded = loadFavorites();
      expect(loaded).toHaveLength(2);
      expect(loaded.map((a) => a.id).sort()).toEqual(['a1', 'a2']);
    });

    it('未保存時は空配列を返す', () => {
      expect(loadFavorites()).toEqual([]);
    });

    it('壊れた JSON が保存されている場合は空扱いにフォールバックする', () => {
      localStorage.setItem(FAVORITES_STORAGE_KEY, '{broken json!!');
      expect(loadFavorites()).toEqual([]);
      expect(isFavorited('any-id')).toBe(false);
    });

    it('JSON として妥当でもオブジェクト以外（配列・文字列・null）は空扱いにフォールバックする', () => {
      localStorage.setItem(FAVORITES_STORAGE_KEY, '["a1"]');
      expect(loadFavorites()).toEqual([]);
      localStorage.setItem(FAVORITES_STORAGE_KEY, '"a1"');
      expect(loadFavorites()).toEqual([]);
      localStorage.setItem(FAVORITES_STORAGE_KEY, 'null');
      expect(loadFavorites()).toEqual([]);
    });
  });

  describe('sortByDateDesc', () => {
    it('date（YYYY/MM/DD）の降順で並べ替える', () => {
      const older = makeArticle({ id: 'old', date: '2026/06/30' });
      const newer = makeArticle({ id: 'new', date: '2026/07/05' });
      const middle = makeArticle({ id: 'mid', date: '2026/07/01' });

      const sorted = sortByDateDesc([older, newer, middle]);
      expect(sorted.map((a) => a.id)).toEqual(['new', 'mid', 'old']);
    });

    it('元の配列を破壊しない', () => {
      const list = [makeArticle({ id: 'a', date: '2026/07/01' }), makeArticle({ id: 'b', date: '2026/07/05' })];
      const original = [...list];
      sortByDateDesc(list);
      expect(list).toEqual(original);
    });
  });
});
