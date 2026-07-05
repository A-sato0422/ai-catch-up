-- 機能拡張フェーズ A: スキーマ拡張（SPEC_EXPANSION.md §3）
-- articles へのカラム追加・category/product の check 制約更新・daily_summaries テーブル新設

-- 1. articles にカラム追加（SPEC_EXPANSION §3.1）
alter table articles
  add column audience          text,          -- 'engineer' | 'backoffice' | 'executive'（LLM 出力）。nullable
  add column difficulty        int,           -- 1〜3（初級/中級/上級）。nullable
  add column importance_reason text,          -- 重要な理由の短文（10〜15 字）。nullable
  add column tags              text[],        -- トピックタグ 2〜3 個。nullable
  add column popularity        int;           -- ソース固有の人気指標（Qiita ストック数 / はてブ ブクマ数）。nullable

alter table articles
  add constraint articles_audience_check
    check (audience is null or audience in ('engineer', 'backoffice', 'executive')),
  add constraint articles_difficulty_check
    check (difficulty is null or (difficulty >= 1 and difficulty <= 3));

-- 2. category / product の check 制約を拡張（001 の制約を置き換え）
alter table articles drop constraint articles_product_check;
alter table articles add constraint articles_product_check
  check (product in ('claude_code', 'gemini', 'codex', 'other'));

alter table articles drop constraint articles_category_check;
alter table articles add constraint articles_category_check
  check (category is null or category in ('update', 'tips', 'business', 'case_study'));

-- 3. daily_summaries テーブル新設（SPEC_EXPANSION §3.2）
create table daily_summaries (
  date        date primary key,   -- JST の日付
  summary_ja  text not null,      -- ロボット吹き出し用の一言サマリー（3 行以内・口語）
  created_at  timestamptz default now()
);

alter table daily_summaries enable row level security;

-- anon: 読み取り許可（フロントの吹き出し表示用）
create policy "anon can read daily_summaries"
  on daily_summaries for select
  to anon
  using (true);

-- service_role はデフォルトで RLS をバイパスするが、002 に倣い明示的に GRANT しておく
GRANT ALL ON TABLE public.daily_summaries TO service_role;
GRANT SELECT ON TABLE public.daily_summaries TO anon;
GRANT ALL ON TABLE public.daily_summaries TO authenticated;
