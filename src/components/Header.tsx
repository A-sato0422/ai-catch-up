import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import headerLogo from '../assets/robots/header_log.png';

// 2026-07-17: ヘッダーのロゴをユーザー支給の静止画（header_log.png・顔のみ）に変更。
// 旧実装は RobotSaludando.json（Lottie）を goToAndStop + 拡大クロップで顔だけ見せる方式だったが、
// 専用画像が用意されたため静止画に戻す。画像は背景が不透過のグレーグラデーションのため、
// 円形にクロップしてバッジ風に見せる（ダークモードでも背景色との矛盾が出にくい）。
// 元画像は 3:2 の横長なので object-fit: cover で中央の顔まわりだけを切り出す。
function LogoIcon() {
  return (
    <img
      src={headerLogo}
      alt=""
      aria-hidden="true"
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        objectFit: 'cover',
        display: 'block',
        flexShrink: 0,
      }}
    />
  );
}

function GearIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function MoonIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
      <path d="M15.5 11a6.5 6.5 0 1 1-8.5-8.5A5.5 5.5 0 0 0 15.5 11z" fill="currentColor" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
      <path d="M15.5 11a6.5 6.5 0 1 1-8.5-8.5A5.5 5.5 0 0 0 15.5 11z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export default function Header() {
  const navigate = useNavigate();
  const { dark, toggleDark } = useTheme();
  // フェーズJ追加分: 設定画面表示中はヘッダーの設定ボタンを非活性にする（現在地への遷移ボタンは無意味なため）
  const { pathname } = useLocation();
  const onSettings = pathname === '/settings';

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

      <div style={{ flex: 1 }} />

      {/* Date — desktop only */}
      <span
        className="hidden md:block"
        style={{ fontSize: 14, fontWeight: 700, color: 'var(--title)', flexShrink: 0 }}
      >
        {today}
      </span>

      {/* Settings + dark mode toggle — grouped with a tighter gap between them (フェーズI) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => navigate('/settings')}
          disabled={onSettings}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 10,
            border: '1.5px solid var(--pill-line)',
            background: 'var(--pill-bg)',
            cursor: onSettings ? 'default' : 'pointer',
            color: 'var(--muted2)',
            // 非活性時は視覚的にも薄くする（ダークモードでも変数ベースの色に opacity を掛けるだけなので破綻しない）
            opacity: onSettings ? 0.4 : 1,
            flexShrink: 0,
            transition: 'background 0.15s, opacity 0.15s',
          }}
          aria-label="表示するボタンの設定"
        >
          <GearIcon />
        </button>

        <button
          onClick={toggleDark}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 10,
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
    </div>
  );
}
