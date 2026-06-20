export type Screen = 'top5' | 'update' | 'tips' | 'tipsGemini' | 'fav';
export type SourceType = 'github' | 'zenn' | 'qiita' | 'hatena' | 'google';

export interface Article {
  id: string;            // uuid
  url: string;           // 元記事 URL
  titleA: string;        // title
  src?: SourceType;      // source から変換
  date: string;          // published_at をフォーマット（'YYYY/MM/DD'）
  imp: number;           // importance_score
  full: string;          // summary_ja（なければ excerpt）
  claude?: boolean;      // product === 'claude_code'
  tag?: string;          // category（update 画面で表示）
  isFavDb: boolean;      // DB の is_favorite
}

export interface ScreenConfig {
  hasNumber?: boolean;
  hasBar?: boolean;
  hasBrand?: boolean;
  hasSource?: boolean;
  hasTag?: boolean;
  chevron?: boolean;
  external?: boolean;
  expand?: boolean;
  favDefault?: boolean;
}

export interface ScreenMeta {
  title: string;
  sub: string;
  iconEmoji: string;
}
