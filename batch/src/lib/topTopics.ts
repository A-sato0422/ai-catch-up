// 重要トピックの選定（フロント src/hooks/useArticles.ts と同じ思想）。
//
// ホームのボタン5グループ（Gemini / Claude Code / Codex / バックオフィス / 経営者向け）それぞれの
// 当日（直近24時間）最重要記事を1件ずつ選ぶ。全ユーザー一律で、画面・一言要約（summarize.ts）・
// Slack 通知（notify.ts）が同じ記事集合を指すようにするための共通セレクタ。
//
// グループ定義の唯一の情報源はフロントの `src/lib/buttonSettings.ts`（SETTINGS_GROUPS + 各マッピング）。
// batch/src は src/ を import できない（別パッケージ）ため、ここに同じ定義を複製している。
// buttonSettings.ts 側のグループ構成を変更したら本ファイルも合わせて更新すること。
import { supabase } from './supabase.js';
import type { Product, Audience, Category } from '../types.js';

export interface TopTopicRow {
  groupLabel: string; // カード先頭バッジ / 通知に出すグループ名（例「Claude Code」）
  title: string;
  url: string;
  summary_ja: string | null;
  importance_score: number | null;
  importance_reason: string | null;
}

interface GroupTopicDef {
  label: string;
  filter: { product?: Product; audience: Audience; category?: Category[] };
}

// buttonSettings.ts の SETTINGS_GROUPS / ENGINEER_PRODUCT / AUDIENCE_BY_GROUP / CATEGORY_BY_ID に対応。
// difficulty はエンジニア系グループの本来のフィルタに含まれるが、未 enrich（difficulty=null）の記事も
// 拾えるよう選定では無視する（product / audience / category のみで絞る）。
const GROUP_TOPIC_DEFS: GroupTopicDef[] = [
  { label: 'Gemini', filter: { product: 'gemini', audience: 'engineer' } },
  { label: 'Claude Code', filter: { product: 'claude_code', audience: 'engineer' } },
  { label: 'Codex', filter: { product: 'codex', audience: 'engineer' } },
  { label: 'バックオフィス', filter: { audience: 'backoffice', category: ['tips', 'case_study'] } },
  { label: '経営者向け', filter: { audience: 'executive', category: ['business', 'case_study'] } },
];

const TOPIC_COLUMNS = 'title, url, summary_ja, importance_score, importance_reason';

/**
 * グループ別に importance_score 降順・limit 1 で当日最重要記事を1件ずつ取得する。
 * 該当0件のグループは除外し、GROUP_TOPIC_DEFS の順序（＝ホームボタン順）を維持する。最大5件。
 * @param windowStart ISO 8601。この時刻以降に published された記事を対象にする。
 */
export async function selectTopTopics(windowStart: string): Promise<TopTopicRow[]> {
  const results = await Promise.all(
    GROUP_TOPIC_DEFS.map(async (def) => {
      let q = supabase.from('articles').select(TOPIC_COLUMNS).gte('published_at', windowStart);
      if (def.filter.product) q = q.eq('product', def.filter.product);
      q = q.eq('audience', def.filter.audience);
      if (def.filter.category) q = q.in('category', def.filter.category);

      const { data, error } = await q.order('importance_score', { ascending: false }).limit(1);
      if (error) throw new Error(`fetch top topic (${def.label}) failed: ${error.message}`);

      const row = data?.[0];
      if (!row) return null;
      return { groupLabel: def.label, ...(row as Omit<TopTopicRow, 'groupLabel'>) };
    }),
  );

  return results.filter((r): r is TopTopicRow => r !== null);
}
