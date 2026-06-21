import './env.js';
import { fileURLToPath } from 'url';
import { sources } from './sources/index.js';
import { createLLMProvider } from './llm/index.js';
import { normalizeUrl } from './lib/normalizeUrl.js';
import { upsertArticle } from './lib/upsert.js';
import { supabase } from './lib/supabase.js';
import type { RawArticle } from './types.js';

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

  // ソースごとに fetch（fail-soft: 1 ソースの失敗で全体を止めない。CLAUDE.md §4）
  for (const source of sources) {
    try {
      const articles = await source.fetch();
      console.log(`[${source.id}] fetched ${articles.length}`);
      rawArticles.push(...articles);
    } catch (err) {
      console.error(`[${source.id}] fetch failed:`, err);
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
      await upsertArticle({ ...article, ...enrichment, llmProvider: llmProviderName });
      ok++;
    } catch (err) {
      // 1 記事の失敗で全体を止めない（fail-soft）
      console.error(`[collect] failed for "${article.url}":`, err);
      ng++;
    }
  }

  console.log(`collect done: ok=${ok} ng=${ng}`);
}

// tsx で直接実行されたときのみ起動（import されたときは起動しない）
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const backfillDays = parseInt(process.env.BACKFILL_DAYS ?? '0', 10);
  collect(backfillDays).catch(err => {
    console.error('[collect] fatal:', err);
    process.exit(1);
  });
}
