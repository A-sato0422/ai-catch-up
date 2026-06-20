import { createClient } from '@supabase/supabase-js';

// anon key + RLS で読み取り。service_role key はここでは使わない（CLAUDE.md §5）
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
