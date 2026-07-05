import { describe, it, expect } from 'vitest';
import {
  TOP5_SCREEN,
  FAV_SCREEN,
  customButtonToScreenConfig,
  buildFreeScreens,
  buildAllScreens,
  findFreeScreen,
} from './screens';
import type { CustomButtonConfig } from './buttonSettings';

describe('customButtonToScreenConfig', () => {
  it('エンジニア系グループ（product あり）は filter をそのまま引き継ぎ、sort は published_at になる', () => {
    const button: CustomButtonConfig = {
      id: 'gemini',
      label: 'Gemini',
      subLabel: '初級',
      filter: { product: 'gemini', audience: 'engineer', difficulty: [1] },
    };
    const screen = customButtonToScreenConfig(button);
    expect(screen).toEqual({
      id: 'gemini',
      label: 'Gemini',
      subLabel: '初級',
      icon: 'gemini',
      filter: { product: 'gemini', audience: 'engineer', difficulty: [1] },
      sort: 'published_at',
    });
    expect(screen.special).toBeUndefined();
  });

  it('backoffice グループの id は icon "office" に変換される（グループ key とアイコン名の不一致を吸収）', () => {
    const button: CustomButtonConfig = {
      id: 'backoffice',
      label: 'バックオフィス',
      subLabel: 'すべて',
      filter: { audience: 'backoffice', category: ['tips', 'case_study'] },
    };
    const screen = customButtonToScreenConfig(button);
    expect(screen.icon).toBe('office');
    expect(screen.id).toBe('backoffice');
  });

  it('exec グループの id は icon "exec" のまま（key と icon 名が一致するケース）', () => {
    const button: CustomButtonConfig = {
      id: 'exec',
      label: '経営者向け',
      subLabel: '業界動向',
      filter: { audience: 'executive', category: ['business'] },
    };
    const screen = customButtonToScreenConfig(button);
    expect(screen.icon).toBe('exec');
  });
});

describe('buildFreeScreens / buildAllScreens', () => {
  it('選択なしの場合、自由枠は空配列', () => {
    expect(buildFreeScreens({})).toEqual([]);
  });

  it('buildAllScreens は TOP5(固定) → 自由枠 → お気に入り(固定) の順で並ぶ', () => {
    const screens = buildAllScreens({ gemini_beg: true, exec_trend: true });
    expect(screens.map((s) => s.id)).toEqual(['top5', 'gemini', 'exec', 'fav']);
    expect(screens[0]).toBe(TOP5_SCREEN);
    expect(screens[screens.length - 1]).toBe(FAV_SCREEN);
  });

  it('全グループ選択時は固定2 + 自由枠5 = 合計7画面になる', () => {
    const screens = buildAllScreens({
      gemini_beg: true,
      claude_beg: true,
      codex_beg: true,
      backoffice_tips: true,
      exec_trend: true,
    });
    expect(screens).toHaveLength(7);
  });

  it('TOP5 / お気に入りは special フィールドを持つ固定枠', () => {
    expect(TOP5_SCREEN.special).toBe('top5');
    expect(FAV_SCREEN.special).toBe('fav');
  });
});

describe('findFreeScreen', () => {
  it('選択中のグループを groupKey で見つけられる', () => {
    const screen = findFreeScreen({ codex_mid: true }, 'codex');
    expect(screen).toBeDefined();
    expect(screen?.filter).toEqual({ product: 'codex', audience: 'engineer', difficulty: [2] });
  });

  it('未選択・未知の groupKey では undefined を返す', () => {
    expect(findFreeScreen({}, 'codex')).toBeUndefined();
    expect(findFreeScreen({ codex_mid: true }, 'unknown')).toBeUndefined();
  });
});
