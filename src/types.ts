export type Screen = 'top5' | 'update' | 'tips' | 'tipsGemini' | 'fav';
export type SourceType = 'github' | 'zenn' | 'qiita' | 'hatena' | 'google';

export interface Article {
  id: string;
  url: string;
  titleA: string;
  src?: SourceType;
  date: string;
  imp: number;
  full: string;
  claude?: boolean;
  tag?: string;
  isFavDb: boolean;
}

export interface ScreenConfig {
  hasNumber?: boolean;
  hasBar?: boolean;
  hasBrand?: boolean;
  hasSource?: boolean;
  hasTag?: boolean;
  chevron?: boolean;
  external?: boolean;
  externalBadge?: boolean;
  expand?: boolean;
  favDefault?: boolean;
}

export interface ScreenMeta {
  title: string;
  sub: string;
  iconEmoji: string;
}
