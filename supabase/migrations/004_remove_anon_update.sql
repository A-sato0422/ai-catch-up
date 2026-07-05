-- 機能拡張フェーズ G-4: お気に入りの localStorage 化に伴う RLS 修正（SPEC_EXPANSION.md §7.4）
--
-- 001 の "anon can toggle favorite" ポリシー（using (true) with check (true)）と
-- 002 の `GRANT UPDATE ON TABLE public.articles TO anon` は、コメント上は
-- 「is_favorite のみ更新許可」のつもりだったが、RLS ポリシーはカラム単位の制限をかけられないため、
-- 実際には anon key を持つ誰でも articles の任意のカラム（summary_ja・importance_score・category 等）を
-- 書き換えられる状態だった。
--
-- お気に入りが localStorage 管理に完全移行し、フロントからの UPDATE 自体が不要になったため、
-- ここで anon の UPDATE 権限を完全に取り除く（anon は SELECT のみで十分になる）。
-- service_role の GRANT（002）は変更しない。

drop policy if exists "anon can toggle favorite" on articles;
revoke update on table public.articles from anon;
