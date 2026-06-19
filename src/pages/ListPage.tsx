import { useState } from 'react';
import type { Screen } from '../types';
import { DATA, SCREEN_CONFIG, SCREEN_META } from '../data/mockData';
import ArticleCard from '../components/ArticleCard';

interface Props {
  screen: Screen;
}

export default function ListPage({ screen }: Props) {
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});
  const [favStates, setFavStates] = useState<Record<string, boolean>>({});

  const config = SCREEN_CONFIG[screen];
  const meta = SCREEN_META[screen];
  const articles = DATA[screen];

  const getOpen = (key: string, i: number) => {
    if (key in openStates) return openStates[key];
    return i === 0 && !!config.expand;
  };

  const getFav = (key: string) => {
    if (key in favStates) return favStates[key];
    return !!config.favDefault;
  };

  const toggleOpen = (key: string, i: number) =>
    setOpenStates(prev => ({ ...prev, [key]: !getOpen(key, i) }));

  const toggleFav = (key: string) =>
    setFavStates(prev => ({ ...prev, [key]: !getFav(key) }));

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

      {/* Article list */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        gap: 12,
        padding: 'clamp(4px, 1vw, 8px) clamp(16px, 3vw, 32px) clamp(24px, 4vw, 40px)',
      }}>
        {articles.map((article, i) => {
          const key = `${screen}__${i}`;
          return (
            <ArticleCard
              key={key}
              article={article}
              config={config}
              index={i}
              isOpen={getOpen(key, i)}
              isFav={getFav(key)}
              onToggleOpen={() => toggleOpen(key, i)}
              onToggleFav={() => toggleFav(key)}
            />
          );
        })}
      </div>
    </div>
  );
}
