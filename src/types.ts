import type { Product, Category, Audience, GroupIcon } from './lib/buttonSettings';

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
  // G-5: 重要度バッジ併記用の理由 + トピックタグ（SPEC_EXPANSION §7.6）。
  // バックエンドの LLM 出力は欠損しうる前提（CLAUDE.md §4）のため任意。
  importanceReason?: string;
  tags?: string[];
  // G-5: TOP5 のチェック中カテゴリ絞り込み（`lib/screenFilter.ts` の matchesFilter）に使う生値。
  // `tag`（category の表示用文字列）とは別に、フィルタ判定用の型付き値として保持する。
  product?: Product;
  audience?: Audience;
  category?: Category;
  difficulty?: number;
  // 重要トピック画面（special: 'top5'）専用。この記事が代表するボタングループ名（例「Claude Code」）を
  // カード先頭のバッジに表示する。他画面では undefined。
  groupLabel?: string;
}

/**
 * カードの表示要素フラグ（旧 `ScreenConfig`）。
 * G-1 でデータ駆動のクエリ定義を表す `ScreenConfig` を新設したため、名前の衝突を避けて改称した。
 */
export interface ScreenDisplayConfig {
  hasNumber?: boolean;
  // 重要トピック画面用: カード先頭に順位番号ではなくグループ名バッジ（article.groupLabel）を表示する
  hasGroupLabel?: boolean;
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

// --- G-1: 画面のデータ駆動化（SPEC_EXPANSION §7.1） ---

/** ホームのボタン・BottomNav・リスト画面ヘッダーで使うアイコン種別。固定枠 2 種 + グループアイコン 5 種。 */
export type ScreenIconKind = 'top5' | 'fav' | GroupIcon;

/** 記事一覧の絞り込み条件。複数指定可の項目は配列で表現し Supabase の `.in()` でフィルタする（§7.1）。 */
export interface ArticleFilter {
  product?: Product;
  category?: Category[];
  audience?: Audience;
  difficulty?: number[];
  keywords?: string[];
}

/**
 * 画面 = クエリ定義（SPEC_EXPANSION §7.1）。
 * TOP5 は `special` を持つ固定枠で、filter/sort は使わず `useArticles` 側の専用クエリ
 * （D-023 の 24 時間ローリングウィンドウ）を実行する。
 * お気に入り（`special: 'fav'`）も固定枠だが、G-4 で localStorage 管理に移行したため
 * `useArticles` は使わず `ListPage` が `lib/favorites.ts` から直接描画する。
 * 自由枠（グループ単位。`src/lib/screens.ts` の `customButtonToScreenConfig` で生成）は
 * `special` を持たず、filter + sort で表現する。
 */
export interface ScreenConfig {
  id: string;
  label: string;
  subLabel?: string;
  icon: ScreenIconKind;
  special?: 'top5' | 'fav';
  filter: ArticleFilter;
  sort: 'importance' | 'published_at';
}
