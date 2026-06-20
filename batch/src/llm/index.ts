// LLM_PROVIDER 環境変数でプロバイダを切替（CLAUDE.md §3.2）
// フェーズ 3 で gemini.ts / claude.ts を実装してここで import する
import type { LLMProvider } from '../types.js';

export function createLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER ?? 'gemini';
  if (provider === 'gemini') {
    // フェーズ 3 で実装
    // const { GeminiProvider } = await import('./gemini.js');
    // return new GeminiProvider();
    throw new Error('GeminiProvider not yet implemented (Phase 3)');
  }
  if (provider === 'claude') {
    throw new Error('ClaudeProvider not yet implemented (Phase 3)');
  }
  throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
}
