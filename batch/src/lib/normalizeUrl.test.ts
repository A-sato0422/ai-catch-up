import { describe, it, expect } from 'vitest';
import { normalizeUrl } from './normalizeUrl.js';

describe('normalizeUrl', () => {
  it('スキーム・ホストを小文字化する', () => {
    expect(normalizeUrl('HTTPS://ZENN.DEV/articles/abc')).toBe('https://zenn.dev/articles/abc');
  });

  it('末尾スラッシュを除去する', () => {
    expect(normalizeUrl('https://zenn.dev/articles/abc/')).toBe('https://zenn.dev/articles/abc');
  });

  it('ルートパスの末尾スラッシュは保持する', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('utm_* パラメータを除去する', () => {
    expect(normalizeUrl('https://zenn.dev/articles/abc?utm_source=twitter&utm_medium=social'))
      .toBe('https://zenn.dev/articles/abc');
  });

  it('fbclid を除去する', () => {
    expect(normalizeUrl('https://example.com/page?fbclid=ABCDEF'))
      .toBe('https://example.com/page');
  });

  it('フラグメントを除去する', () => {
    expect(normalizeUrl('https://zenn.dev/articles/abc#section1'))
      .toBe('https://zenn.dev/articles/abc');
  });

  it('通常のクエリパラメータは保持する', () => {
    expect(normalizeUrl('https://qiita.com/search?q=claudecode&sort=like'))
      .toBe('https://qiita.com/search?q=claudecode&sort=like');
  });

  it('utm と通常パラメータが混在する場合は utm のみ除去する', () => {
    expect(normalizeUrl('https://example.com/page?id=123&utm_source=feed'))
      .toBe('https://example.com/page?id=123');
  });

  it('GitHub Releases URL を正規化する', () => {
    expect(normalizeUrl('https://github.com/anthropics/claude-code/releases/tag/v2.1.177'))
      .toBe('https://github.com/anthropics/claude-code/releases/tag/v2.1.177');
  });
});
