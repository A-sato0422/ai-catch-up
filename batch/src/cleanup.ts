import './env.js';
import { fileURLToPath } from 'url';
import { supabase } from './lib/supabase.js';

const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS ?? '30', 10);

export async function cleanup(retentionDays = RETENTION_DAYS): Promise<void> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();

  const { error, count } = await supabase
    .from('articles')
    .delete({ count: 'exact' })
    .eq('is_favorite', false)
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
