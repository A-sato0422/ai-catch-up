import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ICON_COLOR = 'var(--muted)';

function NavButton({ onClick, children, gradientFrom, gradientTo, active }: {
  onClick: () => void;
  children: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  active: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const lit = active || hovered;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 52,
        height: 52,
        borderRadius: 26,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none',
        background: lit ? `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` : 'transparent',
        boxShadow: lit ? `0 4px 14px ${gradientFrom}44` : 'none',
        cursor: 'pointer',
        transition: 'background 0.25s ease, box-shadow 0.25s ease',
        flexShrink: 0,
      }}
    >
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        filter: lit ? 'brightness(0) invert(1)' : 'none',
        transition: 'filter 0.2s ease',
      }}>
        {children}
      </span>
    </button>
  );
}

function FlameIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <path d="M11 2C9.5 5 7 7.5 7 11.5C7 14.5 8.8 17 11 17C13.2 17 15 14.5 15 11.5C15 9.5 14.2 8 13 7C13 9 11.8 10.2 11 10.5C11 7.5 12 4.5 11 2Z"
        stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <polyline points="2,17 7,11 12,14 20,5"
        stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="11" r="1.5" fill={ICON_COLOR} />
      <circle cx="12" cy="14" r="1.5" fill={ICON_COLOR} />
      <path d="M16 5h4v4" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AILabel() {
  return (
    <span style={{ fontSize: 16, fontWeight: 900, color: ICON_COLOR, letterSpacing: '-0.04em' }}>AI</span>
  );
}

function GeminiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <path d="M11 2C11 2 14 7 14 11C14 15 11 20 11 20C11 20 8 15 8 11C8 7 11 2 11 2Z"
        stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 11C2 11 7 8.5 11 8.5C15 8.5 20 11 20 11C20 11 15 13.5 11 13.5C7 13.5 2 11 2 11Z"
        stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <path d="M11 19C11 19 2 13 2 7.5C2 5 4 3 6.5 3C8 3 9.4 3.8 10.3 5C10.7 5.6 11 5.6 11.7 5C12.6 3.8 14 3 15.5 3C18 3 20 5 20 7.5C20 13 11 19 11 19Z"
        stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: 0,
      right: 0,
      marginLeft: 'auto',
      marginRight: 'auto',
      width: 'fit-content',
      background: 'var(--card)',
      borderRadius: 50,
      padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: 4,
      boxShadow: '0 8px 32px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.06)',
      border: '1px solid var(--card-line)',
      animation: 'fadeInUp 0.4s ease 0.1s both',
      zIndex: 100,
    }}>
      <NavButton onClick={() => navigate('/top5')} gradientFrom="#ff8a45" gradientTo="#ff4d28" active={pathname === '/top5'}>
        <FlameIcon />
      </NavButton>
      <NavButton onClick={() => navigate('/update')} gradientFrom="#fbbf24" gradientTo="#f59e0b" active={pathname === '/update'}>
        <TrendIcon />
      </NavButton>
      <NavButton onClick={() => navigate('/tips')} gradientFrom="#34d399" gradientTo="#059669" active={pathname === '/tips'}>
        <AILabel />
      </NavButton>
      <NavButton onClick={() => navigate('/tips-gemini')} gradientFrom="#4285f4" gradientTo="#0ea5e9" active={pathname === '/tips-gemini'}>
        <GeminiIcon />
      </NavButton>
      <NavButton onClick={() => navigate('/fav')} gradientFrom="#f43f5e" gradientTo="#ec4899" active={pathname === '/fav'}>
        <HeartIcon />
      </NavButton>
    </div>
  );
}
