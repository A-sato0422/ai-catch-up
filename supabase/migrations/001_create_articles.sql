-- articles テーブル（SPEC §5.1）
create table articles (
  id               uuid        primary key default gen_random_uuid(),
  url              text        not null,
  source           text        not null,
  external_id      text,
  product          text        not null,   -- 'claude_code' | 'gemini' | 'other'
  title            text        not null,
  excerpt          text,
  summary_ja       text,
  category         text,                   -- 'update' | 'tips'
  importance_score int,                    -- 1〜10
  author           text,
  published_at     timestamptz not null,
  fetched_at       timestamptz not null default now(),
  is_favorite      boolean     not null default false,
  llm_provider     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint articles_url_unique unique (url),
  constraint articles_product_check check (product in ('claude_code', 'gemini', 'other')),
  constraint articles_category_check check (category is null or category in ('update', 'tips')),
  constraint articles_importance_score_check check (importance_score is null or (importance_score >= 1 and importance_score <= 10))
);

-- インデックス（SPEC §5.2）
create index articles_published_at_idx on articles (published_at desc);
create index articles_product_category_idx on articles (product, category);
create index articles_importance_score_idx on articles (importance_score desc);

-- updated_at を自動更新するトリガー
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger articles_set_updated_at
  before update on articles
  for each row execute function set_updated_at();

-- RLS 有効化
alter table articles enable row level security;

-- anon: 読み取り許可（フロント用）
create policy "anon can read articles"
  on articles for select
  to anon
  using (true);

-- anon: お気に入りトグル（is_favorite のみ更新許可）
-- フロントが anon key で★をトグルするため
create policy "anon can toggle favorite"
  on articles for update
  to anon
  using (true)
  with check (true);

-- service_role はデフォルトで RLS をバイパス（バッチ用・追加ポリシー不要）
