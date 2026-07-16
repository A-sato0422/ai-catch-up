import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGenerateContent, mockDelay } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockDelay: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = vi.fn(() => ({ generateContent: mockGenerateContent }));
  },
}));

vi.mock('../lib/delay.js', () => ({ delay: mockDelay }));

import { GeminiProvider } from './gemini.js';
import type { RawArticle } from '../types.js';

const baseArticle: RawArticle = {
  url: 'https://zenn.dev/articles/abc',
  source: 'zenn_claude_code',
  product: 'claude_code',
  title: 'Claude Code で CI を自動化する方法',
  excerpt: '本文の抜粋テキスト。Claude Code を使って GitHub Actions の設定を自動生成する方法を紹介します。',
  publishedAt: '2026-06-20T00:00:00Z',
};

function makeResponse(json: string) {
  return { response: { text: () => json } };
}

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockReset();
    mockDelay.mockReset();
    mockDelay.mockResolvedValue(undefined);
    provider = new GeminiProvider();
  });

  it('LLM が返した JSON を正しく Enrichment に変換する', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"Claude Code で CI を自動化する記事。GitHub Actions と組み合わせた活用例。実践的な内容。","category":"tips","importance_score":7}'
    ));

    const result = await provider.enrich(baseArticle);

    expect(result.summaryJa).toContain('Claude Code');
    expect(result.category).toBe('tips');
    expect(result.importanceScore).toBe(7);
  });

  it('JSON の前後に説明テキストがあっても正しくパースする', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      'はい、以下が分析結果です:\n{"summary_ja":"要約","category":"update","importance_score":9}\n以上です。'
    ));

    const result = await provider.enrich(baseArticle);

    expect(result.category).toBe('update');
    expect(result.importanceScore).toBe(9);
  });

  it('importance_score を 1〜10 にクランプする', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"tips","importance_score":15}'
    ));
    const r = await provider.enrich(baseArticle);
    expect(r.importanceScore).toBe(10);

    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"tips","importance_score":-3}'
    ));
    const r2 = await provider.enrich(baseArticle);
    expect(r2.importanceScore).toBe(1);
  });

  it('JSON パース失敗時はデフォルト値でフォールバックする', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse('これはJSONではありません'));

    const result = await provider.enrich(baseArticle);

    expect(result.summaryJa).toBe('');
    expect(result.category).toBe('tips');
    expect(result.importanceScore).toBe(5);
  });

  it('未知の category は tips にデフォルトする', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"unknown_value","importance_score":5}'
    ));

    const result = await provider.enrich(baseArticle);
    expect(result.category).toBe('tips');
  });

  it('business / case_study の category を正しくパースする', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"business","importance_score":5}'
    ));
    const business = await provider.enrich(baseArticle);
    expect(business.category).toBe('business');

    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"case_study","importance_score":5}'
    ));
    const caseStudy = await provider.enrich(baseArticle);
    expect(caseStudy.category).toBe('case_study');
  });

  it('拡張フィールド（importance_reason / tags / audience / difficulty）を正しくパースする', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"update","importance_score":8,"importance_reason":"破壊的変更","tags":["Claude Code","CI"],"audience":"engineer","difficulty":3}'
    ));

    const result = await provider.enrich(baseArticle);

    expect(result.importanceReason).toBe('破壊的変更');
    expect(result.tags).toEqual(['Claude Code', 'CI']);
    expect(result.audience).toBe('engineer');
    expect(result.difficulty).toBe(3);
  });

  it('拡張フィールドが欠損している場合は undefined にフォールバックする', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"tips","importance_score":5}'
    ));

    const result = await provider.enrich(baseArticle);

    expect(result.importanceReason).toBeUndefined();
    expect(result.tags).toBeUndefined();
    expect(result.audience).toBeUndefined();
    expect(result.difficulty).toBeUndefined();
  });

  it('拡張フィールドの型が不正な場合は無視して undefined にする', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"tips","importance_score":5,"importance_reason":123,"tags":"not-an-array","audience":"unknown_audience","difficulty":"high"}'
    ));

    const result = await provider.enrich(baseArticle);

    expect(result.importanceReason).toBeUndefined();
    expect(result.tags).toBeUndefined();
    expect(result.audience).toBeUndefined();
    expect(result.difficulty).toBeUndefined();
  });

  it('tags の要素に文字列以外が混ざる場合は文字列のみ残す', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"tips","importance_score":5,"tags":["有効なタグ",123,null,"もう一つ"]}'
    ));

    const result = await provider.enrich(baseArticle);
    expect(result.tags).toEqual(['有効なタグ', 'もう一つ']);
  });

  it('difficulty が範囲外（1〜3 以外）の場合は undefined にする', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"tips","importance_score":5,"difficulty":0}'
    ));
    const tooLow = await provider.enrich(baseArticle);
    expect(tooLow.difficulty).toBeUndefined();

    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"tips","importance_score":5,"difficulty":4}'
    ));
    const tooHigh = await provider.enrich(baseArticle);
    expect(tooHigh.difficulty).toBeUndefined();
  });

  it('JSON パース失敗時は拡張フィールドも含めてデフォルト値でフォールバックする', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse('これはJSONではありません'));

    const result = await provider.enrich(baseArticle);

    expect(result.importanceReason).toBeUndefined();
    expect(result.tags).toBeUndefined();
    expect(result.audience).toBeUndefined();
    expect(result.difficulty).toBeUndefined();
  });

  it('LLM が返した product を Enrichment に含める（取得元と異なる値も許容）', async () => {
    // 取得元は zenn_gemini（product ヒント: gemini）だが内容は Claude 主体、という誤爆ケースを模す
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"Claude Sonnet 5 の記事","category":"update","importance_score":9,"product":"claude_code"}'
    ));

    const geminiTaggedArticle: RawArticle = { ...baseArticle, source: 'zenn_gemini', product: 'gemini' };
    const result = await provider.enrich(geminiTaggedArticle);

    expect(result.product).toBe('claude_code');
  });

  it('product が欠損・不正値の場合は undefined にする（呼び出し側でフォールバック）', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"tips","importance_score":5}'
    ));
    const missing = await provider.enrich(baseArticle);
    expect(missing.product).toBeUndefined();

    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"tips","importance_score":5,"product":"claude"}'
    ));
    const invalid = await provider.enrich(baseArticle);
    expect(invalid.product).toBeUndefined();
  });

  it('取得元クエリ由来の product をヒントとしてプロンプトに含める', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"tips","importance_score":5}'
    ));

    await provider.enrich({ ...baseArticle, product: 'gemini' });

    const [promptArg] = mockGenerateContent.mock.calls[0];
    const promptText = typeof promptArg === 'string' ? promptArg : JSON.stringify(promptArg);
    expect(promptText).toContain('"gemini"（収集元クエリ由来の推定値）');
  });

  it('excerpt を 3000 文字に打ち切ってから LLM に渡す', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"tips","importance_score":5}'
    ));
    const longArticle: RawArticle = {
      ...baseArticle,
      excerpt: 'あ'.repeat(5000),
    };

    await provider.enrich(longArticle);

    const [promptArg] = mockGenerateContent.mock.calls[0];
    const promptText = typeof promptArg === 'string' ? promptArg : JSON.stringify(promptArg);
    // 3000 文字を超える文字列がプロンプトに渡っていないことを確認
    expect(promptText.split('あ').length - 1).toBeLessThanOrEqual(3000);
  });

  it('Primary 500 件超過時に Fallback モデルを使う', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"tips","importance_score":5}'
    ));

    const privateProvider = provider as unknown as { primaryUsedToday: number };
    privateProvider.primaryUsedToday = 500;

    const mockGetGenerativeModel = vi.fn(() => ({ generateContent: mockGenerateContent }));
    (provider as unknown as { genai: { getGenerativeModel: typeof mockGetGenerativeModel } })
      .genai.getGenerativeModel = mockGetGenerativeModel;

    await provider.enrich(baseArticle);

    const [{ model }] = mockGetGenerativeModel.mock.calls[0] as unknown as [{ model: string }];
    expect(model).toMatch(/gemma/i);
  });

  it('Primary が 429 を返したとき Fallback にフォールバックし primaryUsedToday を PRIMARY_RPD にセットする', async () => {
    const quotaError = Object.assign(new Error('Quota exceeded'), { status: 429 });
    const primaryMock = { generateContent: vi.fn().mockRejectedValue(quotaError) };
    const fallbackMock = { generateContent: vi.fn().mockResolvedValue(makeResponse(
      '{"summary_ja":"Fallbackの要約","category":"update","importance_score":6}'
    )) };
    const mockGetModel = vi.fn()
      .mockReturnValueOnce(primaryMock)
      .mockReturnValueOnce(fallbackMock);
    (provider as unknown as { genai: { getGenerativeModel: typeof mockGetModel } })
      .genai.getGenerativeModel = mockGetModel;

    const result = await provider.enrich(baseArticle);

    expect(result.summaryJa).toBe('Fallbackの要約');
    expect(result.category).toBe('update');
    const privateProvider = provider as unknown as { primaryUsedToday: number };
    expect(privateProvider.primaryUsedToday).toBe(500);
  });

  it('Flash 呼び出し間隔が短いとき delay を呼ぶ', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"tips","importance_score":5}'
    ));

    // 最初の呼び出し（delay なし）
    await provider.enrich(baseArticle);
    expect(mockDelay).not.toHaveBeenCalled();

    // 2 回目は前回呼び出しから 6 秒未満なので delay が呼ばれる
    await provider.enrich(baseArticle);
    expect(mockDelay).toHaveBeenCalledTimes(1);
    expect(mockDelay.mock.calls[0][0]).toBeGreaterThan(0);
  });

  it('GEMINI_API_KEY が未設定のとき constructor で Error をスローする', () => {
    delete process.env.GEMINI_API_KEY;
    expect(() => new GeminiProvider()).toThrow('GEMINI_API_KEY');
  });
});
