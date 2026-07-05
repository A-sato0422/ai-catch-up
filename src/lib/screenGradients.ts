import type { ScreenIconKind } from '../types';

/**
 * 固定枠 2 種（top5/fav）+ グループ 5 種のボタングラデーション。
 * 固定枠は既存デザイン（炎=オレンジ系 / ハート=ピンク系）を維持。グループ側は各グループの
 * GroupIconSvg 配色（gemini 青 / claude 橙 / codex 緑 / office 緑 / exec 紫）に寄せた新規グラデーション
 * を割り当てた（具体的な配色は SPEC_EXPANSION に指定が無いための実装判断。G-1）。
 *
 * コンポーネントファイル（ScreenIcon.tsx）に置くと react-refresh/only-export-components に
 * 抵触するため、定数・純関数はこちらへ分離した。
 */
const SCREEN_GRADIENTS: Record<ScreenIconKind, readonly [string, string]> = {
  top5: ['#ff8a45', '#ff4d28'],
  fav: ['#f43f5e', '#ec4899'],
  gemini: ['#4285f4', '#0ea5e9'],
  claude: ['#f97316', '#c2410c'],
  codex: ['#10b981', '#0d9488'],
  office: ['#34d399', '#059669'],
  exec: ['#a78bfa', '#7c3aed'],
};

export function getScreenGradient(kind: ScreenIconKind): readonly [string, string] {
  return SCREEN_GRADIENTS[kind];
}
