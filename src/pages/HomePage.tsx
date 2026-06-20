import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const robotImages = Object.values(
  import.meta.glob<{ default: string }>('../assets/robots/*.png', { eager: true })
).map(m => m.default);

const ICON_COLOR = 'var(--muted)';
const FULL_TEXT = 'おはよう。今日は重要な記事が3件。\nClaude Code に破壊的変更があるよ。';
const BUBBLE_APPEAR_MS = 1100;
const CHAR_INTERVAL_MS = 55;

function NavCircle({
  onClick, children, label, gradientFrom, gradientTo, animDelay,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
  gradientFrom: string;
  gradientTo: string;
  animDelay: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 66,
        minWidth: 66,
        paddingLeft: hovered ? 18 : 0,
        paddingRight: hovered ? 22 : 0,
        borderRadius: 33,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: hovered ? 10 : 0,
        border: '2px solid transparent',
        background: hovered
          ? `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`
          : 'var(--card)',
        boxShadow: hovered
          ? `0 8px 24px ${gradientFrom}55`
          : '0 6px 20px rgba(0,0,0,.1), 0 2px 6px rgba(0,0,0,.06)',
        cursor: 'pointer',
        transition: 'background 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease, padding-left 0.35s cubic-bezier(0.34,1.56,0.64,1), padding-right 0.35s cubic-bezier(0.34,1.56,0.64,1), gap 0.35s ease',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        animation: `fadeInUp 0.45s ease ${animDelay} both`,
      }}
    >
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        filter: hovered ? 'brightness(0) invert(1)' : 'none',
        transition: 'filter 0.2s ease',
        flexShrink: 0,
      }}>
        {children}
      </span>
      <span style={{
        color: '#fff',
        fontSize: 13,
        fontWeight: 700,
        maxWidth: hovered ? 160 : 0,
        opacity: hovered ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-width 0.3s ease, opacity 0.15s ease',
        letterSpacing: '0.02em',
      }}>
        {label}
      </span>
    </button>
  );
}

function FlameIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path
        d="M11 2C9.5 5 7 7.5 7 11.5C7 14.5 8.8 17 11 17C13.2 17 15 14.5 15 11.5C15 9.5 14.2 8 13 7C13 9 11.8 10.2 11 10.5C11 7.5 12 4.5 11 2Z"
        stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <polyline
        points="2,17 7,11 12,14 20,5"
        stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="7" cy="11" r="1.5" fill={ICON_COLOR} />
      <circle cx="12" cy="14" r="1.5" fill={ICON_COLOR} />
      <path d="M16 5h4v4" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AILabel() {
  return (
    <span style={{ fontSize: 18, fontWeight: 900, color: ICON_COLOR, letterSpacing: '-0.04em' }}>AI</span>
  );
}

function GeminiIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2C11 2 14 7 14 11C14 15 11 20 11 20C11 20 8 15 8 11C8 7 11 2 11 2Z"
        stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 11C2 11 7 8.5 11 8.5C15 8.5 20 11 20 11C20 11 15 13.5 11 13.5C7 13.5 2 11 2 11Z"
        stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 19C11 19 2 13 2 7.5C2 5 4 3 6.5 3C8 3 9.4 3.8 10.3 5C10.7 5.6 11 5.6 11.7 5C12.6 3.8 14 3 15.5 3C18 3 20 5 20 7.5C20 13 11 19 11 19Z"
        stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [robotSrc] = useState<string>(
    () => robotImages[Math.floor(Math.random() * robotImages.length)]
  );
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setShowCursor(true);
      let i = 0;
      const ticker = setInterval(() => {
        i++;
        setDisplayedText(FULL_TEXT.slice(0, i));
        if (i >= FULL_TEXT.length) {
          clearInterval(ticker);
          setTimeout(() => setShowCursor(false), 900);
        }
      }, CHAR_INTERVAL_MS);
      return () => clearInterval(ticker);
    }, BUBBLE_APPEAR_MS);

    return () => clearTimeout(startTimer);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: 'calc(100vh - 75px)',
      padding: '0 clamp(20px, 5vw, 56px)',
    }}>
      <div style={{ flex: 2 }} />

      {/* Robot + speech bubble */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        gap: 'clamp(16px, 3vw, 32px)',
        width: '100%', maxWidth: 700,
      }}>
        {/* Robot image */}
        <img
          src={robotSrc}
          alt=""
          style={{
            width: 'clamp(100px, 16vw, 160px)',
            flexShrink: 0,
            filter: 'drop-shadow(0 12px 22px rgba(40,80,160,.15))',
            animation: 'fadeInUp 0.45s ease 0.25s both',
          }}
        />

        {/* Speech bubble — appears last */}
        <div style={{ position: 'relative', marginTop: 12, animation: 'fadeInUp 0.4s ease 1.1s both' }}>
          {/* Triangle */}
          <span style={{
            position: 'absolute',
            left: -14, top: 24,
            borderWidth: '8px 14px 8px 0',
            borderStyle: 'solid',
            borderColor: 'transparent var(--bubble-bg) transparent transparent',
          }} />

          {/* Bubble body */}
          <div style={{
            background: 'var(--bubble-bg)',
            borderRadius: 18,
            padding: 'clamp(14px, 2.5vw, 24px) clamp(18px, 3vw, 28px)',
            fontSize: 'clamp(14px, 2vw, 18px)',
            lineHeight: 1.75,
            fontWeight: 500,
            color: 'var(--title)',
          }}>
            {/*
              Grid-stack: the invisible placeholder holds the full-size layout
              so the bubble doesn't resize as characters are typed.
            */}
            <div style={{ display: 'grid' }}>
              <span style={{
                gridArea: '1 / 1',
                visibility: 'hidden',
                userSelect: 'none',
                pointerEvents: 'none',
                whiteSpace: 'pre-wrap',
              }}>
                {FULL_TEXT}
              </span>
              <span style={{ gridArea: '1 / 1', whiteSpace: 'pre-wrap' }}>
                {displayedText}
                {showCursor && (
                  <span style={{
                    display: 'inline-block',
                    marginLeft: 1,
                    animation: 'blink 0.65s step-end infinite',
                    color: 'var(--muted)',
                  }}>|</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gap between robot section and buttons */}
      <div style={{ flex: '0 0 clamp(64px, 9vw, 96px)' }} />

      {/* Navigation buttons */}
      <div style={{
        display: 'flex', flexWrap: 'wrap',
        gap: 'clamp(12px, 2.5vw, 24px)',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <NavCircle
          onClick={() => navigate('/top5')}
          label="TODAY TOP5"
          gradientFrom="#ff8a45"
          gradientTo="#ff4d28"
          animDelay="0.55s"
        >
          <FlameIcon />
        </NavCircle>

        <NavCircle
          onClick={() => navigate('/update')}
          label="アップデート"
          gradientFrom="#fbbf24"
          gradientTo="#f59e0b"
          animDelay="0.65s"
        >
          <TrendIcon />
        </NavCircle>

        <NavCircle
          onClick={() => navigate('/tips')}
          label="Tips (Claude)"
          gradientFrom="#34d399"
          gradientTo="#059669"
          animDelay="0.75s"
        >
          <AILabel />
        </NavCircle>

        <NavCircle
          onClick={() => navigate('/tips-gemini')}
          label="Tips (Gemini)"
          gradientFrom="#4285f4"
          gradientTo="#0ea5e9"
          animDelay="0.85s"
        >
          <GeminiIcon />
        </NavCircle>

        <NavCircle
          onClick={() => navigate('/fav')}
          label="お気に入り"
          gradientFrom="#f43f5e"
          gradientTo="#ec4899"
          animDelay="0.95s"
        >
          <HeartIcon />
        </NavCircle>
      </div>

      <div style={{ flex: 3 }} />
    </div>
  );
}
