// 初回属性選択ポップアップ（G-3）のドメインロジック。
// 属性 = buttonSettings.ButtonSelection のプリセット（SPEC_EXPANSION.md §7.3）。
// UI（AttributePopup）と App.tsx / SettingsPage.tsx の両方から参照する。

import type { ButtonSelection } from './buttonSettings';

export type AttributeId = 'engineer_beg' | 'engineer_mid' | 'engineer_adv' | 'backoffice' | 'executive';

export interface AttributeOption {
  id: AttributeId;
  label: string;
  desc: string;
}

// TASK_EXPANSION.md 記載の 5 分類（エンジニア初級/中級/上級・バックオフィス・経営者）。
// 説明文は SettingsPage のチェックボックス説明文の文体に合わせた簡潔な日本語（仕様に文言指定なし）。
export const ATTRIBUTE_OPTIONS: AttributeOption[] = [
  {
    id: 'engineer_beg',
    label: 'エンジニア（初級）',
    desc: 'インストール・環境構築・基本コマンドなど、はじめて使う人向けの情報を中心に見る',
  },
  {
    id: 'engineer_mid',
    label: 'エンジニア（中級）',
    desc: 'Skill・Sub Agent・MCP など、機能を使いこなすコツや応用的な使い方を中心に見る',
  },
  {
    id: 'engineer_adv',
    label: 'エンジニア（上級）',
    desc: 'リリースノート・最新技術動向・大規模運用など、応用的・専門的な情報を中心に見る',
  },
  {
    id: 'backoffice',
    label: 'バックオフィス',
    desc: '日々の業務で使えるAI活用術や、他社の導入事例を中心に見る',
  },
  {
    id: 'executive',
    label: '経営者',
    desc: 'AI業界の最新動向や、大企業の導入事例・経営判断に役立つ情報を中心に見る',
  },
];

// 属性 → ButtonSelection プリセット。SPEC_EXPANSION.md §7.3 に具体的なマッピング明記が無いため、
// TASK_EXPANSION.md の 5 分類名から以下のとおり解釈した（完了報告に理由を記載）:
// - エンジニア(初級/中級/上級): 3プロダクト(Gemini/Claude Code/Codex)の該当難易度のみ ON
// - バックオフィス: 活用Tips + 導入事例の両方 ON
// - 経営者: 業界動向 + 導入事例の両方 ON
const ATTRIBUTE_PRESETS: Record<AttributeId, ButtonSelection> = {
  engineer_beg: { gemini_beg: true, claude_beg: true, codex_beg: true },
  engineer_mid: { gemini_mid: true, claude_mid: true, codex_mid: true },
  engineer_adv: { gemini_adv: true, claude_adv: true, codex_adv: true },
  backoffice: { backoffice_tips: true, backoffice_cases: true },
  executive: { exec_trend: true, exec_cases: true },
};

/** 属性 ID からホーム画面ボタンのチェックプリセット（ButtonSelection）を得る */
export function presetForAttribute(attribute: AttributeId): ButtonSelection {
  return { ...ATTRIBUTE_PRESETS[attribute] };
}

// SplashScreen（sessionStorage・毎セッション表示）とは異なり、端末に永続化する（SPEC_EXPANSION §7.3）。
const ATTRIBUTE_ONBOARDED_STORAGE_KEY = 'aiCatchup.attributeOnboarded.v1';

/** 初回訪問（＝まだ属性ポップアップで選択したことがない）なら true */
export function shouldShowAttributePopup(): boolean {
  try {
    return localStorage.getItem(ATTRIBUTE_ONBOARDED_STORAGE_KEY) !== '1';
  } catch {
    // localStorage 不可（プライベートモード等）の場合は毎回出さない方が安全（fail-soft）
    return false;
  }
}

/** 属性選択済みとして記録する（以後 shouldShowAttributePopup は false を返す） */
export function markAttributeOnboarded(): void {
  try {
    localStorage.setItem(ATTRIBUTE_ONBOARDED_STORAGE_KEY, '1');
  } catch {
    // 保存不可でも致命的ではないため無視する
  }
}
