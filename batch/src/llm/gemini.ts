import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, RawArticle, Enrichment, Category, Audience, Product } from '../types.js';
import { delay } from '../lib/delay.js';

// モデルは env で上書き可能（SPEC §6.5）
const PRIMARY_MODEL = process.env.GEMINI_PRIMARY_MODEL ?? 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL ?? 'gemma-4-26b-a4b-it';

const PRIMARY_RPD = 500;          // Primary モデルの無料枠上限（1日）
const PRIMARY_INTERVAL_MS = 4000; // RPM 制御: 4 秒間隔（15 RPM 枠内に収める。SPEC_EXPANSION §2）
const EXCERPT_MAX = 3000;         // LLM に渡す本文の上限（SPEC §6.1）

function buildPrompt(title: string, excerpt: string, productHint: Product): string {
  return `以下の技術記事を分析し、JSONのみで回答してください（前後の説明・コードフェンス不要）。

タイトル: ${title}
本文抜粋: ${excerpt}

出力形式（厳密なJSON）:
{"summary_ja":"日本語6〜8行程度の要約（各要点を具体的に記述）","category":"update または tips または business または case_study","importance_score":1から10の整数,"importance_reason":"重要な理由を10〜15字程度で（例:破壊的変更）","tags":["トピックタグ","2〜3個"],"audience":"engineer または backoffice または executive","difficulty":1から3の整数,"product":"claude_code または gemini または codex または other"}

product（対象プロダクト）の判定基準:
- タグや検索クエリではなく、記事の「主題」がどのプロダクト/モデルかで判定する
- claude_code: Claude Code / Claude（Anthropic のモデル・API）が主題
- gemini: Gemini / Gemini CLI / Gemma（Google のモデル・ツール）が主題
- codex: Codex（OpenAI のコーディングエージェント）が主題
- other: 特定プロダクトが主題ではない（AI 業界動向・導入事例・上記以外のプロダクトなど）
- 複数プロダクトを扱う記事は最も比重の大きいものを選ぶ。判断がつかない場合のみ "${productHint}"（収集元クエリ由来の推定値）とする

分類ルール（category）:
- update: 新機能・リリース・アップデート・仕様変更などプロダクト自体の変化
- tips: 使い方・活用術・ハマりどころ・事例など
- business: AI 業界動向・企業の提携/調達・料金/市場ニュースなど、経営層の関心事
- case_study: 企業・組織への AI 導入事例、業務適用レポート（バックオフィス/経営層向け）

重要度の目安: 10=破壊的変更/メジャーリリース, 7-8=重要な新機能, 4-6=通常アップデート/Tips, 1-3=ニッチな小ネタ

difficulty（難易度）の判定基準:
- 1（初級）: インストール・初期設定・基本コマンド・「はじめてみた」系。前提知識なしで読める
- 2（中級）: Skill / Subagent / Hooks / MCP 等の機能活用、ワークフロー改善。日常利用者向け
- 3（上級）: 内部挙動の解析、リリースノートの読み解き、大規模運用・CI 組み込み、複数ツールの組み合わせ
難易度判定は揺れやすいため、判断に迷う場合は低い方の値を選んでください（初級読者に上級記事が混ざるのは軽微な問題だが、逆は避けたいため）。

audience（対象者）の目安:
- engineer: エンジニア・開発者向けの技術的な内容
- backoffice: 総務・人事・経理など非エンジニアの業務担当者向け
- executive: 経営層・意思決定者向け（業界動向・投資判断など）`;
}

function isQuotaError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'status' in err && (err as { status: number }).status === 429;
}

const VALID_CATEGORIES: Category[] = ['update', 'tips', 'business', 'case_study'];
const VALID_AUDIENCES: Audience[] = ['engineer', 'backoffice', 'executive'];
const VALID_PRODUCTS: Product[] = ['claude_code', 'gemini', 'codex', 'other'];

function parseCategory(value: unknown): Category {
  return VALID_CATEGORIES.includes(value as Category) ? (value as Category) : 'tips';
}

// 拡張フィールドは欠損しうる前提（CLAUDE.md §4）。
// 型が不正・値が仕様の範囲外なら undefined を返し、DB には null で保存する。
function parseImportanceReason(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tags = value.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
  return tags.length > 0 ? tags : undefined;
}

function parseAudience(value: unknown): Audience | undefined {
  return VALID_AUDIENCES.includes(value as Audience) ? (value as Audience) : undefined;
}

// LLM 判定の product（D-037）。不正・欠損なら undefined を返し、呼び出し側で取得経路由来の値へフォールバックする
function parseProduct(value: unknown): Product | undefined {
  return VALID_PRODUCTS.includes(value as Product) ? (value as Product) : undefined;
}

function parseDifficulty(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  const rounded = Math.round(num);
  return rounded >= 1 && rounded <= 3 ? rounded : undefined;
}

function parseEnrichment(text: string): Enrichment {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no JSON object found');
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const category = parseCategory(parsed['category']);
    const score = Math.min(10, Math.max(1, Math.round(Number(parsed['importance_score'] ?? 5))));
    return {
      summaryJa: String(parsed['summary_ja'] ?? ''),
      category,
      importanceScore: score,
      product: parseProduct(parsed['product']),
      importanceReason: parseImportanceReason(parsed['importance_reason']),
      tags: parseTags(parsed['tags']),
      audience: parseAudience(parsed['audience']),
      difficulty: parseDifficulty(parsed['difficulty']),
    };
  } catch {
    // JSON パース失敗時はデフォルト値でフォールバック（CLAUDE.md §4）
    console.warn(`[gemini] JSON parse fallback. raw: ${text.slice(0, 200)}`);
    return { summaryJa: '', category: 'tips', importanceScore: 5 };
  }
}

export class GeminiProvider implements LLMProvider {
  private readonly genai: GoogleGenerativeAI;
  private primaryUsedToday = 0;
  private lastPrimaryCallMs = 0;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    this.genai = new GoogleGenerativeAI(apiKey);
  }

  async enrich(article: RawArticle): Promise<Enrichment> {
    const useFallback = this.primaryUsedToday >= PRIMARY_RPD;
    const modelName = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;

    if (!useFallback) {
      // Primary の RPM 制御: 前回呼び出しから PRIMARY_INTERVAL_MS 未満なら待機
      const elapsed = Date.now() - this.lastPrimaryCallMs;
      if (this.lastPrimaryCallMs > 0 && elapsed < PRIMARY_INTERVAL_MS) {
        await delay(PRIMARY_INTERVAL_MS - elapsed);
      }
      this.lastPrimaryCallMs = Date.now();
    }

    const excerpt = article.excerpt?.slice(0, EXCERPT_MAX) ?? '';
    const prompt = buildPrompt(article.title, excerpt, article.product);
    const model = this.genai.getGenerativeModel({ model: modelName });

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!useFallback) this.primaryUsedToday++;
      return parseEnrichment(text);
    } catch (err) {
      // Primary がクォータ超過（429）したら即座に Fallback へ切り替え
      if (!useFallback && isQuotaError(err)) {
        console.log(`[gemini] ${PRIMARY_MODEL} quota exceeded, switching to ${FALLBACK_MODEL}`);
        this.primaryUsedToday = PRIMARY_RPD;
        const fallbackModel = this.genai.getGenerativeModel({ model: FALLBACK_MODEL });
        const fallbackResult = await fallbackModel.generateContent(prompt);
        return parseEnrichment(fallbackResult.response.text());
      }
      throw err;
    }
  }
}
