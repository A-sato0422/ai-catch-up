// キーワード関連度フィルタ（SPEC §3.2 / SPEC_EXPANSION §5.1「広く取る×きつく濾す」）
// 広範ソースでタイトル+抜粋にキーワードが含まれるか判定する

const CLAUDE_CODE_KEYWORDS = ['Claude Code', 'claude-code', 'ClaudeCode'];
const GEMINI_KEYWORDS = ['Gemini', 'gemini-cli', 'Gemma'];

export function isRelevantToClaudeCode(text: string): boolean {
  return CLAUDE_CODE_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
}

export function isRelevantToGemini(text: string): boolean {
  return GEMINI_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
}

// 部分文字列一致のみで判定できる、日本語として曖昧さの低いキーワード（誤爆リスクが低いもの）
const AI_KEYWORDS_SUBSTRING = ['人工知能', '生成AI', 'ChatGPT', 'Copilot', '機械学習', 'Gemini', 'Claude'];

// "AI" / "LLM" は英単語中に部分文字列として偶然出現しうる（例: "email" に "ai" を含む）ため、
// \b（word boundary）付きの正規表現で判定する。日本語の文字は \w と見なされないため、
// 「生成AI」「AI活用」のように日本語に隣接するケースでも境界として機能する。
const AI_WORD_BOUNDARY_PATTERN = /\b(AI|LLM)\b/i;

// はてブ title/text 検索・ITmedia 系の保険用に使う、広めの AI 関連キーワード判定（SPEC_EXPANSION §5.1）。
// 個別の isRelevantToAiAdoption / isRelevantToAiBusiness / ITmedia アダプタで共通利用する。
export function isRelevantToAI(text: string): boolean {
  if (AI_WORD_BOUNDARY_PATTERN.test(text)) return true;
  return AI_KEYWORDS_SUBSTRING.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
}

// はてブ検索「AI 導入」（導入事例系）の保険フィルタ。
// SPEC_EXPANSION の指示上「単純に AI 系キーワードのいずれかを含むかで判定」も許容されているため、
// 現状は isRelevantToAI と同一ロジックとする。将来クエリ別に閾値を調整したくなった場合に備えて
// 関数を分離して export している（判断理由は完了報告を参照）。
export function isRelevantToAiAdoption(text: string): boolean {
  return isRelevantToAI(text);
}

// はてブ検索「生成AI ビジネス」（ビジネス系）の保険フィルタ。isRelevantToAiAdoption と同様の理由で分離。
export function isRelevantToAiBusiness(text: string): boolean {
  return isRelevantToAI(text);
}
