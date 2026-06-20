import type { LLMProvider, RawArticle, Enrichment } from '../types.js';

// 将来 Claude API に差し替えるためのスタブ（CLAUDE.md §3.2）
// LLM_PROVIDER=claude で切り替え可能にしておく
export class ClaudeProvider implements LLMProvider {
  async enrich(_article: RawArticle): Promise<Enrichment> {
    throw new Error('ClaudeProvider is not yet implemented');
  }
}
