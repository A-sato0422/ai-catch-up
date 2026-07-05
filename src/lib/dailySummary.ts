// ホーム吹き出しの動的化（G-5. SPEC_EXPANSION §3.2 / §7.5, D-032）。
// `daily_summaries` テーブルの当日行（JST基準）を取得してロボット吹き出しに表示する。
// フロントとバッチは疎結合（CLAUDE.md）のため、JST日付算出ロジックは
// batch/src/summarize.ts の getJstDateString と同等のものをここに重複実装する。
import { supabase } from './supabase';

// 当日行が無い場合（バッチ未実行・データ無し・取得失敗）のフォールバック文言。
// batch/src/summarize.ts の FALLBACK_SUMMARY と同じ文言を採用する（SPEC_EXPANSION §7.5）。
export const FALLBACK_SUMMARY = '今日はまだ情報を集めてるよ。';

/**
 * UTC の現在時刻を JST (UTC+9) に変換して 'YYYY-MM-DD' を取り出す。
 * batch/src/summarize.ts の getJstDateString と同じロジック（重複実装。フロント/バッチ疎結合のため許容）。
 */
export function getJstDateString(now: Date = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * `daily_summaries` の当日行（JST基準）から一言サマリーを取得する。
 * 当日行が無い場合・取得失敗時はフォールバック文言を返す（fail-soft。CLAUDE.md §4）。
 */
export async function fetchDailySummary(): Promise<string> {
  try {
    const date = getJstDateString();
    const { data, error } = await supabase
      .from('daily_summaries')
      .select('summary_ja')
      .eq('date', date)
      .maybeSingle();

    if (error || !data?.summary_ja) return FALLBACK_SUMMARY;
    return data.summary_ja as string;
  } catch (err) {
    console.error('[dailySummary] fetch failed:', err);
    return FALLBACK_SUMMARY;
  }
}
