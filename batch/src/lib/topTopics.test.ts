import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TopTopicRow } from './topTopics.js';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('./supabase.js', () => ({
  supabase: { from: mockFrom },
}));

import { selectTopTopics, saveTopTopics, fetchSavedTopTopics } from './topTopics.js';

const sampleTopics: TopTopicRow[] = [
  {
    articleId: 'a1111111-1111-1111-1111-111111111111',
    groupLabel: 'Gemini',
    title: 'Gemini 3.1 発表',
    url: 'https://example.com/gemini',
    summary_ja: '新機能追加',
    importance_score: 8,
    importance_reason: '新機能',
  },
  {
    articleId: 'a2222222-2222-2222-2222-222222222222',
    groupLabel: 'Claude Code',
    title: 'Claude Code 4.0 リリース',
    url: 'https://example.com/claude',
    summary_ja: '破壊的変更あり',
    importance_score: 9,
    importance_reason: '破壊的変更',
  },
];

// articles テーブル向けのチェーン可能なクエリスタブ（gte/eq/in/order は自身を返し limit で解決）
function makeArticlesQuery(data: unknown[] | null, error: { message: string } | null = null) {
  const q = {
    gte: vi.fn(() => q),
    eq: vi.fn(() => q),
    in: vi.fn(() => q),
    order: vi.fn(() => q),
    limit: vi.fn(() => Promise.resolve({ data, error })),
  };
  return q;
}

describe('selectTopTopics', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('importance_score 降順（nulls last）→ published_at 降順で決定的に選定し id を articleId に写す', async () => {
    const row = {
      id: 'a1111111-1111-1111-1111-111111111111',
      title: 'Gemini 3.1 発表',
      url: 'https://example.com/gemini',
      summary_ja: '新機能追加',
      importance_score: 8,
      importance_reason: '新機能',
    };
    const q = makeArticlesQuery([row]);
    mockFrom.mockReturnValue({ select: vi.fn(() => q) });

    const topics = await selectTopTopics('2026-07-15T20:00:00.000Z');

    // 5 グループとも同じスタブ行を返すので 5 件（グループ定義順を維持）
    expect(topics).toHaveLength(5);
    expect(topics[0].groupLabel).toBe('Gemini');
    expect(topics[0].articleId).toBe(row.id);
    // 同点時の揺れを防ぐタイブレーク（SPEC §6.4）: importance_score 降順 nulls last → published_at 降順
    expect(q.order).toHaveBeenCalledWith('importance_score', { ascending: false, nullsFirst: false });
    expect(q.order).toHaveBeenCalledWith('published_at', { ascending: false });
  });

  it('該当0件のグループは結果から除外する', async () => {
    const q = makeArticlesQuery([]);
    mockFrom.mockReturnValue({ select: vi.fn(() => q) });

    const topics = await selectTopTopics('2026-07-15T20:00:00.000Z');

    expect(topics).toEqual([]);
  });

  it('クエリエラー時は throw する（fail-soft は呼び出し側の責務）', async () => {
    const q = makeArticlesQuery(null, { message: 'db error' });
    mockFrom.mockReturnValue({ select: vi.fn(() => q) });

    await expect(selectTopTopics('2026-07-15T20:00:00.000Z')).rejects.toThrow('db error');
  });
});

describe('saveTopTopics', () => {
  const mockDeleteEq = vi.fn();
  const mockInsert = vi.fn();

  beforeEach(() => {
    mockFrom.mockReset();
    mockDeleteEq.mockReset();
    mockInsert.mockReset();
    mockDeleteEq.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      delete: vi.fn(() => ({ eq: mockDeleteEq })),
      insert: mockInsert,
    });
  });

  it('当日行を delete してから position（グループ定義順）付きで insert する（洗い替え）', async () => {
    await saveTopTopics('2026-07-16', sampleTopics);

    expect(mockDeleteEq).toHaveBeenCalledWith('date', '2026-07-16');
    expect(mockInsert).toHaveBeenCalledWith([
      {
        date: '2026-07-16',
        position: 0,
        group_label: 'Gemini',
        article_id: 'a1111111-1111-1111-1111-111111111111',
      },
      {
        date: '2026-07-16',
        position: 1,
        group_label: 'Claude Code',
        article_id: 'a2222222-2222-2222-2222-222222222222',
      },
    ]);
  });

  it('0件の日は delete のみ行い insert しない（前回実行の残骸を消す）', async () => {
    await saveTopTopics('2026-07-16', []);

    expect(mockDeleteEq).toHaveBeenCalledTimes(1);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('delete が失敗したら throw し insert に進まない', async () => {
    mockDeleteEq.mockResolvedValue({ error: { message: 'delete failed' } });

    await expect(saveTopTopics('2026-07-16', sampleTopics)).rejects.toThrow('delete failed');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('insert が失敗したら throw する', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'insert failed' } });

    await expect(saveTopTopics('2026-07-16', sampleTopics)).rejects.toThrow('insert failed');
  });
});

describe('fetchSavedTopTopics', () => {
  const mockOrder = vi.fn();

  beforeEach(() => {
    mockFrom.mockReset();
    mockOrder.mockReset();
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ order: mockOrder })) })),
    });
  });

  it('FK 埋め込みの articles を TopTopicRow へマッピングして position 順で返す', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          position: 0,
          group_label: 'Gemini',
          articles: {
            id: 'a1111111-1111-1111-1111-111111111111',
            title: 'Gemini 3.1 発表',
            url: 'https://example.com/gemini',
            summary_ja: '新機能追加',
            importance_score: 8,
            importance_reason: '新機能',
          },
        },
      ],
      error: null,
    });

    const topics = await fetchSavedTopTopics('2026-07-16');

    expect(topics).toEqual([
      {
        articleId: 'a1111111-1111-1111-1111-111111111111',
        groupLabel: 'Gemini',
        title: 'Gemini 3.1 発表',
        url: 'https://example.com/gemini',
        summary_ja: '新機能追加',
        importance_score: 8,
        importance_reason: '新機能',
      },
    ]);
  });

  it('埋め込み articles が null の行（FK cascade 直後の異常系）はスキップする', async () => {
    mockOrder.mockResolvedValue({
      data: [
        { position: 0, group_label: '経営者向け', articles: null },
        {
          position: 1,
          group_label: 'Claude Code',
          articles: {
            id: 'a2222222-2222-2222-2222-222222222222',
            title: 'Claude Code 4.0 リリース',
            url: 'https://example.com/claude',
            summary_ja: '破壊的変更あり',
            importance_score: 9,
            importance_reason: '破壊的変更',
          },
        },
      ],
      error: null,
    });

    const topics = await fetchSavedTopTopics('2026-07-16');

    expect(topics).toHaveLength(1);
    expect(topics[0].groupLabel).toBe('Claude Code');
  });

  it('クエリエラー時は throw する（fail-soft は呼び出し側の責務）', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'db error' } });

    await expect(fetchSavedTopTopics('2026-07-16')).rejects.toThrow('db error');
  });
});
