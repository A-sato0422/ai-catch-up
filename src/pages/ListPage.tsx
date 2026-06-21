import { useState } from 'react';
import type { Screen } from '../types';
import { SCREEN_CONFIG, SCREEN_META } from '../data/screenConfig';
import { useArticles } from '../hooks/useArticles';
import { supabase } from '../lib/supabase';
import ArticleCard from '../components/ArticleCard';

interface Props {
  screen: Screen;
}

const robotImages = Object.values(
  import.meta.glob<{ default: string }>('../assets/robots/*.png', { eager: true })
).map(m => m.default);

const EMPTY_MESSAGE: Record<Screen, string> = {
  top5:       '今日の記事はまだありません',
  update:     'アップデート情報はまだありません',
  tips:       'Tips 記事はまだありません',
  tipsGemini: 'Tips 記事はまだありません',
  fav:        'まだお気に入りはありません',
};

const EMPTY_SUB: Record<Screen, string> = {
  top5:       '収集バッチが完了すると重要記事が表示されます',
  update:     'Claude Code・Gemini の最新情報が届くと表示されます',
  tips:       'Tips 記事が収集されると表示されます',
  tipsGemini: 'Tips 記事が収集されると表示されます',
  fav:        '記事の ★ をタップするとここに保存されます',
};

export default function ListPage({ screen }: Props) {
  const [emptyRobotSrc] = useState<string>(
    () => robotImages[Math.floor(Math.random() * robotImages.length)]
  );
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});
  // キー: articleId → boolean。DB値 (isFavDb) からの上書きを保持する楽観的UI用のMap
  const [favOverrides, setFavOverrides] = useState<Record<string, boolean>>({});

  const config = SCREEN_CONFIG[screen];
  const meta = SCREEN_META[screen];
  const { articles, loading, error } = useArticles(screen);

  const getOpen = (key: string, i: number) => {
    if (key in openStates) return openStates[key];
    return i === 0 && !!config.expand;
  };

  // 楽観的UI: favOverrides に上書き値があればそちらを、なければ DB 値を使う
  const getFav = (articleId: string, isFavDb: boolean) => {
    if (articleId in favOverrides) return favOverrides[articleId];
    return isFavDb;
  };

  const toggleOpen = (key: string, i: number) =>
    setOpenStates(prev => ({ ...prev, [key]: !getOpen(key, i) }));

  const handleToggleFav = async (articleId: string, currentFav: boolean) => {
    const nextFav = !currentFav;
    setFavOverrides(prev => ({ ...prev, [articleId]: nextFav }));

    // Supabase に is_favorite を更新する（失敗はコンソールのみ、UX を止めない）
    try {
      const { error: updateError } = await supabase
        .from('articles')
        .update({ is_favorite: nextFav })
        .eq('id', articleId);

      if (updateError) {
        console.error('[ListPage] is_favorite update failed:', updateError.message);
        // ロールバック（DB 更新失敗時は表示を元に戻す）
        setFavOverrides(prev => ({ ...prev, [articleId]: currentFav }));
      }
    } catch (err) {
      console.error('[ListPage] is_favorite update error:', err);
      setFavOverrides(prev => ({ ...prev, [articleId]: currentFav }));
    }
  };

  return (
    <div>
      {/* Screen header */}
      <div style={{ padding: 'clamp(20px, 4vw, 36px) clamp(20px, 4vw, 40px) 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 30 }}>{meta.iconEmoji}</span>
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(20px, 3.5vw, 28px)',
            fontWeight: 900,
            color: 'var(--title)',
            letterSpacing: '-0.03em',
          }}>
            {meta.title}
          </h1>
        </div>
        <p style={{
          margin: '6px 0 0 42px',
          fontSize: 13, fontWeight: 500,
          color: 'var(--muted)',
        }}>
          {meta.sub}
        </p>
      </div>

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
              {EMPTY_MESSAGE[screen]}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', textAlign: 'center', maxWidth: 300 }}>
              {EMPTY_SUB[screen]}
            </p>
          </div>
        )}

        {!loading && !error && articles.map((article, i) => {
          const key = `${screen}__${article.id}`;
          const isFav = getFav(article.id, article.isFavDb);
          return (
            <ArticleCard
              key={key}
              article={article}
              config={config}
              index={i}
              isOpen={getOpen(key, i)}
              isFav={isFav}
              onToggleOpen={() => toggleOpen(key, i)}
              onToggleFav={() => void handleToggleFav(article.id, isFav)}
            />
          );
        })}
      </div>
    </div>
  );
}
