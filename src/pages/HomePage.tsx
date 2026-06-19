import { useNavigate } from 'react-router-dom';
import robotImg from '../assets/robots/robot_01.png';

function NavCircle({ onClick, children, label }: { onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 66, height: 66, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid var(--card-line)',
        background: 'var(--card)',
        boxShadow: '0 2px 8px rgba(20,20,60,.09)',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(20,20,60,.14)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(20,20,60,.09)';
      }}
    >
      {children}
    </button>
  );
}

function RocketIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 2 19 5 19 13l-3.5 3.5-3.5-1.5-3.5 1.5L5 13C5 5 12 2 12 2z" fill="#ff5a2c" opacity=".85" />
      <circle cx="12" cy="10" r="2" fill="#fff" />
      <path d="M8.5 17.5l-2 4M15.5 17.5l2 4" stroke="#ff5a2c" strokeWidth="1.5" strokeLinecap="round" opacity=".6" />
    </svg>
  );
}

function AILabel() {
  return (
    <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--title)', letterSpacing: '-0.04em' }}>AI</span>
  );
}

function GeminiIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2C11 2 14 7 14 11C14 15 11 20 11 20C11 20 8 15 8 11C8 7 11 2 11 2Z" fill="#2f6df0" />
      <path d="M2 11C2 11 7 8 11 8C15 8 20 11 20 11C20 11 15 14 11 14C7 14 2 11 2 11Z" fill="#4285f4" opacity=".7" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 19S2 13 2 7.5C2 5 4 3 6.5 3c1.5 0 2.9.8 3.8 2A4.5 4.5 0 0 1 15.5 3C18 3 20 5 20 7.5 20 13 11 19 11 19Z"
        fill="#ff5a2c" opacity=".85" />
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 'clamp(24px, 5vw, 60px) clamp(20px, 5vw, 56px)' }}>

      {/* Robot + speech bubble */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 'clamp(16px, 3vw, 32px)',
        maxWidth: 700, margin: '0 auto',
      }}>
        <img
          src={robotImg}
          alt=""
          style={{
            width: 'clamp(100px, 16vw, 160px)',
            flexShrink: 0,
            filter: 'drop-shadow(0 12px 22px rgba(40,80,160,.15))',
          }}
        />

        {/* Speech bubble */}
        <div style={{ position: 'relative', marginTop: 12 }}>
          {/* Triangle */}
          <span style={{
            position: 'absolute',
            left: -14, top: 24,
            borderWidth: '8px 14px 8px 0',
            borderStyle: 'solid',
            borderColor: 'transparent var(--bubble-bg) transparent transparent',
          }} />
          <div style={{
            background: 'var(--bubble-bg)',
            borderRadius: 18,
            padding: 'clamp(14px, 2.5vw, 24px) clamp(18px, 3vw, 28px)',
            fontSize: 'clamp(14px, 2vw, 18px)',
            lineHeight: 1.75,
            fontWeight: 500,
            color: 'var(--title)',
          }}>
            おはよう。今日は重要な記事が3件。<br />
            Claude Code に破壊的変更があるよ。
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div style={{
        display: 'flex', flexWrap: 'wrap',
        gap: 'clamp(12px, 2.5vw, 24px)',
        justifyContent: 'center', alignItems: 'center',
        marginTop: 'clamp(32px, 6vw, 60px)',
      }}>

        {/* TOP5 — large glowing pill */}
        <button
          onClick={() => navigate('/top5')}
          style={{
            width: 'clamp(110px, 18vw, 132px)',
            height: 66,
            borderRadius: 33,
            background: 'linear-gradient(135deg,#ff8a45,#ff4d28)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'acGlow 2.6s ease-in-out infinite',
            flexShrink: 0,
          }}
          title="今日の重要 TOP5"
        >
          {/* Flame shape */}
          <span style={{
            width: 20, height: 26,
            background: '#fff',
            borderRadius: '60% 60% 55% 55% / 75% 75% 45% 45%',
            transform: 'rotate(-4deg)',
            boxShadow: 'inset -3px -4px 0 rgba(255,150,90,.35)',
            display: 'block',
          }} />
        </button>

        <NavCircle onClick={() => navigate('/update')} label="アップデート">
          <RocketIcon />
        </NavCircle>

        <NavCircle onClick={() => navigate('/tips')} label="Tips（Claude Code）">
          <AILabel />
        </NavCircle>

        <NavCircle onClick={() => navigate('/tips-gemini')} label="Tips（Gemini）">
          <GeminiIcon />
        </NavCircle>

        <NavCircle onClick={() => navigate('/fav')} label="お気に入り">
          <HeartIcon />
        </NavCircle>
      </div>

      {/* Button labels — desktop only */}
      <div
        className="hidden lg:flex"
        style={{
          gap: 24,
          justifyContent: 'center', alignItems: 'flex-start',
          marginTop: 10,
          paddingLeft: 'calc(clamp(110px, 18vw, 132px) / 2)',
        }}
      >
        {['アップデート', 'Tips (Claude)', 'Tips (Gemini)', 'お気に入り'].map(lbl => (
          <span key={lbl} style={{
            width: 66, textAlign: 'center',
            fontSize: 11, fontWeight: 600, color: 'var(--muted)',
            display: 'block',
          }}>
            {lbl}
          </span>
        ))}
      </div>
    </div>
  );
}
