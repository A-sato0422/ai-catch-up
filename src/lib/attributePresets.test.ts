import { describe, it, expect, beforeEach } from 'vitest';
import {
  ATTRIBUTE_OPTIONS,
  presetForAttribute,
  shouldShowAttributePopup,
  markAttributeOnboarded,
} from './attributePresets';

describe('presetForAttribute', () => {
  it('エンジニア(初級) は3プロダクトの beg のみ ON', () => {
    expect(presetForAttribute('engineer_beg')).toEqual({
      gemini_beg: true,
      claude_beg: true,
      codex_beg: true,
    });
  });

  it('エンジニア(中級) は3プロダクトの mid のみ ON', () => {
    expect(presetForAttribute('engineer_mid')).toEqual({
      gemini_mid: true,
      claude_mid: true,
      codex_mid: true,
    });
  });

  it('エンジニア(上級) は3プロダクトの adv のみ ON', () => {
    expect(presetForAttribute('engineer_adv')).toEqual({
      gemini_adv: true,
      claude_adv: true,
      codex_adv: true,
    });
  });

  it('バックオフィス は活用Tips + 導入事例の両方 ON', () => {
    expect(presetForAttribute('backoffice')).toEqual({
      backoffice_tips: true,
      backoffice_cases: true,
    });
  });

  it('経営者 は業界動向 + 導入事例の両方 ON', () => {
    expect(presetForAttribute('executive')).toEqual({
      exec_trend: true,
      exec_cases: true,
    });
  });

  it('返り値は呼び出しごとに独立したオブジェクト（内部プリセットを直接参照しない）', () => {
    const preset = presetForAttribute('engineer_beg');
    preset.gemini_beg = false;
    expect(presetForAttribute('engineer_beg').gemini_beg).toBe(true);
  });
});

describe('ATTRIBUTE_OPTIONS', () => {
  it('5属性が定義されている', () => {
    expect(ATTRIBUTE_OPTIONS).toHaveLength(5);
    expect(ATTRIBUTE_OPTIONS.map((o) => o.id)).toEqual([
      'engineer_beg',
      'engineer_mid',
      'engineer_adv',
      'backoffice',
      'executive',
    ]);
  });

  it('各属性にラベルと説明文がある', () => {
    for (const option of ATTRIBUTE_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.desc.length).toBeGreaterThan(0);
    }
  });
});

describe('shouldShowAttributePopup / markAttributeOnboarded', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('未選択（localStorage未設定）なら true を返す', () => {
    expect(shouldShowAttributePopup()).toBe(true);
  });

  it('markAttributeOnboarded 後は false を返す', () => {
    markAttributeOnboarded();
    expect(shouldShowAttributePopup()).toBe(false);
  });
});
