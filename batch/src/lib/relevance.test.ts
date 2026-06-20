import { describe, it, expect } from 'vitest';
import { isRelevantToClaudeCode, isRelevantToGemini } from './relevance.js';

describe('isRelevantToClaudeCode', () => {
  it('Claude Code を含むテキストにマッチする', () => {
    expect(isRelevantToClaudeCode('Claude Code の新機能')).toBe(true);
  });
  it('claude-code を含むテキストにマッチする', () => {
    expect(isRelevantToClaudeCode('claude-code を使ってみた')).toBe(true);
  });
  it('ClaudeCode を含むテキストにマッチする', () => {
    expect(isRelevantToClaudeCode('#ClaudeCode タグ記事')).toBe(true);
  });
  it('大文字小文字を区別しない', () => {
    expect(isRelevantToClaudeCode('claude code tips')).toBe(true);
  });
  it('無関係なテキストはマッチしない', () => {
    expect(isRelevantToClaudeCode('Python のおすすめライブラリ')).toBe(false);
  });
});

describe('isRelevantToGemini', () => {
  it('Gemini を含むテキストにマッチする', () => {
    expect(isRelevantToGemini('Gemini 2.5 がリリースされた')).toBe(true);
  });
  it('gemini-cli を含むテキストにマッチする', () => {
    expect(isRelevantToGemini('gemini-cli の使い方')).toBe(true);
  });
  it('Gemma を含むテキストにマッチする', () => {
    expect(isRelevantToGemini('Gemma 3 がオープンソースで公開')).toBe(true);
  });
  it('無関係なテキストはマッチしない', () => {
    expect(isRelevantToGemini('ChatGPT の活用術')).toBe(false);
  });
});
