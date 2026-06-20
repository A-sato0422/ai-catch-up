import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

function LogoIcon() {
  return (
    <span
      style={{
        width: 38,
        height: 38,
        borderRadius: 11,
        background: 'var(--logo-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="6" width="16" height="11" rx="3" fill="#2f6df0" opacity=".18" />
        <rect x="6" y="3" width="10" height="12" rx="3" fill="#ff5a2c" opacity=".22" />
        <circle cx="11" cy="10" r="4.5" fill="#ff5a2c" />
        <circle cx="11" cy="10" r="2" fill="#fff" />
      </svg>
    </span>
  );
}

function MoonIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M15.5 11a6.5 6.5 0 1 1-8.5-8.5A5.5 5.5 0 0 0 15.5 11z" fill="currentColor" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M15.5 11a6.5 6.5 0 1 1-8.5-8.5A5.5 5.5 0 0 0 15.5 11z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function BackArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dark, toggleDark } = useTheme();
  const isHome = location.pathname === '/';

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '18px 28px',
        borderBottom: '1px solid var(--hairline)',
        animation: 'fadeInUp 0.4s ease 0s both',
      }}
    >
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          border: 'none',
          background: 'none',
          padding: 0,
          flexShrink: 0,
        }}
      >
        <LogoIcon />
        <span
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: 'var(--title)',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.02em',
          }}
        >
          AI Catchup
        </span>
      </button>

      {/* Back button */}
      {!isHome && (
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            padding: '4px 8px',
            borderRadius: 6,
            color: 'var(--muted2)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <BackArrow />
          ホーム
        </button>
      )}

      <div style={{ flex: 1 }} />

      {/* Date — desktop only */}
      <span
        className="hidden md:block"
        style={{ fontSize: 14, fontWeight: 700, color: 'var(--title)', flexShrink: 0 }}
      >
        {today}
      </span>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 34,
          height: 34,
          borderRadius: 8,
          border: '1.5px solid var(--pill-line)',
          background: 'var(--pill-bg)',
          cursor: 'pointer',
          color: 'var(--muted2)',
          flexShrink: 0,
          transition: 'background 0.15s',
        }}
        aria-label={dark ? 'ライトモードに切替' : 'ダークモードに切替'}
      >
        <MoonIcon filled={dark} />
      </button>
    </div>
  );
}
