import type { ScreenIconKind } from '../types';

/**
 * 固定枠 2 種（top5/fav）+ グループ 5 種のボタングラデーション。
 * ユーザー指定の配色（top5 赤 / gemini 青 / claude 橙 / codex 緑 / office 黄 / exec 紫 / fav ピンク）を割り当てる。
 *
 * コンポーネントファイル（ScreenIcon.tsx）に置くと react-refresh/only-export-components に
 * 抵触するため、定数・純関数はこちらへ分離した。
 */
const SCREEN_GRADIENTS: Record<ScreenIconKind, readonly [string, string]> = {
  top5: ['#ef4444', '#dc2626'],
  fav: ['#ec4899', '#db2777'],
  gemini: ['#4285f4', '#0ea5e9'],
  claude: ['#f97316', '#c2410c'],
  codex: ['#10b981', '#0d9488'],
  office: ['#fbbf24', '#f59e0b'],
  exec: ['#a78bfa', '#7c3aed'],
};

export function getScreenGradient(kind: ScreenIconKind): readonly [string, string] {
  return SCREEN_GRADIENTS[kind];
}
