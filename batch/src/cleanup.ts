import './env.js';
import { fileURLToPath } from 'url';
import { supabase } from './lib/supabase.js';

const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS ?? '30', 10);

export async function cleanup(retentionDays = RETENTION_DAYS): Promise<void> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();

  // お気に入りは localStorage 管理に移行したため is_favorite は参照しない（SPEC_EXPANSION §9 / D-027）。
  // published_at が retentionDays を超えた記事は無条件で全削除する。
  const { error, count } = await supabase
    .from('articles')
    .delete({ count: 'exact' })
    .lt('published_at', cutoff);

  if (error) throw new Error(`cleanup failed: ${error.message}`);
  console.log(`cleanup done: deleted ${count ?? 0} articles (older than ${retentionDays} days)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cleanup().catch(err => {
    console.error('[cleanup] fatal:', err);
    process.exit(1);
  });
}
