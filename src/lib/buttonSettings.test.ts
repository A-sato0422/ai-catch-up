import { describe, it, expect, beforeEach } from 'vitest';
import {
  deriveCustomButtons,
  countSelectedButtons,
  isGroupSelected,
  saveButtonSelection,
  loadButtonSelection,
  DEFAULT_SELECTION,
  BUTTON_SETTINGS_STORAGE_KEY,
  MAX_CUSTOM_BUTTONS,
  SETTINGS_GROUPS,
} from './buttonSettings';

describe('deriveCustomButtons', () => {
  it('単一チェック: gemini 初級のみ → Gemini ボタン 1 個（difficulty=[1]・category なし）', () => {
    const buttons = deriveCustomButtons({ gemini_beg: true });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toEqual({
      id: 'gemini',
      label: 'Gemini',
      subLabel: '初級',
      filter: { product: 'gemini', audience: 'engineer', difficulty: [1] },
    });
    // エンジニア系は category を絞らない（D-035）
    expect(buttons[0].filter.category).toBeUndefined();
  });

  it('グループ key claude はフィルタ値 claude_code に変換される', () => {
    const buttons = deriveCustomButtons({ claude_mid: true });
    expect(buttons).toHaveLength(1);
    expect(buttons[0].filter.product).toBe('claude_code');
    expect(buttons[0].filter.difficulty).toEqual([2]);
  });

  it('同一グループ複数チェックは 1 ボタンに統合され、difficulty が配列合成される', () => {
    const buttons = deriveCustomButtons({ codex_beg: true, codex_mid: true });
    expect(buttons).toHaveLength(1);
    expect(buttons[0].id).toBe('codex');
    expect(buttons[0].subLabel).toBe('初級・中級');
    expect(buttons[0].filter).toEqual({
      product: 'codex',
      audience: 'engineer',
      difficulty: [1, 2],
    });
  });

  it('グループ内全選択なら subLabel は「すべて」', () => {
    const buttons = deriveCustomButtons({ gemini_beg: true, gemini_mid: true, gemini_adv: true });
    expect(buttons).toHaveLength(1);
    expect(buttons[0].subLabel).toBe('すべて');
    expect(buttons[0].filter.difficulty).toEqual([1, 2, 3]);
  });

  it('backoffice は audience=backoffice + category 配列（product/difficulty なし）', () => {
    const buttons = deriveCustomButtons({ backoffice_tips: true, backoffice_cases: true });
    expect(buttons).toHaveLength(1);
    expect(buttons[0].label).toBe('バックオフィス');
    expect(buttons[0].subLabel).toBe('すべて');
    expect(buttons[0].filter).toEqual({
      audience: 'backoffice',
      category: ['tips', 'case_study'],
    });
    expect(buttons[0].filter.product).toBeUndefined();
    expect(buttons[0].filter.difficulty).toBeUndefined();
  });

  it('exec の業界動向は category=business、導入事例は case_study に対応する', () => {
    const trendOnly = deriveCustomButtons({ exec_trend: true });
    expect(trendOnly[0].filter).toEqual({ audience: 'executive', category: ['business'] });
    expect(trendOnly[0].subLabel).toBe('業界動向');

    const casesOnly = deriveCustomButtons({ exec_cases: true });
    expect(casesOnly[0].filter).toEqual({ audience: 'executive', category: ['case_study'] });
  });

  it('全グループ選択で 5 ボタン（SETTINGS_GROUPS の定義順）', () => {
    const selection = {
      gemini_beg: true,
      claude_adv: true,
      codex_mid: true,
      backoffice_tips: true,
      exec_trend: true,
    };
    const buttons = deriveCustomButtons(selection);
    expect(buttons).toHaveLength(MAX_CUSTOM_BUTTONS);
    expect(buttons.map((b) => b.id)).toEqual(['gemini', 'claude', 'codex', 'backoffice', 'exec']);
  });

  it('未チェックのグループはボタンを生成しない（false 明示も同様）', () => {
    const buttons = deriveCustomButtons({ gemini_beg: false, claude_beg: true });
    expect(buttons).toHaveLength(1);
    expect(buttons[0].id).toBe('claude');
  });

  it('空の選択状態ではボタン 0 個', () => {
    expect(deriveCustomButtons({})).toEqual([]);
  });
});

