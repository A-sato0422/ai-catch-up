// 画面のデータ駆動化（SPEC_EXPANSION.md §7.1）。
// 固定枠（TOP5・お気に入り）+ 自由枠（buttonSettings.deriveCustomButtons 由来。グループ単位・最大5）
// を統合した「画面リスト」を組み立てる。ホーム画面・BottomNav・ルーティング・記事取得のすべてで
// この統合リスト（または個々の ScreenConfig）を共通の情報源として使う。
import type { ScreenConfig } from '../types';
import {
  SETTINGS_GROUPS,
  deriveCustomButtons,
  checkboxId,
  type ButtonSelection,
  type CustomButtonConfig,
  type GroupIcon,
} from './buttonSettings';

/**
 * 重要トピック（固定枠）。ボタン5グループそれぞれの当日最重要記事を1件ずつ表示する
 * （全ユーザー一律・チェック状態に依存しない。useArticles 側で `buildAllGroupScreens` を使い
 * グループ別に importance_score 降順・limit 1 で選定する）。id/special/icon は 'top5' を維持
 * （ルーティング `/top5`・アイコン・グラデーション・空状態メッセージが依存するため）。
 */
export const TOP5_SCREEN: ScreenConfig = {
  id: 'top5',
  label: '重要トピック',
  subLabel: 'グループ別の最重要トピック',
  icon: 'top5',
  special: 'top5',
  filter: {},
  sort: 'importance',
};

/** お気に入り（固定枠）。G-4 で localStorage 管理に移行済み（`ListPage` が `special: 'fav'` を見て
 * `useArticles` を使わず `lib/favorites.ts` から直接描画する。全件表示・件数制限なし・DB 問い合わせなし）。 */
export const FAV_SCREEN: ScreenConfig = {
  id: 'fav',
  label: 'お気に入り',
  subLabel: '保存した記事・新着順',
  icon: 'fav',
  special: 'fav',
  filter: {},
  sort: 'published_at',
};

// グループ key ('gemini'|'claude'|'codex'|'backoffice'|'exec') → アイコン種別
// ('gemini'|'claude'|'codex'|'office'|'exec') への変換。SETTINGS_GROUPS に定義済みの対応表を参照する
// （'backoffice' → 'office' のように key とアイコン名が異なるグループがあるため単純な cast はできない）。
function iconForGroup(groupKey: string): GroupIcon {
  const group = SETTINGS_GROUPS.find((g) => g.key === groupKey);
  // SETTINGS_GROUPS は deriveCustomButtons と同じ配列を参照しているため、未知の groupKey は構造上発生しない
  return group?.icon ?? 'gemini';
}

/** CustomButtonConfig（設定画面のグループ別ボタン）を新 ScreenConfig（クエリ定義）へ変換する薄いアダプタ */
export function customButtonToScreenConfig(button: CustomButtonConfig): ScreenConfig {
  return {
    id: button.id,
    label: button.label,
    subLabel: button.subLabel,
    icon: iconForGroup(button.id),
    filter: button.filter,
    // 自由枠は D-030 により published_at 降順・件数上限（20件）で表示する
    sort: 'published_at',
  };
}

/** 自由枠（グループ単位・最大5）の ScreenConfig 一覧。SETTINGS_GROUPS の定義順。 */
export function buildFreeScreens(selection: ButtonSelection): ScreenConfig[] {
  return deriveCustomButtons(selection).map(customButtonToScreenConfig);
}

/**
 * 重要トピック用: 全グループ・全項目を選択した固定の5画面を返す（localStorage 非依存＝全ユーザー一律）。
 * 各 ScreenConfig は group.name をラベル（＝カード先頭のグループ名バッジ）に、product/audience/category
 * のフィルタを持つ。difficulty はエンジニア系グループの filter に含まれるが、重要トピックの選定側
 * （useArticles）では未 enrich 記事も拾うために difficulty 条件を落として使う。
 */
export function buildAllGroupScreens(): ScreenConfig[] {
  const all: ButtonSelection = {};
  for (const group of SETTINGS_GROUPS) {
    for (const item of group.items) {
      all[checkboxId(group.key, item.sub)] = true;
    }
  }
  return buildFreeScreens(all);
}

/**
 * ホーム画面・BottomNav 共通の統合画面リスト（合計最大7 = 固定2 + 自由枠5。D-035）。
 * 順序: TOP5（固定） → 自由枠（グループ単位） → お気に入り（固定）。
 */
export function buildAllScreens(selection: ButtonSelection): ScreenConfig[] {
  return [TOP5_SCREEN, ...buildFreeScreens(selection), FAV_SCREEN];
}

/** `/screen/:groupKey` ルート用: 選択状態から該当グループの ScreenConfig を探す（未選択なら undefined） */
export function findFreeScreen(selection: ButtonSelection, groupKey: string): ScreenConfig | undefined {
  return buildFreeScreens(selection).find((s) => s.id === groupKey);
}
