// カードの表示要素フラグ（ScreenDisplayConfig）の割り当て。
// G-1 のデータ駆動化により画面は ScreenConfig（クエリ定義）で表現されるため、
// 表示レイアウトは screen.special の有無で切り替える。
// 仕様の正典: SPEC_EXPANSION.md §7.1
import type { ScreenConfig, ScreenDisplayConfig } from '../types';

/** TOP5（固定枠）の表示設定。従来のデザインを維持する。 */
export const TOP5_DISPLAY: ScreenDisplayConfig = {
  hasNumber: true,
  hasSource: true,
  chevron: true,
  expand: true,
};

/** お気に入り（固定枠）の表示設定。従来のデザインを維持する。 */
export const FAV_DISPLAY: ScreenDisplayConfig = {
  hasBar: true,
  hasSource: true,
  chevron: true,
  expand: true,
  favDefault: true,
};

/**
 * 自由枠（グループ単位の新画面）のデフォルト表示設定。
 * デザイン未定義のため、旧 tips / tipsGemini 画面相当（バー・ブランド列なし）を割り当てる
 * （判断に迷った場合のデフォルト。phase-implementer への指示に基づく）。
 */
export const FREE_SCREEN_DISPLAY: ScreenDisplayConfig = {
  hasSource: true,
  chevron: true,
  expand: true,
};

export function getDisplayConfig(screen: ScreenConfig): ScreenDisplayConfig {
  if (screen.special === 'top5') return TOP5_DISPLAY;
  if (screen.special === 'fav') return FAV_DISPLAY;
  return FREE_SCREEN_DISPLAY;
}
