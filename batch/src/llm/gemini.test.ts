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

  it('Flash 250 件超過時に Flash-Lite モデルを使う', async () => {
    mockGenerateContent.mockResolvedValue(makeResponse(
      '{"summary_ja":"要約","category":"tips","importance_score":5}'
    ));

    // 内部カウンタを 250 に設定するため 250 件処理
    // ただしテストでは mockGenerateContent を常に成功させる
    const privateProvider = provider as unknown as { flashUsedToday: number };
    privateProvider.flashUsedToday = 250;

    const mockGetGenerativeModel = vi.fn(() => ({ generateContent: mockGenerateContent }));
    (provider as unknown as { genai: { getGenerativeModel: typeof mockGetGenerativeModel } })
      .genai.getGenerativeModel = mockGetGenerativeModel;

    await provider.enrich(baseArticle);

    const [{ model }] = mockGetGenerativeModel.mock.calls[0] as [{ model: string }][];
    expect(model).toMatch(/flash-lite/i);
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
