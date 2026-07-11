import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 重要トピックの選定は lib/topTopics.ts（selectTopTopics）へ切り出したため、notify のテストは
// クエリ形状に依存せず selectTopTopics を直接モックする。daily_summaries の取得のみ supabase を使う。
const { mockSelectTopTopics, mockMaybeSingle } = vi.hoisted(() => ({
  mockSelectTopTopics: vi.fn(),
  mockMaybeSingle: vi.fn(),
}));

vi.mock('./lib/topTopics.js', () => ({
  selectTopTopics: mockSelectTopTopics,
}));

vi.mock('./lib/supabase.js', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'daily_summaries') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mockMaybeSingle,
            })),
          })),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  },
}));

import { notify, buildSlackPayload, escapeSlackText, FALLBACK_SUMMARY } from './notify.js';

const WEBHOOK_URL = 'https://hooks.slack.com/services/T000/B000/XXXX';

const sampleTopics = [
  {
    groupLabel: 'Claude Code',
    title: 'Claude Code 4.0 リリース',
    url: 'https://example.com/claude-code-4',
    summary_ja: '破壊的変更あり。移行ガイド必読。',
    importance_score: 9,
    importance_reason: '破壊的変更',
  },
  {
    groupLabel: 'Gemini',
    title: 'Gemini 3.1 発表',
    url: 'https://example.com/gemini-3-1',
    summary_ja: '新機能追加。',
    importance_score: 8,
    importance_reason: null,
  },
];

function mockFetchOk() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('ok', { status: 200 })
  );
}

// fetch に渡された Block Kit ペイロードを取り出すヘルパー
function postedPayload(fetchSpy: ReturnType<typeof mockFetchOk>) {
  const [, init] = fetchSpy.mock.calls[0];
  return JSON.parse((init as RequestInit).body as string);
}

describe('notify', () => {
  beforeEach(() => {
    process.env.SLACK_WEBHOOK_URL = WEBHOOK_URL;
    mockSelectTopTopics.mockReset();
    mockMaybeSingle.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('TOP5とサマリーをBlock Kit形式でWebhookへPOSTする', async () => {
    mockSelectTopTopics.mockResolvedValue(sampleTopics);
    mockMaybeSingle.mockResolvedValue({
      data: { summary_ja: '今日はClaude Codeに破壊的変更があったよ。' },
      error: null,
    });
    const fetchSpy = mockFetchOk();

    await notify();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(WEBHOOK_URL);
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).headers).toEqual({ 'Content-Type': 'application/json' });

    const payload = postedPayload(fetchSpy);
    // 冒頭: ヘッダー + サマリー + 区切り、続けて記事 2 件
    expect(payload.blocks).toHaveLength(5);
    expect(payload.blocks[0].type).toBe('header');
    expect(payload.blocks[1].text.text).toBe('今日はClaude Codeに破壊的変更があったよ。');
    expect(payload.blocks[2].type).toBe('divider');
    // 記事はタイトルリンク + 重要度/理由 + 要約
    expect(payload.blocks[3].text.text).toContain(
      '<https://example.com/claude-code-4|Claude Code 4.0 リリース>'
    );
    expect(payload.blocks[3].text.text).toContain('重要度 9 ｜ 破壊的変更');
    expect(payload.blocks[3].text.text).toContain('破壊的変更あり。移行ガイド必読。');
    // 理由 null の記事は「重要度 8」のみ（区切り文字を付けない）
    expect(payload.blocks[4].text.text).toContain('重要度 8');
    expect(payload.blocks[4].text.text).not.toContain('重要度 8 ｜');
  });

  it('daily_summariesの当日行が無いときフォールバック文言を冒頭に使う', async () => {
    mockSelectTopTopics.mockResolvedValue(sampleTopics);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const fetchSpy = mockFetchOk();

    await notify();

    const payload = postedPayload(fetchSpy);
    expect(payload.blocks[1].text.text).toBe(FALLBACK_SUMMARY);
  });

  it('daily_summariesの取得が失敗してもフォールバック文言で投稿する（fail-soft）', async () => {
    mockSelectTopTopics.mockResolvedValue(sampleTopics);
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'db error' } });
    const fetchSpy = mockFetchOk();

    await expect(notify()).resolves.not.toThrow();

    const payload = postedPayload(fetchSpy);
    expect(payload.blocks[1].text.text).toBe(FALLBACK_SUMMARY);
  });

  it('記事0件の日は「静かだった」旨の本文で投稿し破綻しない', async () => {
    mockSelectTopTopics.mockResolvedValue([]);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const fetchSpy = mockFetchOk();

    await expect(notify()).resolves.not.toThrow();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const payload = postedPayload(fetchSpy);
    // ヘッダー + サマリー + 区切り + 空状態メッセージ
    expect(payload.blocks).toHaveLength(4);
    expect(payload.blocks[3].text.text).toContain('静か');
  });

  it('SLACK_WEBHOOK_URL未設定ならPOSTせず正常終了する（fail-soft）', async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    const fetchSpy = mockFetchOk();

    await expect(notify()).resolves.not.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockSelectTopTopics).not.toHaveBeenCalled();
  });

  it('トピック取得が失敗したらPOSTせず正常終了する（fail-soft）', async () => {
    mockSelectTopTopics.mockRejectedValue(new Error('db error'));
    const fetchSpy = mockFetchOk();

    await expect(notify()).resolves.not.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('WebhookへのPOSTがrejectしても例外を投げない（fail-soft）', async () => {
    mockSelectTopTopics.mockResolvedValue(sampleTopics);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));

    await expect(notify()).resolves.not.toThrow();
  });

  it('Webhookが非2xxを返しても例外を投げない（fail-soft）', async () => {
    mockSelectTopTopics.mockResolvedValue(sampleTopics);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('invalid_blocks', { status: 400 })
    );

    await expect(notify()).resolves.not.toThrow();
  });
});

describe('buildSlackPayload', () => {
  it('タイトル・要約・理由のmrkdwn予約文字（& < >）をエスケープする', () => {
    const payload = buildSlackPayload('2026-07-07', 'A & B', [
      {
        groupLabel: 'Gemini',
        title: '<script> & Gemini > Claude?',
        url: 'https://example.com/a',
        summary_ja: '比較 <まとめ>',
        importance_score: 7,
        importance_reason: 'A&B',
      },
    ]);

    expect(payload.blocks[1].text?.text).toBe('A &amp; B');
    const articleText = payload.blocks[3].text?.text ?? '';
    expect(articleText).toContain('&lt;script&gt; &amp; Gemini &gt; Claude?');
    expect(articleText).toContain('A&amp;B');
    // URL 部分はエスケープしない（リンク記法が壊れるため）
    expect(articleText).toContain('<https://example.com/a|');
  });

  it('ヘッダーにJST日付を含める', () => {
    const payload = buildSlackPayload('2026-07-07', 'サマリー', []);
    expect(payload.blocks[0].text?.text).toContain('2026-07-07');
  });
});

describe('escapeSlackText', () => {
  it('& を最初にエスケープするため二重エスケープしない', () => {
    expect(escapeSlackText('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d');
    expect(escapeSlackText('&lt;')).toBe('&amp;lt;');
  });
});
