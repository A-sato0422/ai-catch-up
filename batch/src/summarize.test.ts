import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockGenerateContent, mockLimit, mockUpsert } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockLimit: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = vi.fn(() => ({ generateContent: mockGenerateContent }));
  },
}));

vi.mock('./lib/supabase.js', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'articles') {
        return {
          select: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: mockLimit,
              })),
            })),
          })),
        };
      }
      if (table === 'daily_summaries') {
        return { upsert: mockUpsert };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  },
}));

import { summarize } from './summarize.js';

function makeResponse(text: string) {
  return { response: { text: () => text } };
}

describe('summarize', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockReset();
    mockLimit.mockReset();
    mockUpsert.mockReset();
    mockUpsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TOP5を取得しLLMでサマリーを生成してdate（JST）でupsertする', async () => {
    mockLimit.mockResolvedValue({
      data: [
        { title: 'Claude Code 4.0 リリース', summary_ja: '破壊的変更あり' },
        { title: 'Gemini 3.1 発表', summary_ja: '新機能追加' },
      ],
      error: null,
    });
    mockGenerateContent.mockResolvedValue(
      makeResponse('今日はClaude Codeに破壊的変更があったよ。要チェック！')
    );

    await summarize();

    // LLM には TOP5 のタイトル + 要約が渡っている
    const [promptArg] = mockGenerateContent.mock.calls[0];
    expect(promptArg).toContain('Claude Code 4.0 リリース');
    expect(promptArg).toContain('破壊的変更あり');
    expect(promptArg).toContain('Gemini 3.1 発表');

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [payload, options] = mockUpsert.mock.calls[0];
    expect(payload.summary_ja).toBe('今日はClaude Codeに破壊的変更があったよ。要チェック！');
    expect(payload.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(options).toEqual({ onConflict: 'date' });
  });

  it('記事0件のときLLMを呼ばずフォールバック文言をupsertする', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });

    await summarize();

    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [payload] = mockUpsert.mock.calls[0];
    expect(typeof payload.summary_ja).toBe('string');
    expect(payload.summary_ja.length).toBeGreaterThan(0);
  });

  it('LLM呼び出しが失敗してもフォールバック文言でupsertし例外を投げない', async () => {
    mockLimit.mockResolvedValue({
      data: [{ title: 'テスト記事', summary_ja: '要約' }],
      error: null,
    });
    mockGenerateContent.mockRejectedValue(new Error('API error'));

    await expect(summarize()).resolves.not.toThrow();

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [payload] = mockUpsert.mock.calls[0];
    expect(payload.summary_ja.length).toBeGreaterThan(0);
  });

  it('TOP5取得が失敗してもフォールバック文言でupsertし例外を投げない', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'db error' } });

    await expect(summarize()).resolves.not.toThrow();

    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('upsert自体が失敗してもsummarize全体は例外を投げない（fail-soft）', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockUpsert.mockResolvedValue({ error: { message: 'upsert failed' } });

    await expect(summarize()).resolves.not.toThrow();
  });

  it('GEMINI_API_KEY未設定でもフォールバック文言でupsertし例外を投げない', async () => {
    delete process.env.GEMINI_API_KEY;
    mockLimit.mockResolvedValue({
      data: [{ title: 'テスト記事', summary_ja: '要約' }],
      error: null,
    });

    await expect(summarize()).resolves.not.toThrow();

    expect(mockGenerateContent).not.toHaveBeenCalled();
    const [payload] = mockUpsert.mock.calls[0];
    expect(payload.summary_ja.length).toBeGreaterThan(0);
  });

  it('date は JST 基準で計算する（UTC日跨ぎでもJSTの日付になる）', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    vi.useFakeTimers();
    // UTC 2026-07-05T16:30:00Z = JST 2026-07-06T01:30:00
    vi.setSystemTime(new Date('2026-07-05T16:30:00Z'));

    await summarize();

    const [payload] = mockUpsert.mock.calls[0];
    expect(payload.date).toBe('2026-07-06');
  });
});
