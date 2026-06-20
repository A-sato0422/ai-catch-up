import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, RawArticle, Enrichment, Category } from '../types.js';
import { delay } from '../lib/delay.js';

// モデルは env で上書き可能（SPEC §6.5）
const FLASH_MODEL = process.env.GEMINI_FLASH_MODEL ?? 'gemini-2.0-flash';
const FLASH_LITE_MODEL = process.env.GEMINI_FLASH_LITE_MODEL ?? 'gemini-2.0-flash-lite';

const FLASH_RPD = 250;       // Flash の無料枠上限（1日）
const FLASH_INTERVAL_MS = 6000; // Flash の RPM 制御: 10 RPM = 約 6 秒間隔
const EXCERPT_MAX = 3000;    // LLM に渡す本文の上限（SPEC §6.1）

function buildPrompt(title: string, excerpt: string): string {
  return `以下の技術記事を分析し、JSONのみで回答してください（前後の説明・コードフェンス不要）。

タイトル: ${title}
本文抜粋: ${excerpt}

出力形式（厳密なJSON）:
{"summary_ja":"日本語3行程度の要約","category":"update または tips","importance_score":1から10の整数}

分類ルール:
- update: 新機能・リリース・アップデート・仕様変更などプロダクト自体の変化
- tips: 使い方・活用術・ハマりどころ・事例など

重要度の目安: 10=破壊的変更/メジャーリリース, 7-8=重要な新機能, 4-6=通常アップデート/Tips, 1-3=ニッチな小ネタ`;
}

function parseEnrichment(text: string): Enrichment {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no JSON object found');
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const category: Category = parsed['category'] === 'update' ? 'update' : 'tips';
    const score = Math.min(10, Math.max(1, Math.round(Number(parsed['importance_score'] ?? 5))));
    return {
      summaryJa: String(parsed['summary_ja'] ?? ''),
      category,
      importanceScore: score,
    };
  } catch {
    // JSON パース失敗時はデフォルト値でフォールバック（CLAUDE.md §4）
    console.warn(`[gemini] JSON parse fallback. raw: ${text.slice(0, 200)}`);
    return { summaryJa: '', category: 'tips', importanceScore: 5 };
  }
}

export class GeminiProvider implements LLMProvider {
  private readonly genai: GoogleGenerativeAI;
  private flashUsedToday = 0;
  private lastFlashCallMs = 0;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    this.genai = new GoogleGenerativeAI(apiKey);
  }

  async enrich(article: RawArticle): Promise<Enrichment> {
    const useFlashLite = this.flashUsedToday >= FLASH_RPD;
    const modelName = useFlashLite ? FLASH_LITE_MODEL : FLASH_MODEL;

    if (!useFlashLite) {
      // Flash の RPM 制御: 前回呼び出しから FLASH_INTERVAL_MS 未満なら待機
      const elapsed = Date.now() - this.lastFlashCallMs;
      if (this.lastFlashCallMs > 0 && elapsed < FLASH_INTERVAL_MS) {
        await delay(FLASH_INTERVAL_MS - elapsed);
      }
      this.lastFlashCallMs = Date.now();
    }

    const excerpt = article.excerpt?.slice(0, EXCERPT_MAX) ?? '';
    const prompt = buildPrompt(article.title, excerpt);
    const model = this.genai.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!useFlashLite) this.flashUsedToday++;

    return parseEnrichment(text);
  }
}
