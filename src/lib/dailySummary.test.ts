import { describe, it, expect, vi, beforeEach } from 'vitest';

// supabase クライアントは外部依存のため必ずモック化する（CLAUDE.md §4 / run-tests スキル）
const maybeSingleMock = vi.fn();
vi.mock('./supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
    }),
  },
}));

import { getJstDateString, fetchDailySummary, FALLBACK_SUMMARY } from './dailySummary';

describe('getJstDateString', () => {
  it('UTC の日時を JST (UTC+9) に変換して YYYY-MM-DD を返す', () => {
    // 2026-07-05T15:30:00Z は JST で 2026-07-06T00:30:00
    expect(getJstDateString(new Date('2026-07-05T15:30:00Z'))).toBe('2026-07-06');
  });

  it('JST への繰り上げが発生しない時刻はそのまま日付変換される', () => {
    // 2026-07-05T01:00:00Z は JST で 2026-07-05T10:00:00
    expect(getJstDateString(new Date('2026-07-05T01:00:00Z'))).toBe('2026-07-05');
  });

  it('月末・年末をまたぐケースでも正しく繰り上がる', () => {
    // 2025-12-31T15:00:00Z は JST で 2026-01-01T00:00:00
    expect(getJstDateString(new Date('2025-12-31T15:00:00Z'))).toBe('2026-01-01');
  });
});

describe('fetchDailySummary', () => {
  beforeEach(() => {
    maybeSingleMock.mockReset();
  });

  it('当日行が存在する場合は summary_ja を返す', async () => {
    maybeSingleMock.mockResolvedValue({ data: { summary_ja: '今日のまとめだよ' }, error: null });
    expect(await fetchDailySummary()).toBe('今日のまとめだよ');
  });

  it('当日行が存在しない場合はフォールバック文言を返す', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    expect(await fetchDailySummary()).toBe(FALLBACK_SUMMARY);
  });

  it('Supabase がエラーを返した場合もフォールバック文言を返す', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await fetchDailySummary()).toBe(FALLBACK_SUMMARY);
  });

  it('例外が投げられた場合もフォールバック文言を返す（fail-soft）', async () => {
    maybeSingleMock.mockRejectedValue(new Error('network error'));
    expect(await fetchDailySummary()).toBe(FALLBACK_SUMMARY);
  });
});
