// LLM_PROVIDER 環境変数でプロバイダを切替（CLAUDE.md §3.2）
import 'dotenv/config';
import type { LLMProvider } from '../types.js';
import { GeminiProvider } from './gemini.js';
import { ClaudeProvider } from './claude.js';

export function createLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER ?? 'gemini';
  if (provider === 'gemini') return new GeminiProvider();
  if (provider === 'claude') return new ClaudeProvider();
  throw new Error(`Unknown LLM_PROVIDER: "${provider}". Use "gemini" or "claude".`);
}
