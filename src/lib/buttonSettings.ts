// 設定画面（G-2）のドメインロジック + localStorage 永続化。
// D-035: ホームのカスタムボタンはチェックボックス単位ではなく「グループ単位」で
// 統合生成する。同一グループ内の複数チェックはフィルタ条件（配列）に合成される。
// 仕様の正典: SPEC_EXPANSION.md §7.1 / §7.2

// CLAUDE.md §3 の union 型に合わせる（グループ key の 'claude' とは別物である点に注意）
export type Product = 'claude_code' | 'gemini' | 'codex' | 'other';
export type Category = 'update' | 'tips' | 'business' | 'case_study';
export type Audience = 'engineer' | 'backoffice' | 'executive';

/** チェックボックス ID（例 'gemini_beg'）→ チェック有無 のマップ */
export type ButtonSelection = Record<string, boolean>;

/** ホームに表示するカスタムボタン 1 個分のクエリ定義（既存 types.ts の ScreenConfig とは別物） */
export interface CustomButtonConfig {
  id: string; // グループ key
  label: string; // グループ名（ボタンのラベル）
  subLabel: string; // 選択内容をすべて列挙する（例「初級・中級・上級」。フェーズI: 「すべて」への省略はしない）
  filter: {
    product?: Product;
    audience: Audience;
    difficulty?: number[]; // エンジニア系グループのみ
    category?: Category[]; // backoffice / exec のみ
  };
}

export type GroupIcon = 'gemini' | 'claude' | 'codex' | 'office' | 'exec';

export interface SettingsGroupItem {
  sub: string; // チェックボックス ID のサフィックス
  label: string;
  desc: string;
}

export interface SettingsGroup {
  key: string;
  name: string;
  icon: GroupIcon;
  items: SettingsGroupItem[];
}

// 説明文はデザイン確定版（SPEC_EXPANSION §7.2）をそのまま使用する
const LEVEL_ITEMS: SettingsGroupItem[] = [
  { sub: 'beg', label: '初級', desc: 'インストール・環境構築・基本コマンドなど、はじめて使う人向けの情報' },
  { sub: 'mid', label: '中級', desc: 'Skill・Sub Agent・MCP など、機能を使いこなすコツや応用的な使い方' },
  { sub: 'adv', label: '上級', desc: 'リリースノート・最新技術動向・大規模運用など、応用的・専門的な情報' },
];

export const SETTINGS_GROUPS: SettingsGroup[] = [
  { key: 'gemini', name: 'Gemini', icon: 'gemini', items: LEVEL_ITEMS },
  { key: 'claude', name: 'Claude Code', icon: 'claude', items: LEVEL_ITEMS },
  { key: 'codex', name: 'Codex', icon: 'codex', items: LEVEL_ITEMS },
  {
    key: 'backoffice',
    name: 'バックオフィス',
    icon: 'office',
    items: [
      { sub: 'tips', label: '活用Tips', desc: '採用面接へのAI導入、給与計算の自動化など、日々の業務で使えるAI活用術' },
      { sub: 'cases', label: '導入事例', desc: '他社のバックオフィス部門でのAI導入事例・実践レポート' },
    ],
  },
  {
    key: 'exec',
    name: '経営者向け',
    icon: 'exec',
    items: [
      { sub: 'trend', label: '業界動向', desc: 'AI業界の最新動向、リーディングカンパニーの戦略・提携・投資ニュース' },
      { sub: 'cases', label: '導入事例', desc: '大企業のAI導入事例、人件費削減効果など経営判断に役立つ実例' },
    ],
  },
];

/** 自由枠の上限（グループが 5 つのため構造上超えないが、カウンター表示と上限判定に使う） */
export const MAX_CUSTOM_BUTTONS = 5;

export const BUTTON_SETTINGS_STORAGE_KEY = 'aiCatchup.buttonSettings.v1';

/** 未保存時のデフォルト: Claude Code 全難易度 + Gemini 全難易度（従来の Tips×2 画面相当） */
export const DEFAULT_SELECTION: ButtonSelection = {
  claude_beg: true,
  claude_mid: true,
  claude_adv: true,
  gemini_beg: true,
  gemini_mid: true,
  gemini_adv: true,
};

export function checkboxId(groupKey: string, sub: string): string {
  return `${groupKey}_${sub}`;
}

// グループ key → フィルタ値のマッピング。
// グループ key 'claude' とフィルタ値 'claude_code' の混同を防ぐため 1 箇所に閉じ込める。
const ENGINEER_PRODUCT: Record<string, Product> = {
  gemini: 'gemini',
  claude: 'claude_code',
  codex: 'codex',
};

