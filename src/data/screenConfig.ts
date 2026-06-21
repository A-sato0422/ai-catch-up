import type { Screen, ScreenConfig, ScreenMeta } from '../types';

export const SCREEN_CONFIG: Record<Screen, ScreenConfig> = {
  top5:       { hasNumber: true,  hasSource: true,  chevron: true,  expand: true },
  update:     { hasBar: true, hasBrand: true, hasSource: true, chevron: true, expand: true, externalBadge: true },
  tips:       { hasSource: true,  chevron: true,  expand: true },
  tipsGemini: { hasSource: true,  chevron: true,  expand: true },
  fav:        { hasBar: true, hasSource: true, chevron: true, expand: true, favDefault: true },
};

export const SCREEN_META: Record<Screen, ScreenMeta> = {
  top5:       { title: '今日の重要 TOP5',      sub: '本日のピックアップ',                       iconEmoji: '🔥' },
  update:     { title: 'アップデート',          sub: '新機能・リリース・仕様変更',               iconEmoji: '🚀' },
  tips:       { title: 'Tips（Claude Code）', sub: 'Claude Code の使い方・活用術・ハマりどころ', iconEmoji: '💡' },
  tipsGemini: { title: 'Tips（Gemini）',       sub: 'Gemini の使い方・活用術・ハマりどころ',    iconEmoji: '✨' },
  fav:        { title: 'お気に入り',            sub: '保存した記事・新着順',                     iconEmoji: '⭐' },
};
