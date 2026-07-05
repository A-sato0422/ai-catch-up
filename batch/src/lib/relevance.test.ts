import { describe, it, expect } from 'vitest';
import {
  isRelevantToClaudeCode,
  isRelevantToGemini,
  isRelevantToAI,
  isRelevantToAiAdoption,
  isRelevantToAiBusiness,
} from './relevance.js';

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

describe('isRelevantToAI', () => {
  it('AI を含むテキストにマッチする（単語境界あり）', () => {
    expect(isRelevantToAI('AI 導入で業務を効率化')).toBe(true);
  });
  it('生成AI を含むテキストにマッチする', () => {
    expect(isRelevantToAI('生成AI ビジネスの最前線')).toBe(true);
  });
  it('人工知能を含むテキストにマッチする', () => {
    expect(isRelevantToAI('人工知能が変える未来')).toBe(true);
  });
  it('ChatGPT を含むテキストにマッチする', () => {
    expect(isRelevantToAI('ChatGPT を業務に導入した事例')).toBe(true);
  });
  it('LLM を含むテキストにマッチする（単語境界あり）', () => {
    expect(isRelevantToAI('LLM を活用した新サービス')).toBe(true);
  });
  it('Gemini / Claude を含むテキストにもマッチする', () => {
    expect(isRelevantToAI('Gemini を使った開発事例')).toBe(true);
    expect(isRelevantToAI('Claude の新機能')).toBe(true);
  });
  it('英単語中の "ai" 部分文字列には誤マッチしない（単語境界）', () => {
    expect(isRelevantToAI('email の送信を自動化するツール')).toBe(false);
    expect(isRelevantToAI('メインの機能を説明します main feature')).toBe(false);
  });
  it('AI と無関係なテキストはマッチしない', () => {
    expect(isRelevantToAI('今日のランチはラーメンにした')).toBe(false);
  });
});

describe('isRelevantToAiAdoption（はてブ「AI 導入」の保険フィルタ）', () => {
  it('AI 関連キーワードを含むテキストにマッチする', () => {
    expect(isRelevantToAiAdoption('AI導入で採用面接を効率化した事例')).toBe(true);
  });
  it('AI に無関係なテキストは除外する', () => {
    expect(isRelevantToAiAdoption('新入社員の名刺交換マナー講座')).toBe(false);
  });
});

describe('isRelevantToAiBusiness（はてブ「生成AI ビジネス」の保険フィルタ）', () => {
  it('AI 関連キーワードを含むテキストにマッチする', () => {
    expect(isRelevantToAiBusiness('生成AIスタートアップが大型資金調達')).toBe(true);
  });
  it('AI に無関係なテキストは除外する', () => {
    expect(isRelevantToAiBusiness('株主総会の開催スケジュール発表')).toBe(false);
  });
});
