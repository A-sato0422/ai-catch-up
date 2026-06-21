import { useState } from 'react';
import type { Article, ScreenConfig } from '../types';
import SourceBadge from './SourceBadge';

interface Props {
  article: Article;
  config: ScreenConfig;
  index: number;
  isOpen: boolean;
  isFav: boolean;
  onToggleOpen: () => void;
  onToggleFav: () => void;
}

function StarIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 1.5l2.09 4.26 4.7.68-3.4 3.32.8 4.69L9 12.27l-4.19 2.18.8-4.69-3.4-3.32 4.7-.68z" fill="#ff5a2c" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 1.5l2.09 4.26 4.7.68-3.4 3.32.8 4.69L9 12.27l-4.19 2.18.8-4.69-3.4-3.32 4.7-.68z"
        stroke="currentColor" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d={up ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'}
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
      <path d="M5.5 2.5h-3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8.5 1.5h5v5M13.5 1.5l-6 6"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="2" width="10" height="9" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function ArticleCard({ article, config, index, isOpen, isFav, onToggleOpen, onToggleFav }: Props) {
  const isClaude = article.claude !== false;
  const barColor = isClaude ? '#ff5a2c' : '#2f6df0';
  const displayText = article.full;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onToggleOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${hovered ? 'var(--card-line-hover, var(--card-line))' : 'var(--card-line)'}`,
        background: 'var(--card)',
        boxShadow: hovered
          ? '0 8px 28px rgba(0,0,0,.13), 0 2px 8px rgba(0,0,0,.07)'
          : 'var(--card-shadow)',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Color bar */}
      {config.hasBar && (
        <span style={{ width: 5, flexShrink: 0, background: barColor }} />
      )}

      {/* Number — desktop */}
      {config.hasNumber && (
        <div className="hidden lg:flex" style={{
          width: 66, flexShrink: 0,
          alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 20,
        }}>
          <span style={{ fontSize: 34, fontWeight: 900, color: '#ff5a2c', lineHeight: 1 }}>
            {index + 1}
          </span>
        </div>
      )}

      {/* Brand column — desktop only (update screen) */}
      {config.hasBrand && (
        <div className="hidden lg:flex" style={{
          width: 172, flexShrink: 0,
          alignItems: 'center', gap: 10,
          padding: '18px 16px',
          borderRight: '1px solid var(--card-line)',
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: isClaude ? 'rgba(255,90,44,.12)' : 'rgba(47,109,240,.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900,
            color: isClaude ? '#ff5a2c' : '#2f6df0',
          }}>
            {isClaude ? 'C' : 'G'}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--title)' }}>
            {isClaude ? 'Claude Code' : 'Gemini'}
          </span>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, padding: '18px 18px 18px 20px' }}>

        {/* Mobile: number inline */}
        {config.hasNumber && (
          <span className="lg:hidden" style={{
            fontSize: 18, fontWeight: 900, color: '#ff5a2c', marginRight: 6,
          }}>
            #{index + 1}
          </span>
        )}

        {/* Mobile: brand inline for update */}
        {config.hasBrand && (
          <div className="lg:hidden" style={{ marginBottom: 8 }}>
            <span style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 5,
              background: isClaude ? 'rgba(255,90,44,.12)' : 'rgba(47,109,240,.12)',
              color: isClaude ? '#ff5a2c' : '#2f6df0',
              fontSize: 11, fontWeight: 800,
            }}>
              {isClaude ? 'Claude Code' : 'Gemini'}
            </span>
          </div>
        )}

        {/* Title */}
        <div style={{ color: 'var(--title)', fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>
          {article.titleA}
        </div>

        {/* Description */}
        <div style={{
          marginTop: 8,
          fontSize: 14, lineHeight: 1.8,
          color: 'var(--muted2)',
          display: '-webkit-box',
          WebkitLineClamp: isOpen ? undefined : 2,
          WebkitBoxOrient: isOpen ? undefined : 'vertical' as const,
          overflow: isOpen ? undefined : 'hidden',
        }}>
          {displayText}
        </div>

        {/* Open article link — shown expanded, only for non-externalBadge screens */}
        {config.expand && isOpen && !config.externalBadge && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              marginTop: 14,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid var(--pill-line)',
              background: 'var(--pill-bg)',
              color: 'var(--muted2)',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            <ExternalLinkIcon />
            元記事を開く
          </a>
        )}

        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 14 }}>
          {config.hasSource && article.src && <SourceBadge source={article.src} />}

          {/* Date badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 8,
            background: 'var(--pill-bg)', border: '1px solid var(--pill-line)',
            fontSize: 12, fontWeight: 600, color: 'var(--muted2)',
            whiteSpace: 'nowrap',
          }}>
            <CalendarIcon />
            {article.date}
          </span>

          {/* Importance badge */}
          <span style={{
            padding: '4px 10px', borderRadius: 8,
            background: 'var(--imp-bg)',
            fontSize: 12, fontWeight: 700, color: 'var(--imp-text)',
          }}>
            重要度 {article.imp}
          </span>

          {/* External link badge — shown inline next to importance (update screen), only when expanded */}
          {config.externalBadge && isOpen && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 8,
                border: '1px solid var(--pill-line)',
                background: 'var(--pill-bg)',
                fontSize: 12, fontWeight: 600, color: 'var(--muted2)',
                textDecoration: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <ExternalLinkIcon />
              元記事
            </a>
          )}
        </div>
      </div>

      {/* Actions column */}
      <div style={{
        flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, padding: '18px 16px 18px 8px',
      }}>
        {/* Fav toggle */}
        <button
          onClick={e => { e.stopPropagation(); onToggleFav(); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid var(--pill-line)',
            background: 'var(--pill-bg)',
            cursor: 'pointer',
            color: 'var(--muted2)',
          }}
          aria-label={isFav ? 'お気に入り解除' : 'お気に入り追加'}
        >
          <StarIcon filled={isFav} />
        </button>

        {/* Chevron (expand/collapse) */}
        {config.chevron && (
          <button
            onClick={e => { e.stopPropagation(); onToggleOpen(); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid var(--pill-line)',
              background: 'var(--pill-bg)',
              cursor: 'pointer',
              color: 'var(--muted2)',
            }}
            aria-label={isOpen ? '閉じる' : '展開する'}
          >
            <ChevronIcon up={isOpen} />
          </button>
        )}
      </div>
    </div>
  );
}
