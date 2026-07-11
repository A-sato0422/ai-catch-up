import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import lottie from 'lottie-web';
import RobotSaludando from '../assets/lottie/RobotSaludando.json';
import { ScreenIconGlyph } from '../components/ScreenIcon';
import { getScreenGradient } from '../lib/screenGradients';
import { buildAllScreens } from '../lib/screens';
import { loadButtonSelection } from '../lib/buttonSettings';
import { fetchDailySummary, FALLBACK_SUMMARY } from '../lib/dailySummary';

const BUBBLE_APPEAR_MS = 1100;
const CHAR_INTERVAL_MS = 55;
// ボタン出現アニメーションの基準ディレイ・刻み幅（ボタン数が可変になったため index から算出する）
const NAV_ANIM_BASE_DELAY = 0.55;
const NAV_ANIM_STEP = 0.1;

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

export default function HomePage() {
  const navigate = useNavigate();
  const robotRef = useRef<HTMLDivElement>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(false);
  // ホームのボタン配列は設定（localStorage）から動的生成する（固定枠2 + 自由枠最大5。G-1）
  const [screens] = useState(() => buildAllScreens(loadButtonSelection()));
  // 吹き出しの一言サマリー（G-5・daily_summaries の当日行。D-032）。
  // 取得完了までは null にしておき、完了後に文字送りアニメーションを開始する。
  // サイズ確定用の非表示プレースホルダーはフォールバック文言で仮置きし、レイアウトの揺れを避ける。
  const [summaryText, setSummaryText] = useState<string | null>(null);

  useEffect(() => {
    if (!robotRef.current) return;
    const anim = lottie.loadAnimation({
      container: robotRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: RobotSaludando,
    });
    return () => anim.destroy();
  }, []);

  // daily_summaries の当日行を取得する（G-5・D-032）。取得完了・失敗いずれもフォールバック文言に収束する
  useEffect(() => {
    let cancelled = false;
    fetchDailySummary().then(text => {
      if (!cancelled) setSummaryText(text);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // サマリー取得が完了してから文字送りアニメーションを開始する
  useEffect(() => {
    if (summaryText === null) return;

    const startTimer = setTimeout(() => {
      setShowCursor(true);
      let i = 0;
      const ticker = setInterval(() => {
        i++;
        setDisplayedText(summaryText.slice(0, i));
        if (i >= summaryText.length) {
          clearInterval(ticker);
          setTimeout(() => setShowCursor(false), 900);
        }
      }, CHAR_INTERVAL_MS);
      return () => clearInterval(ticker);
    }, BUBBLE_APPEAR_MS);

    return () => clearTimeout(startTimer);
  }, [summaryText]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: 'calc(100vh - 75px)',
      padding: '0 clamp(20px, 5vw, 56px)',
    }}>
      <div style={{ flex: 2 }} />

      {/* Robot + speech bubble — 画面幅が小さいときは縦並びにして視認性を保つ（フェーズI） */}
      <div
        className="flex-col sm:flex-row items-center sm:items-start"
        style={{
          display: 'flex',
          gap: 'clamp(16px, 3vw, 32px)',
          width: '100%', maxWidth: 700,
        }}
      >
        {/* Robot Lottie animation */}
        <div
          ref={robotRef}
          style={{
            width: 'clamp(160px, 24vw, 260px)',
            flexShrink: 0,
            animation: 'fadeInUp 0.45s ease 0.25s both',
          }}
        />

        {/* Speech bubble — appears last */}
        <div
          className="mt-0 sm:mt-3"
          style={{ position: 'relative', animation: 'fadeInUp 0.4s ease 1.1s both' }}
        >
          {/* Triangle — 横並び（sm 以上）のときだけ意味を持つポインタなので、縦並びでは非表示にする */}
          <span className="hidden sm:block" style={{
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
                {summaryText ?? FALLBACK_SUMMARY}
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

      {/* Navigation buttons — 統合画面リスト（TOP5 固定 → 自由枠最大5 → お気に入り固定）から動的生成 */}
      <div style={{
        display: 'flex', flexWrap: 'wrap',
        gap: 'clamp(12px, 2.5vw, 24px)',
        justifyContent: 'center', alignItems: 'center',
      }}>
        {screens.map((screen, i) => {
          const [gradientFrom, gradientTo] = getScreenGradient(screen.icon);
          const path = screen.special ? `/${screen.id}` : `/screen/${screen.id}`;
          return (
            <NavCircle
              key={screen.id}
              onClick={() => navigate(path)}
              label={screen.label}
              gradientFrom={gradientFrom}
              gradientTo={gradientTo}
              animDelay={`${NAV_ANIM_BASE_DELAY + i * NAV_ANIM_STEP}s`}
            >
              <ScreenIconGlyph kind={screen.icon} size={28} />
            </NavCircle>
          );
        })}
      </div>

      {/* 設定画面への導線（フェーズI）。ボタン数が変わっても案内が埋もれないよう控えめなサイズで下に配置する */}
      <button
        onClick={() => navigate('/settings')}
        style={{
          marginTop: 16,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--muted2)',
          fontSize: 12.5,
          fontWeight: 600,
          fontFamily: 'inherit',
          padding: 4,
          textDecoration: 'underline',
          textUnderlineOffset: 3,
        }}
      >
        ボタンをカスタマイズする
      </button>

      <div style={{ flex: 3 }} />
    </div>
  );
}
