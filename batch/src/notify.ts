// フェーズ F: Slack 通知（SPEC_EXPANSION §8）
//
// 当日の重要トピックは collect バッチが daily_topics へ確定保存したスナップショットを読む（D-038。
// 画面 src/hooks/useArticles.ts・一言サマリー summarize.ts と必ず同じ記事集合になる）。
// daily_summaries の当日行（summary_ja）と合わせて Slack Incoming Webhook へ
// Block Kit 形式で 1 日 1 投稿する。LLM コールは行わない（既存の summary_ja を流用するのみ）。
//
// fail-soft（CLAUDE.md §4 / TASK_EXPANSION フェーズ F）:
// SLACK_WEBHOOK_URL 未設定・Supabase 取得失敗・Webhook POST 失敗のいずれでも
// エラーログを出して正常終了し、collect ジョブ全体を落とさない。
import './env.js';
import { fileURLToPath } from 'url';
import { supabase } from './lib/supabase.js';
import { getJstDateString } from './lib/jstDate.js';
import { fetchSavedTopTopics, type TopTopicRow } from './lib/topTopics.js';

// daily_summaries の当日行が無い場合のフォールバック文言。
// フロント側 src/lib/dailySummary.ts の FALLBACK_SUMMARY と同一文言（SPEC_EXPANSION §7.5）
export const FALLBACK_SUMMARY = '今日はまだ情報を集めてるよ。';

// 記事 0 件の日の本文。フロントの空状態と同じく「バグではなく今日は静かだった」と伝わる表現にする
const EMPTY_DAY_TEXT = '今日はAI界隈が静かな一日だったみたい。また明日チェックしてね。';

// daily_summaries の当日行を取得。行が無い・取得失敗時はフォールバック文言に倒す（fail-soft）
async function fetchDailySummary(date: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('daily_summaries')
      .select('summary_ja')
      .eq('date', date)
      .maybeSingle();

    if (error || !data?.summary_ja) {
      if (error) console.error('[notify] fetch daily_summaries failed:', error.message);
      return FALLBACK_SUMMARY;
    }
    return data.summary_ja as string;
  } catch (err) {
    console.error('[notify] fetch daily_summaries failed:', err);
    return FALLBACK_SUMMARY;
  }
}

// Slack mrkdwn の予約文字をエスケープする（Slack 公式仕様では & < > の 3 文字のみ）
export function escapeSlackText(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

// Block Kit の型は使う範囲だけ最小定義する（@slack/types への依存を増やさない）
interface SlackBlock {
  type: string;
  text?: { type: 'plain_text' | 'mrkdwn'; text: string; emoji?: boolean };
}

export interface SlackPayload {
  blocks: SlackBlock[];
}

function buildArticleBlock(article: TopTopicRow, index: number): SlackBlock {
  const title = escapeSlackText(article.title);
  // 先頭にグループ名を出す（画面カードのグループ名バッジと同じ体裁）
  const lines = [`*${index + 1}. [${escapeSlackText(article.groupLabel)}] <${article.url}|${title}>*`];

  // 重要度と理由は 1 行にまとめる（カード表示「重要度 9 ｜ 破壊的変更」と同じ体裁。§7.6）
  if (article.importance_score != null) {
    const reason = article.importance_reason
      ? ` ｜ ${escapeSlackText(article.importance_reason)}`
      : '';
    lines.push(`重要度 ${article.importance_score}${reason}`);
  }
  if (article.summary_ja) {
    lines.push(escapeSlackText(article.summary_ja));
  }

  return { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } };
}

// 冒頭にサマリー（吹き出しと同じ文言）、続けて TOP5 の各記事（タイトルをリンクに）
export function buildSlackPayload(
  date: string,
  summaryJa: string,
  articles: TopTopicRow[]
): SlackPayload {
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `AI Catchup 今日のまとめ（${date}）`, emoji: true },
    },
    { type: 'section', text: { type: 'mrkdwn', text: escapeSlackText(summaryJa) } },
    { type: 'divider' },
  ];

  if (articles.length === 0) {
    // 記事 0 件の日も投稿自体は行う（無通知だと「バッチが落ちた」と区別できないため）
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: EMPTY_DAY_TEXT } });
  } else {
    for (const [i, article] of articles.entries()) {
      blocks.push(buildArticleBlock(article, i));
    }
  }

  return { blocks };
}

async function postToSlack(webhookUrl: string, payload: SlackPayload): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Webhook はエラー理由を本文で返す（invalid_blocks 等）ためログに含める
    const body = await res.text().catch(() => '');
    throw new Error(`Slack webhook returned ${res.status}: ${body}`);
  }
}

// notify() 自体が collect 全体を止めないよう、失敗はすべてここで握りつぶす（fail-soft）
export async function notify(): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('[notify] SLACK_WEBHOOK_URL is not set, skipping notification');
    return;
  }

  const date = getJstDateString();

  let topics: TopTopicRow[];
  try {
    topics = await fetchSavedTopTopics(date);
  } catch (err) {
    // トピックが取れない状態で「記事 0 件」と誤解される投稿はしない。ログのみ残して終了する
    console.error('[notify] fetch top topics failed, skipping notification:', err);
    return;
  }

  const summaryJa = await fetchDailySummary(date);
  const payload = buildSlackPayload(date, summaryJa, topics);

  try {
    await postToSlack(webhookUrl, payload);
    console.log(`[notify] posted ${topics.length} article(s) to Slack for ${date}`);
  } catch (err) {
    console.error('[notify] Slack post failed:', err);
  }
}

// tsx で直接実行されたときのみ起動（import されたときは起動しない）
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  notify().catch(err => {
    // fail-soft: 想定外の例外でも exit code 0 で終了し、collect ジョブを落とさない
    console.error('[notify] fatal:', err);
  });
}
