import { describe, it, expect } from 'vitest';
import { matchesFilter } from './screenFilter';
import type { Article, ArticleFilter } from '../types';

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 'a1',
    url: 'https://example.com/1',
    titleA: 'タイトル',
    date: '2026/07/05',
    imp: 8,
    full: '要約',
    product: 'claude_code',
    audience: 'engineer',
    category: 'update',
    difficulty: 2,
    ...overrides,
  };
}

describe('matchesFilter', () => {
  it('空の filter は無条件で一致する', () => {
    expect(matchesFilter(makeArticle(), {})).toBe(true);
  });

  it('product が一致しない場合は false', () => {
    const filter: ArticleFilter = { product: 'gemini' };
    expect(matchesFilter(makeArticle({ product: 'claude_code' }), filter)).toBe(false);
  });

  it('product が一致する場合は true', () => {
    const filter: ArticleFilter = { product: 'gemini' };
    expect(matchesFilter(makeArticle({ product: 'gemini' }), filter)).toBe(true);
  });

  it('audience が一致しない場合は false', () => {
    const filter: ArticleFilter = { audience: 'executive' };
    expect(matchesFilter(makeArticle({ audience: 'engineer' }), filter)).toBe(false);
  });

  it('difficulty は配列のいずれかに一致すれば true', () => {
    const filter: ArticleFilter = { difficulty: [1, 3] };
    expect(matchesFilter(makeArticle({ difficulty: 3 }), filter)).toBe(true);
    expect(matchesFilter(makeArticle({ difficulty: 2 }), filter)).toBe(false);
  });

  it('difficulty 条件があるのに記事側が undefined なら false（欠損は対象外に倒す）', () => {
    const filter: ArticleFilter = { difficulty: [1, 2, 3] };
    expect(matchesFilter(makeArticle({ difficulty: undefined }), filter)).toBe(false);
  });

  it('category は配列のいずれかに一致すれば true', () => {
    const filter: ArticleFilter = { category: ['tips', 'case_study'] };
    expect(matchesFilter(makeArticle({ category: 'case_study' }), filter)).toBe(true);
    expect(matchesFilter(makeArticle({ category: 'business' }), filter)).toBe(false);
  });

  it('category 条件があるのに記事側が undefined なら false', () => {
    const filter: ArticleFilter = { category: ['update'] };
    expect(matchesFilter(makeArticle({ category: undefined }), filter)).toBe(false);
  });

  it('複数条件は AND で判定される', () => {
    const filter: ArticleFilter = { product: 'gemini', audience: 'engineer', difficulty: [1, 2] };
    expect(
      matchesFilter(makeArticle({ product: 'gemini', audience: 'engineer', difficulty: 1 }), filter)
    ).toBe(true);
    expect(
      matchesFilter(makeArticle({ product: 'gemini', audience: 'engineer', difficulty: 3 }), filter)
    ).toBe(false);
    expect(
      matchesFilter(makeArticle({ product: 'claude_code', audience: 'engineer', difficulty: 1 }), filter)
    ).toBe(false);
  });

  it('backoffice/exec 系（product 未指定・category 指定）の判定', () => {
    const filter: ArticleFilter = { audience: 'backoffice', category: ['tips', 'case_study'] };
    expect(
      matchesFilter(makeArticle({ product: undefined, audience: 'backoffice', category: 'tips', difficulty: undefined }), filter)
    ).toBe(true);
    expect(
      matchesFilter(makeArticle({ product: undefined, audience: 'backoffice', category: 'business', difficulty: undefined }), filter)
    ).toBe(false);
  });
});
