import { useState } from 'react';
import type { Article, ScreenConfig } from '../types';
import { getDisplayConfig } from '../data/screenConfig';
import { useArticles } from '../hooks/useArticles';
import ArticleCard from '../components/ArticleCard';
import { ScreenIconBadge } from '../components/ScreenIcon';
import { loadFavorites, sortByDateDesc, isFavorited, toggleFavorite } from '../lib/favorites';

interface Props {
  screenConfig: ScreenConfig;
}

const robotImages = Object.values(
  import.meta.glob<{ default: string }>('../assets/robots/*.png', { eager: true })
).map(m => m.default);

// 固定枠（TOP5・お気に入り）は専用の空状態文言を維持する。自由枠（グループ単位の新画面)は
// 内容が product/audience/category/difficulty の組み合わせで多様なため共通文言にする。
// 「空 = バグではなく今日は静かだった」と伝わる表現にする（SPEC_EXPANSION §7.6）。
const EMPTY_MESSAGE_BY_SPECIAL: Record<'top5' | 'fav', string> = {
  top5: '今日は静かな一日だったみたい',
  fav: 'まだお気に入りはありません',
};
const EMPTY_SUB_BY_SPECIAL: Record<'top5' | 'fav', string> = {
  top5: '大きな動きは無かったよ。また明日チェックしてね',
  fav: '記事の ★ をタップするとここに保存されます',
};
const DEFAULT_EMPTY_MESSAGE = 'このカテゴリは今日は静からしいよ';
const DEFAULT_EMPTY_SUB = '新しい記事が来たらすぐここに並ぶよ';

function useEmptyRobotSrc(): string {
  const [src] = useState<string>(() => robotImages[Math.floor(Math.random() * robotImages.length)]);
  return src;
}

function ScreenHeader({ screenConfig }: { screenConfig: ScreenConfig }) {
  return (
    <div style={{ padding: 'clamp(20px, 4vw, 36px) clamp(20px, 4vw, 40px) 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ScreenIconBadge kind={screenConfig.icon} />
        <h1 style={{
          margin: 0,
          fontSize: 'clamp(20px, 3.5vw, 28px)',
          fontWeight: 900,
          color: 'var(--title)',
          letterSpacing: '-0.03em',
        }}>
          {screenConfig.label}
        </h1>
      </div>
      {screenConfig.subLabel && (
        <p style={{
          margin: '6px 0 0 54px',
          fontSize: 13, fontWeight: 500,
          color: 'var(--muted)',
        }}>
          {screenConfig.subLabel}
        </p>
      )}
    </div>
  );
}

interface ArticleListBodyProps {
  screenConfig: ScreenConfig;
  articles: Article[];
  loading: boolean;
  error: string | null;
  isFav: (articleId: string) => boolean;
  onToggleFav: (article: Article) => void;
}

// TOP5・自由枠・お気に入りに共通のヘッダー / ローディング / エラー / 空状態 / カード一覧描画。
// データ取得方法（Supabase or localStorage）の違いは呼び出し側（FavScreenList / QueryScreenList）が吸収する。
function ArticleListBody({ screenConfig, articles, loading, error, isFav, onToggleFav }: ArticleListBodyProps) {
  const emptyRobotSrc = useEmptyRobotSrc();
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});

  const displayConfig = getDisplayConfig(screenConfig);
  const emptyMessage = screenConfig.special
    ? EMPTY_MESSAGE_BY_SPECIAL[screenConfig.special]
    : DEFAULT_EMPTY_MESSAGE;
  const emptySub = screenConfig.special
    ? EMPTY_SUB_BY_SPECIAL[screenConfig.special]
    : DEFAULT_EMPTY_SUB;

  const getOpen = (key: string) => openStates[key] ?? false;
  const toggleOpen = (key: string) => setOpenStates(prev => ({ ...prev, [key]: !getOpen(key) }));

  return (
    <div>
      <ScreenHeader screenConfig={screenConfig} />

      {/* Article list / Loading / Error / Empty */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        gap: 12,
        padding: 'clamp(4px, 1vw, 8px) clamp(16px, 3vw, 32px) clamp(24px, 4vw, 40px)',
      }}>
        {loading && (
          <p style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
            読み込み中…
          </p>
        )}

        {!loading && error && (
          <p style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
            データの取得に失敗しました
          </p>
        )}

        {!loading && !error && articles.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '48px 20px', gap: 14,
          }}>
            <img src={emptyRobotSrc} alt="" style={{ width: 120, opacity: 0.85 }} />
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--title)', textAlign: 'center' }}>
              {emptyMessage}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', textAlign: 'center', maxWidth: 300 }}>
              {emptySub}
            </p>
          </div>
        )}

        {!loading && !error && articles.map((article) => {
          const key = `${screenConfig.id}__${article.id}`;
          const card = (
            <ArticleCard
              article={article}
              config={displayConfig}
              isOpen={getOpen(key)}
              isFav={isFav(article.id)}
              onToggleOpen={() => toggleOpen(key)}
              onToggleFav={onToggleFav}
            />
          );

          // 重要トピック画面はカードの外・上にグループ名をサブタイトルとして表示する
          if (displayConfig.hasGroupLabel && article.groupLabel) {
            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <span style={{
                  paddingLeft: 4,
                  fontSize: 13, fontWeight: 800,
                  color: 'var(--muted2)',
                  letterSpacing: '0.02em',
                }}>
                  {article.groupLabel}
                </span>
                {card}
              </div>
            );
          }

          return <div key={key}>{card}</div>;
        })}
      </div>
    </div>
  );
}

/**
 * お気に入り画面（固定枠。`special === 'fav'`）。
 * G-4: localStorage から直接描画する（全件表示・件数制限なし。Supabase への問い合わせは行わない）。
 */
function FavScreenList({ screenConfig }: { screenConfig: ScreenConfig }) {
  const [favArticles, setFavArticles] = useState<Article[]>(() => sortByDateDesc(loadFavorites()));

  // お気に入り画面での★解除は一覧から即座に消えるべきなので、トグル結果でこの画面の state を更新する
  const handleToggleFav = (article: Article) => {
    const updated = toggleFavorite(article);
    setFavArticles(sortByDateDesc(updated));
  };

  return (
    <ArticleListBody
      screenConfig={screenConfig}
      articles={favArticles}
      loading={false}
      error={null}
      isFav={() => true}
      onToggleFav={handleToggleFav}
    />
  );
}

/** TOP5・自由枠（通常枠）。引き続き Supabase（useArticles）から取得する。 */
function QueryScreenList({ screenConfig }: { screenConfig: ScreenConfig }) {
  const { articles, loading, error } = useArticles(screenConfig);
  // toggleFavorite は localStorage への直接書き込みで React state ではないため、
  // トグルのたびにダミーの state を更新して★表示の再計算（再レンダー）を起こす
  const [, forceRerender] = useState(0);

  const handleToggleFav = (article: Article) => {
    toggleFavorite(article);
    forceRerender(v => v + 1);
  };

  return (
    <ArticleListBody
      screenConfig={screenConfig}
      articles={articles}
      loading={loading}
      error={error}
      isFav={isFavorited}
      onToggleFav={handleToggleFav}
    />
  );
}

export default function ListPage({ screenConfig }: Props) {
  if (screenConfig.special === 'fav') {
    return <FavScreenList screenConfig={screenConfig} />;
  }
  return <QueryScreenList screenConfig={screenConfig} />;
}
