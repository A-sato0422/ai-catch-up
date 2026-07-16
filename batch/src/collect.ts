import './env.js';
import { fileURLToPath } from 'url';
import { sourceConfigs } from './sources/index.js';
import { createLLMProvider } from './llm/index.js';
import { normalizeUrl } from './lib/normalizeUrl.js';
import { upsertArticle } from './lib/upsert.js';
import { supabase } from './lib/supabase.js';
import { getJstDateString } from './lib/jstDate.js';
import { selectTopTopics, saveTopTopics } from './lib/topTopics.js';
import type { RawArticle } from './types.js';

// 重要トピックの選定ウィンドウ（直近24時間。D-023）
const TOPIC_WINDOW_MS = 24 * 60 * 60 * 1000;

async function fetchExistingUrls(urls: string[]): Promise<Set<string>> {
  if (urls.length === 0) return new Set();
  const { data, error } = await supabase.from('articles').select('url').in('url', urls);
  if (error) throw new Error(`DB url check failed: ${error.message}`);
  return new Set((data ?? []).map((r: { url: string }) => r.url));
}

export async function collect(backfillDays = 1): Promise<void> {
  const llm = createLLMProvider();
  const llmProviderName = process.env.LLM_PROVIDER ?? 'gemini';
  const rawArticles: RawArticle[] = [];

  // ソース（クエリ）ごとに fetch（fail-soft: 1 ソースの失敗で全体を止めない。CLAUDE.md §4）
  // クエリ単位の dailyLimit カットは、URL 正規化・重複排除・backfill・DB 既存チェックより前に行う
  // （生データに対してクエリ単位の上限を適用する趣旨のため。SPEC_EXPANSION §5.2 / D-031）。
  for (const config of sourceConfigs) {
    try {
      const articles = await config.adapter.fetch();
      const sorted = [...articles].sort(
        config.rank ?? ((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      );
      const kept = sorted.slice(0, config.dailyLimit);
      const cut = articles.length - kept.length;
      console.log(
        `[${config.adapter.id}] fetched ${articles.length}, cut to dailyLimit ${config.dailyLimit} (${cut} cut)`
      );
      rawArticles.push(...kept);
    } catch (err) {
      console.error(`[${config.adapter.id}] fetch failed:`, err);
    }
  }

  // URL 正規化 + バッチ内の重複排除（同一 URL が複数ソースから来る場合に対応）
  const seen = new Set<string>();
  const normalized = rawArticles
    .map(a => ({ ...a, url: normalizeUrl(a.url) }))
    .filter(a => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

  // 初回バックフィル対策: 指定日数より古い記事を除外（SPEC §6.5）
  const afterCutoff = backfillDays > 0
    ? normalized.filter(a => {
        const cutoff = Date.now() - backfillDays * 86_400_000;
        return new Date(a.publishedAt).getTime() >= cutoff;
      })
    : normalized;

  // DB に既存の URL を問い合わせ → 新規記事のみ enrich + upsert
  const existingUrls = await fetchExistingUrls(afterCutoff.map(a => a.url));
  const newArticles = afterCutoff.filter(a => !existingUrls.has(a.url));
  console.log(`new: ${newArticles.length} / total: ${afterCutoff.length} (skipped: ${existingUrls.size})`);

  let ok = 0;
  let ng = 0;
  for (const article of newArticles) {
    try {
      const enrichment = await llm.enrich(article);
      // product は LLM の内容判定を優先（D-037）。取得クエリ由来の値はタグ付けが著者任せで誤爆しうるため
      // ヒント扱いとし、LLM 出力の欠損・不正時のみフォールバックする
      const product = enrichment.product ?? article.product;
      if (product !== article.product) {
        console.log(`[collect] product reclassified: ${article.product} -> ${product} (${article.url})`);
      }
      await upsertArticle({ ...article, ...enrichment, product, llmProvider: llmProviderName });
      ok++;
    } catch (err) {
      // 1 記事の失敗で全体を止めない（fail-soft）
      console.error(`[collect] failed for "${article.url}":`, err);
      ng++;
    }
  }

  console.log(`collect done: ok=${ok} ng=${ng}`);

  // 重要トピックの選定はここ（enrich 完了直後）で 1 回だけ行い、daily_topics へスナップショット保存する。
  // 画面・一言サマリー・Slack 通知が各自ウィンドウを再計算すると起点時刻がずれて内容が食い違うため、
  // 起点時刻を 1 つに固定するのが狙い（D-038）。失敗しても収集結果自体は保存済みなので fail-soft。
  try {
    const windowStart = new Date(Date.now() - TOPIC_WINDOW_MS).toISOString();
    const topics = await selectTopTopics(windowStart);
    await saveTopTopics(getJstDateString(), topics);
    console.log(`[collect] snapshotted ${topics.length} top topic(s) to daily_topics`);
  } catch (err) {
    console.error('[collect] top topics snapshot failed:', err);
  }
}

// tsx で直接実行されたときのみ起動（import されたときは起動しない）
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const backfillDays = parseInt(process.env.BACKFILL_DAYS ?? '0', 10);
  collect(backfillDays).catch(err => {
    console.error('[collect] fatal:', err);
    process.exit(1);
  });
}
