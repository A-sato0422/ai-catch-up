-- 機能拡張フェーズ L: 重要トピックのスナップショット化（D-038 / SPEC.md §5.3 §6.4）
-- 「直近24時間」ウィンドウの起点がバッチ（毎朝5時）と画面（閲覧時刻）で異なり内容が食い違うため、
-- 選定を collect バッチで 1 回だけ行い、結果を daily_topics へ保存する。
-- 画面（useArticles）・一言サマリー（summarize.ts）・Slack 通知（notify.ts）は保存結果を読むだけにする。

create table daily_topics (
  date        date not null,          -- JST の日付（バッチ実行日）
  position    int  not null,          -- グループ定義順（0〜4）
  group_label text not null,          -- カード見出し/通知に出すグループ名
  article_id  uuid not null references articles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (date, position)
);

-- cleanup の 30 日ローテーション（articles の物理削除）には FK の on delete cascade で追従するため、
-- daily_topics 専用の掃除処理は不要。

alter table daily_topics enable row level security;

-- anon: 読み取り許可（フロントの重要トピック表示用）
create policy "anon can read daily_topics"
  on daily_topics for select
  to anon
  using (true);

-- service_role はデフォルトで RLS をバイパスするが、003 の daily_summaries に倣い明示的に GRANT しておく
GRANT ALL ON TABLE public.daily_topics TO service_role;
GRANT SELECT ON TABLE public.daily_topics TO anon;
GRANT ALL ON TABLE public.daily_topics TO authenticated;
