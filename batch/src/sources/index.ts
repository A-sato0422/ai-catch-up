// ソースアダプタ登録配列（SPEC §3 / CLAUDE.md §3.1）
// 新ソース追加 = アダプタ実装 + ここに 1 行追加（既存コード変更なし）
import type { SourceAdapter } from '../types.js';
import { githubReleasesClaudeCode, githubReleasesGeminiCli } from './githubReleases.js';
import { qiitaClaudeCode, qiitaGemini } from './qiita.js';
import { zennClaudeCode, zennGemini } from './zenn.js';
import { hatenaClaudeCode, hatenaGemini } from './hatena.js';
import { deepmindBlog } from './deepmind.js';
import { googleDevBlog } from './googleDevBlog.js';
import { anthropicNews } from './anthropicNews.js';

export const sources: SourceAdapter[] = [
  githubReleasesClaudeCode,
  githubReleasesGeminiCli,
  qiitaClaudeCode,
  qiitaGemini,
  zennClaudeCode,
  zennGemini,
  hatenaClaudeCode,
  hatenaGemini,
  deepmindBlog,
  googleDevBlog,
  anthropicNews,
];
