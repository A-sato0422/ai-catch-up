import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDelete } = vi.hoisted(() => ({
  mockDelete: vi.fn(),
}));

vi.mock('./lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        lt: mockDelete,
      })),
    })),
  },
}));

import { cleanup } from './cleanup.js';

describe('cleanup', () => {
  beforeEach(() => mockDelete.mockReset());

  it('is_favorite に関係なく published_at が古い記事を削除する', async () => {
    mockDelete.mockResolvedValue({ error: null, count: 5 });

    await cleanup(30);

    expect(mockDelete).toHaveBeenCalledTimes(1);
    // lt('published_at', cutoff) の第 2 引数が cutoff
    const [, cutoffArg] = mockDelete.mock.calls[0];
    const cutoff = new Date(cutoffArg as string);
    const expected = new Date(Date.now() - 30 * 86_400_000);
    expect(Math.abs(cutoff.getTime() - expected.getTime())).toBeLessThan(5000);
  });

  it('Supabase がエラーを返したとき Error をスローする', async () => {
    mockDelete.mockResolvedValue({ error: { message: 'permission denied' }, count: null });

    await expect(cleanup(30)).rejects.toThrow('permission denied');
  });
});
