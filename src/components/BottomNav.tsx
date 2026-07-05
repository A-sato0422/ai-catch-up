import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScreenIconGlyph } from './ScreenIcon';
import { getScreenGradient } from '../lib/screenGradients';
import { buildAllScreens } from '../lib/screens';
import { loadButtonSelection } from '../lib/buttonSettings';

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

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // ホームと同じ統合画面リスト（固定枠2 + 自由枠最大5）から動的生成する（G-1）
  const [screens] = useState(() => buildAllScreens(loadButtonSelection()));

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
      {screens.map((screen) => {
        const [gradientFrom, gradientTo] = getScreenGradient(screen.icon);
        const path = screen.special ? `/${screen.id}` : `/screen/${screen.id}`;
        return (
          <NavButton
            key={screen.id}
            onClick={() => navigate(path)}
            gradientFrom={gradientFrom}
            gradientTo={gradientTo}
            active={pathname === path}
          >
            <ScreenIconGlyph kind={screen.icon} size={20} />
          </NavButton>
        );
      })}
    </div>
  );
}
