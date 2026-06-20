-- バッチ（service_role）と フロント（anon）に明示的にアクセス権限を付与
-- Supabase の ALTER DEFAULT PRIVILEGES がテーブル作成後に適用されない場合に必要
GRANT ALL ON TABLE public.articles TO service_role;
GRANT SELECT, UPDATE ON TABLE public.articles TO anon;
GRANT ALL ON TABLE public.articles TO authenticated;