describe('countSelectedButtons / isGroupSelected', () => {
  it('選択中ボタン数 = チェックが 1 つ以上あるグループ数', () => {
    expect(countSelectedButtons({})).toBe(0);
    expect(countSelectedButtons({ gemini_beg: true })).toBe(1);
    // 同一グループ内の複数チェックは 1 とカウント
    expect(countSelectedButtons({ gemini_beg: true, gemini_mid: true })).toBe(1);
    expect(
      countSelectedButtons({
        gemini_beg: true,
        claude_beg: true,
        codex_beg: true,
        backoffice_tips: true,
        exec_cases: true,
      }),
    ).toBe(5);
  });

  it('isGroupSelected はグループ内チェック有無を返す（未知グループは false）', () => {
    expect(isGroupSelected({ gemini_mid: true }, 'gemini')).toBe(true);
    expect(isGroupSelected({ gemini_mid: true }, 'claude')).toBe(false);
    expect(isGroupSelected({ gemini_mid: true }, 'unknown')).toBe(false);
  });

  it('デフォルト設定は Claude Code + Gemini の 2 ボタン（全難易度）', () => {
    expect(countSelectedButtons(DEFAULT_SELECTION)).toBe(2);
    const buttons = deriveCustomButtons(DEFAULT_SELECTION);
    expect(buttons.map((b) => b.id)).toEqual(['gemini', 'claude']);
    expect(buttons.every((b) => b.subLabel === 'すべて')).toBe(true);
  });
});

describe('localStorage 永続化', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('save → load のラウンドトリップで選択状態が復元される', () => {
    const selection = { gemini_beg: true, backoffice_cases: true, claude_mid: false };
    saveButtonSelection(selection);
    expect(loadButtonSelection()).toEqual(selection);
  });

  it('未保存時はデフォルト設定を返す', () => {
    expect(loadButtonSelection()).toEqual(DEFAULT_SELECTION);
  });

  it('壊れた JSON が保存されている場合はデフォルトにフォールバックする', () => {
    localStorage.setItem(BUTTON_SETTINGS_STORAGE_KEY, '{broken json!!');
    expect(loadButtonSelection()).toEqual(DEFAULT_SELECTION);
  });

  it('JSON として妥当でもオブジェクト以外（配列・文字列・null）はデフォルトにフォールバックする', () => {
    localStorage.setItem(BUTTON_SETTINGS_STORAGE_KEY, '["gemini_beg"]');
    expect(loadButtonSelection()).toEqual(DEFAULT_SELECTION);
    localStorage.setItem(BUTTON_SETTINGS_STORAGE_KEY, '"gemini_beg"');
    expect(loadButtonSelection()).toEqual(DEFAULT_SELECTION);
    localStorage.setItem(BUTTON_SETTINGS_STORAGE_KEY, 'null');
    expect(loadButtonSelection()).toEqual(DEFAULT_SELECTION);
  });

  it('未知のキーや boolean 以外の値は読み込み時に除去される', () => {
    localStorage.setItem(
      BUTTON_SETTINGS_STORAGE_KEY,
      JSON.stringify({ gemini_beg: true, legacy_key: true, claude_mid: 'yes' }),
    );
    expect(loadButtonSelection()).toEqual({ gemini_beg: true });
  });

  it('全解除して保存した場合は空の選択状態として復元される（デフォルトに戻らない）', () => {
    saveButtonSelection({});
    expect(loadButtonSelection()).toEqual({});
  });
});

describe('SETTINGS_GROUPS の定義', () => {
  it('5 グループ・チェックボックス合計 13 個（3×3 + 2 + 2）', () => {
    expect(SETTINGS_GROUPS).toHaveLength(5);
    const totalItems = SETTINGS_GROUPS.reduce((sum, g) => sum + g.items.length, 0);
    expect(totalItems).toBe(13);
  });
});
