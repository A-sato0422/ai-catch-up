// ソースアダプタ登録配列（SPEC §3 / CLAUDE.md §3.1 / SPEC_EXPANSION §5.2）
// 新ソース追加 = アダプタ実装 + ここに 1 行追加（既存コード変更なし）
// 上限管理の単位はアダプタではなく「取得クエリ」。dailyLimit / rank はここに集約する。
import type { RawArticle, SourceConfig } from '../types.js';
import { githubReleasesClaudeCode, githubReleasesGeminiCli, githubReleasesCodex } from './githubReleases.js';
import { qiitaClaudeCode, qiitaGemini, qiitaCodex } from './qiita.js';
import { zennClaudeCode, zennGemini, zennCodex } from './zenn.js';
import { hatenaClaudeCode, hatenaGemini, hatenaAiAdoption, hatenaAiBusiness } from './hatena.js';
import { deepmindBlog } from './deepmind.js';
import { googleDevBlog } from './googleDevBlog.js';
import { anthropicNews } from './anthropicNews.js';
import { itmediaAiPlus } from './itmedia.js';

// popularity（Qiita ストック数 / はてブ ブクマ数）降順の選抜順。未指定フィールドは 0 扱い。
const byPopularityDesc = (a: RawArticle, b: RawArticle): number => (b.popularity ?? 0) - (a.popularity ?? 0);

export const sourceConfigs: SourceConfig[] = [
  { adapter: githubReleasesClaudeCode, dailyLimit: 5 },
  { adapter: githubReleasesGeminiCli, dailyLimit: 5 },
  { adapter: githubReleasesCodex, dailyLimit: 5 },
  { adapter: qiitaClaudeCode, dailyLimit: 25, rank: byPopularityDesc },
  { adapter: qiitaGemini, dailyLimit: 25, rank: byPopularityDesc },
  { adapter: qiitaCodex, dailyLimit: 25, rank: byPopularityDesc },
  { adapter: zennClaudeCode, dailyLimit: 20 },
  { adapter: zennGemini, dailyLimit: 20 },
  { adapter: zennCodex, dailyLimit: 20 },
  { adapter: hatenaClaudeCode, dailyLimit: 15, rank: byPopularityDesc },
  // hatenaGemini は SPEC_EXPANSION §5.2 の表に明記なし（新規クエリにフォーカスした表のため既存クエリが抜けていると判断）。
  // 対称の hatenaClaudeCode と同様に扱う（dailyLimit=15・ブクマ数降順）。詳細は完了報告を参照。
  { adapter: hatenaGemini, dailyLimit: 15, rank: byPopularityDesc },
  { adapter: hatenaAiAdoption, dailyLimit: 25, rank: byPopularityDesc },
  { adapter: hatenaAiBusiness, dailyLimit: 25, rank: byPopularityDesc },
  { adapter: deepmindBlog, dailyLimit: 5 },
  { adapter: googleDevBlog, dailyLimit: 5 },
  { adapter: anthropicNews, dailyLimit: 5 },
  { adapter: itmediaAiPlus, dailyLimit: 15 },
];
