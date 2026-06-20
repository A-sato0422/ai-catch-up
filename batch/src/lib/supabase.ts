import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// service_role key はバッチ専用。フロントには絶対に出さない（CLAUDE.md §5）
export const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_KEY ?? ''
);
