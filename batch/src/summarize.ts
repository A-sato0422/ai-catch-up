// フェーズ E: 一言サマリー（吹き出し）生成（SPEC_EXPANSION §3.2 / §7.5, D-032）
//
// 当日の重要トピック（ボタン5グループ別の当日最重要記事1件ずつ。src/hooks/useArticles.ts と同じ選定。
// lib/topTopics.ts）のタイトル + 要約を 1 コールで LLM に渡し、ホーム画面のロボット吹き出し用の
// 一言サマリーを生成して daily_summaries へ date（JST）で upsert する。
//
// 既存の LLMProvider 抽象化（llm/index.ts）は「1 記事 1 コール」の enrich() 用に設計されており、
// 本ファイルの「複数記事 → 1 サマリー」という別種の呼び出しには使い回さず、
// GoogleGenerativeAI を直接叩く（llm/gemini.ts の実装パターンを参考にしつつ、このファイル内で完結させる）。
import './env.js';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './lib/supabase.js';
import { selectTopTopics, type TopTopicRow } from './lib/topTopics.js';

// モデルは env で上書き可能（llm/gemini.ts と同じパターン。SPEC_EXPANSION §2）
const MODEL_NAME = process.env.GEMINI_PRIMARY_MODEL ?? 'gemini-3.1-flash-lite';

// 対象期間は D-023 のローリング24時間ウィンドウ（src/hooks/useArticles.ts / notify.ts と同じ定義）
const TOPIC_WINDOW_MS = 24 * 60 * 60 * 1000;

// 記事0件の日 / LLM 失敗時のフォールバック文言（SPEC_EXPANSION §7.5 の例文をそのまま採用）
const FALLBACK_SUMMARY = '今日はまだ情報を集めてるよ。';

async function fetchTopTopics(): Promise<TopTopicRow[]> {
  const windowStart = new Date(Date.now() - TOPIC_WINDOW_MS).toISOString();
  return selectTopTopics(windowStart);
}

function buildPrompt(articles: TopTopicRow[]): string {
  const list = articles
    .map((a, i) => `${i + 1}. [${a.groupLabel}] ${a.title}\n${a.summary_ja ?? ''}`)
    .join('\n\n');

  return `以下は今日の重要トピック（分野別のピックアップ）のタイトルと要約です。これらを踏まえて、ホーム画面のロボットキャラクターが話す一言サマリーを日本語で作成してください。

出力条件:
- 3 行以内
- 口語・親しみやすいトーン（例:「今日はClaude Codeに破壊的変更があったよ。要チェック！」）
- 前後の説明・見出し・コードフェンス等は不要。サマリー本文のみをプレーンテキストで出力

TOP5:
${list}`;
}

async function generateSummary(articles: TopTopicRow[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const genai = new GoogleGenerativeAI(apiKey);
  const model = genai.getGenerativeModel({ model: MODEL_NAME });
  const result = await model.generateContent(buildPrompt(articles));
  const text = result.response.text().trim();
  if (!text) throw new Error('empty response from LLM');
  return text;
}

// GitHub Actions の実行環境は UTC のため、JST (UTC+9) に変換してから日付部分を取り出す
function getJstDateString(now = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function upsertSummary(date: string, summaryJa: string): Promise<void> {
  const { error } = await supabase
    .from('daily_summaries')
    .upsert({ date, summary_ja: summaryJa }, { onConflict: 'date' });

  if (error) throw new Error(`upsert daily_summaries failed: ${error.message}`);
}

// summarize() 自体が collect 全体を止めないよう、DB/LLM の失敗はすべてここで握りつぶし
// フォールバック文言の upsert を試みる（CLAUDE.md §4: fail-soft）。
async function upsertSummaryFailSoft(date: string, summaryJa: string): Promise<void> {
  try {
    await upsertSummary(date, summaryJa);
    console.log(`[summarize] upserted daily_summaries for ${date}`);
  } catch (err) {
    console.error('[summarize] upsert failed:', err);
  }
}

export async function summarize(): Promise<void> {
  const date = getJstDateString();

  let topics: TopTopicRow[] = [];
  try {
    topics = await fetchTopTopics();
  } catch (err) {
    console.error('[summarize] fetch top topics failed:', err);
    await upsertSummaryFailSoft(date, FALLBACK_SUMMARY);
    return;
  }

  if (topics.length === 0) {
    // 記事0件の日は LLM 呼び出し自体をスキップし、定型文をそのまま保存する（SPEC_EXPANSION §7.5）
    console.log('[summarize] no articles in the last 24h, using fallback text');
    await upsertSummaryFailSoft(date, FALLBACK_SUMMARY);
    return;
  }

  let summaryJa = FALLBACK_SUMMARY;
  try {
    summaryJa = await generateSummary(topics);
  } catch (err) {
    // LLM 生成の失敗はフェイルソフトでフォールバック文言に切り替え、collect 全体を止めない
    console.error('[summarize] LLM generation failed, falling back:', err);
  }

  await upsertSummaryFailSoft(date, summaryJa);
}

// tsx で直接実行されたときのみ起動（import されたときは起動しない）
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  summarize().catch(err => {
    console.error('[summarize] fatal:', err);
    process.exit(1);
  });
}
