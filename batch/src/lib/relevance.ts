// キーワード関連度フィルタ（SPEC §3.2）
// 広範ソースでタイトル+抜粋にキーワードが含まれるか判定する

const CLAUDE_CODE_KEYWORDS = ['Claude Code', 'claude-code', 'ClaudeCode'];
const GEMINI_KEYWORDS = ['Gemini', 'gemini-cli', 'Gemma'];

export function isRelevantToClaudeCode(text: string): boolean {
  return CLAUDE_CODE_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
}

export function isRelevantToGemini(text: string): boolean {
  return GEMINI_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
}