const DIFFICULTY_BY_SUB: Record<string, number> = { beg: 1, mid: 2, adv: 3 };

const CATEGORY_BY_ID: Record<string, Category> = {
  backoffice_tips: 'tips',
  backoffice_cases: 'case_study',
  exec_trend: 'business',
  exec_cases: 'case_study',
};

const AUDIENCE_BY_GROUP: Record<string, Audience> = {
  gemini: 'engineer',
  claude: 'engineer',
  codex: 'engineer',
  backoffice: 'backoffice',
  exec: 'executive',
};

/** グループ内にチェックが 1 つ以上あるか（= そのグループのボタンが表示されるか） */
export function isGroupSelected(selection: ButtonSelection, groupKey: string): boolean {
  const group = SETTINGS_GROUPS.find((g) => g.key === groupKey);
  if (!group) return false;
  return group.items.some((item) => selection[checkboxId(groupKey, item.sub)] === true);
}

/** 選択中ボタン数 = チェックが 1 つ以上あるグループ数（カウンター「N/5」用） */
export function countSelectedButtons(selection: ButtonSelection): number {
  return SETTINGS_GROUPS.filter((g) => isGroupSelected(selection, g.key)).length;
}

/**
 * 選択状態からホームに表示するカスタムボタン設定を導出する。
 * グループ単位で統合し、同一グループの複数チェックは配列フィルタに合成される（D-035）。
 */
export function deriveCustomButtons(selection: ButtonSelection): CustomButtonConfig[] {
  const buttons: CustomButtonConfig[] = [];

  for (const group of SETTINGS_GROUPS) {
    const checkedItems = group.items.filter(
      (item) => selection[checkboxId(group.key, item.sub)] === true,
    );
    if (checkedItems.length === 0) continue;

    // フェーズI: 全選択時も「すべて」と省略せず、選択項目をそのまま列挙する
    // （例「初級・中級・上級」）。省略すると全選択かどうかが画面から読み取れないため。
    const subLabel = checkedItems.map((item) => item.label).join('・');

    const audience = AUDIENCE_BY_GROUP[group.key];
    const product = ENGINEER_PRODUCT[group.key];

    if (product) {
      // エンジニア系グループ: category は絞らない（update 記事も難易度別に吸収する。D-035）
      buttons.push({
        id: group.key,
        label: group.name,
        subLabel,
        filter: {
          product,
          audience,
          difficulty: checkedItems.map((item) => DIFFICULTY_BY_SUB[item.sub]),
        },
      });
    } else {
      buttons.push({
        id: group.key,
        label: group.name,
        subLabel,
        filter: {
          audience,
          category: checkedItems.map((item) => CATEGORY_BY_ID[checkboxId(group.key, item.sub)]),
        },
      });
    }
  }

  return buttons;
}

/**
 * 全チェックボックスをオンにした選択状態を返す（設定画面の「すべて選択」ボタン・
 * 重要トピック用の全グループ選定〈`screens.ts` の `buildAllGroupScreens`〉で共有する。フェーズI）。
 */
export function buildFullSelection(): ButtonSelection {
  const selection: ButtonSelection = {};
  for (const group of SETTINGS_GROUPS) {
    for (const item of group.items) {
      selection[checkboxId(group.key, item.sub)] = true;
    }
  }
  return selection;
}

export function saveButtonSelection(selection: ButtonSelection): void {
  try {
    localStorage.setItem(BUTTON_SETTINGS_STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // localStorage 不可（容量超過・プライベートモード等）の場合は保存を諦める。
    // 表示自体はメモリ上の state で成立するため fail-soft とする。
  }
}

/**
 * localStorage から選択状態を読み込む。
 * 未保存・パース失敗・形式不正の場合はデフォルト設定にフォールバックする。
 * 既知のチェックボックス ID のみ取り込む（グループ構成の変更で古いキーが残っても無害化）。
 */
export function loadButtonSelection(): ButtonSelection {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(BUTTON_SETTINGS_STORAGE_KEY);
  } catch {
    return { ...DEFAULT_SELECTION };
  }
  if (raw === null) return { ...DEFAULT_SELECTION };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...DEFAULT_SELECTION };
    }
    const record = parsed as Record<string, unknown>;
    const selection: ButtonSelection = {};
    for (const group of SETTINGS_GROUPS) {
      for (const item of group.items) {
        const id = checkboxId(group.key, item.sub);
        const value = record[id];
        if (typeof value === 'boolean') selection[id] = value;
      }
    }
    return selection;
  } catch {
    return { ...DEFAULT_SELECTION };
  }
}
