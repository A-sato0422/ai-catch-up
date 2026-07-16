// 重要トピックの選定とスナップショット保存（D-038）。
//
// 「直近24時間」ウィンドウの起点がバッチ（毎朝5時）と画面（閲覧時刻）で異なると内容が食い違うため、
// 選定は collect バッチで 1 回だけ行い（selectTopTopics → saveTopTopics）、結果を daily_topics へ保存する。
// 消費者（フロント src/hooks/useArticles.ts・一言サマリー summarize.ts・Slack 通知 notify.ts）は
// 保存済みスナップショットを読むだけ（fetchSavedTopTopics）で、再選定はしない。
//
// グループ定義の唯一の情報源はフロントの `src/lib/buttonSettings.ts`（SETTINGS_GROUPS + 各マッピング）。
// batch/src は src/ を import できない（別パッケージ）ため、ここに同じ定義を複製している。
// buttonSettings.ts 側のグループ構成を変更したら本ファイルも合わせて更新すること。
import { supabase } from './supabase.js';
import type { Product, Audience, Category } from '../types.js';

export interface TopTopicRow {
  articleId: string; // articles.id。daily_topics への保存（FK）に使う
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

const TOPIC_COLUMNS = 'id, title, url, summary_ja, importance_score, importance_reason';

// selectTopTopics / fetchSavedTopTopics が articles から受け取る行の形
interface ArticleRow {
  id: string;
  title: string;
  url: string;
  summary_ja: string | null;
  importance_score: number | null;
  importance_reason: string | null;
}

function toTopTopicRow(groupLabel: string, row: ArticleRow): TopTopicRow {
  return {
    articleId: row.id,
    groupLabel,
    title: row.title,
    url: row.url,
    summary_ja: row.summary_ja,
    importance_score: row.importance_score,
    importance_reason: row.importance_reason,
  };
}

/**
 * グループ別に importance_score 降順・limit 1 で当日最重要記事を1件ずつ取得する。
 * 同点時は published_at 降順で決定化する（SPEC §6.4。実行タイミングによる揺れを防ぐ）。
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

      const { data, error } = await q
        .order('importance_score', { ascending: false, nullsFirst: false })
        .order('published_at', { ascending: false })
        .limit(1);
      if (error) throw new Error(`fetch top topic (${def.label}) failed: ${error.message}`);

      const row = data?.[0];
      if (!row) return null;
      return toTopTopicRow(def.label, row as ArticleRow);
    }),
  );

  return results.filter((r): r is TopTopicRow => r !== null);
}

/**
 * 選定結果を daily_topics へスナップショット保存する（collect バッチから 1 日 1 回呼ばれる）。
 * 0件グループは行を作らないため、upsert では前回実行の残骸が消えない。当日行を delete してから
 * position（グループ定義順）付きで insert する洗い替え方式にする。
 * エラー時は throw（fail-soft の判断は呼び出し側 collect.ts に委ねる）。
 */
export async function saveTopTopics(date: string, topics: TopTopicRow[]): Promise<void> {
  const { error: deleteError } = await supabase.from('daily_topics').delete().eq('date', date);
  if (deleteError) throw new Error(`delete daily_topics (${date}) failed: ${deleteError.message}`);

  if (topics.length === 0) return;

  const rows = topics.map((t, position) => ({
    date,
    position,
    group_label: t.groupLabel,
    article_id: t.articleId,
  }));
  const { error: insertError } = await supabase.from('daily_topics').insert(rows);
  if (insertError) throw new Error(`insert daily_topics (${date}) failed: ${insertError.message}`);
}

// fetchSavedTopTopics が受け取る行の形（articles は FK 埋め込み。多対1なのでオブジェクト）
interface SavedTopicRow {
  position: number;
  group_label: string;
  articles: ArticleRow | null;
}

/**
 * 指定日の daily_topics スナップショットを articles の FK 埋め込み付きで読み出す。
 * summarize.ts / notify.ts から使う（フロントは useArticles が直接同等のクエリを発行する）。
 * エラー時は throw（fail-soft の判断は呼び出し側に委ねる）。
 */
export async function fetchSavedTopTopics(date: string): Promise<TopTopicRow[]> {
  const { data, error } = await supabase
    .from('daily_topics')
    .select('position, group_label, articles(id, title, url, summary_ja, importance_score, importance_reason)')
    .eq('date', date)
    .order('position');
  if (error) throw new Error(`fetch daily_topics (${date}) failed: ${error.message}`);

  return ((data ?? []) as unknown as SavedTopicRow[])
    // 埋め込み articles が null になるのは FK cascade（記事削除）直後の異常系のみ。行ごとスキップする
    .filter((row): row is SavedTopicRow & { articles: ArticleRow } => row.articles !== null)
    .map((row) => toTopTopicRow(row.group_label, row.articles));
}
