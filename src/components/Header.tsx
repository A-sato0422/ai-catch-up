import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import lottie from 'lottie-web';
import { useTheme } from '../context/ThemeContext';
import RobotSaludando from '../assets/lottie/RobotSaludando.json';

// フェーズI: ヘッダーのロゴをホーム画面と同じロボット（Lottie・背景透過）に統一する。
// 静的 PNG（白背景の丸角ボックス）を廃止し、ベクターアニメーションにすることで
// ダークモードでも背景の不整合が起きない（CLAUDE.md §3 の対象外・見た目のみの変更）。
//
// フェーズJ: ヘッダーは常時再生のフルボディアニメーションではなく「顔のみの静止画」にする
// （空状態ロボット・ホーム画面のロボットは対象外・フルボディのままでよい）。
// 新規の画像生成はできないため、既存の RobotSaludando.json を loop/autoplay 無効で読み込み、
// DOMLoaded 後に goToAndStop で1フレームに固定した上で、拡大＋overflow:hidden のクロップで
// 顔まわり（head/eye/mouth レイヤーが集まる 800x800 viewBox 中央よりやや上）だけを見せる。
function LogoIcon() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: RobotSaludando,
    });
    // DOMLoaded 前に goToAndStop すると描画されないフレームで止まることがあるため、
    // ロード完了イベントを待ってから停止フレームを指定する。
    const handleLoaded = () => anim.goToAndStop(0, true);
    anim.addEventListener('DOMLoaded', handleLoaded);
    return () => {
      anim.removeEventListener('DOMLoaded', handleLoaded);
      anim.destroy();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{ width: 44, height: 44, overflow: 'hidden', flexShrink: 0, position: 'relative' }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          // 800x800 の全身画像のうち、目・口を含む頭部まわり（およそ x:49%, y:40% 付近が中心）だけが
          // 見えるよう拡大する。head/eye/mouth レイヤーの座標から概算した値のため、実際の見た目は
          // ブラウザで確認しながら scale・transformOrigin を微調整すること（完了報告に明記）。
          transform: 'scale(2.6)',
          transformOrigin: '49% 40%',
        }}
      />
    </div>
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
