// JST 日付ユーティリティ（フェーズ L で summarize.ts / notify.ts の重複実装をここへ集約。D-038）。
// daily_summaries / daily_topics の date キーはすべてこの関数で揃える。

/**
 * GitHub Actions の実行環境は UTC のため、JST (UTC+9) に変換してから日付部分を取り出す。
 */
export function getJstDateString(now = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
