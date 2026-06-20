import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./gemini.js', () => ({ GeminiProvider: class { id = 'gemini' } }));
vi.mock('./claude.js', () => ({ ClaudeProvider: class { id = 'claude' } }));

import { createLLMProvider } from './index.js';

describe('createLLMProvider', () => {
  const original = process.env.LLM_PROVIDER;

  beforeEach(() => { process.env.GEMINI_API_KEY = 'test-key'; });
  afterEach(() => {
    process.env.LLM_PROVIDER = original;
    delete process.env.GEMINI_API_KEY;
  });

  it('LLM_PROVIDER 未設定のとき GeminiProvider を返す', () => {
    delete process.env.LLM_PROVIDER;
    const p = createLLMProvider() as unknown as { id: string };
    expect(p.id).toBe('gemini');
  });

  it('LLM_PROVIDER=gemini のとき GeminiProvider を返す', () => {
    process.env.LLM_PROVIDER = 'gemini';
    const p = createLLMProvider() as unknown as { id: string };
    expect(p.id).toBe('gemini');
  });

  it('LLM_PROVIDER=claude のとき ClaudeProvider を返す', () => {
    process.env.LLM_PROVIDER = 'claude';
    const p = createLLMProvider() as unknown as { id: string };
    expect(p.id).toBe('claude');
  });

  it('未知の LLM_PROVIDER は Error をスローする', () => {
    process.env.LLM_PROVIDER = 'openai';
    expect(() => createLLMProvider()).toThrow('openai');
  });
});
