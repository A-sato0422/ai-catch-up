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

  // krobo ロゴの CSS アニメーションを lottie の再生開始と同じタイミングで始めるためのフラグ。
  // マウント時点で CSS アニメーションを開始すると lottie（useEffect 内で開始）と最大1フレームずれるため、
  // 同じ effect 内で立てて両者のタイムラインの起点を揃える。
  const [robotStarted, setRobotStarted] = useState(false);

  useEffect(() => {
    if (!robotRef.current) return;
    const anim = lottie.loadAnimation({
      container: robotRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: RobotSaludando,
    });
    setRobotStarted(true);
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
        {/*
          Robot Lottie animation + 「krobo」ロゴのオーバーレイ（フェーズJ）。
          lottie-web が robotRef の innerHTML を完全に管理するため、ロゴを直接 DOM に挿し込むことはできない。
          代わりに relative コンテナで robotRef に重ね、pointer-events: none の absolute な文字要素として置く。
          上下運動は RobotSaludando.json の胴体レイヤーの position キーフレームを CSS keyframes（roboBob。
          src/index.css）へそのまま写した値で、周期 6.46667 秒（194フレーム/30fps）・イージングも Lottie 側と
          同一。振幅はキャンバス(800px)比のため描画幅 --robot-w を CSS 変数で共有して比例させる。
          アニメーション開始は robotStarted（lottie 再生開始と同じ effect 内で立つ）まで遅らせ、起点を揃える。
        */}
        <div
          style={{
            position: 'relative',
            // width と roboBob の振幅計算（keyframes 内の calc）で同じ値を使うため CSS 変数で共有する
            ['--robot-w' as string]: 'clamp(160px, 24vw, 260px)',
            width: 'var(--robot-w)',
            flexShrink: 0,
            animation: 'fadeInUp 0.45s ease 0.25s both',
          }}
        >
          <div ref={robotRef} style={{ width: '100%' }} />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '50%',
              top: '58%',
              // roboBob 自身が translate(-50%,-50%) を含むため、ここでは初期値として同じ変換を指定しておく
              // （アニメーション開始前のチラつき防止）。
              transform: 'translate(-50%, -50%)',
              fontFamily: "'Noto Sans JP', -apple-system, sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(11px, 1.7vw, 15px)',
              letterSpacing: '0.14em',
              color: 'rgba(255, 255, 255, 0.6)',
              textShadow: '0 1px 0 rgba(255,255,255,0.3), 0 -1px 1px rgba(0,0,0,0.5)',
              mixBlendMode: 'overlay',
              pointerEvents: 'none',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              // イージングは keyframes 内で区間ごとに指定済みのため、ここは linear を基底にする
              animation: robotStarted ? 'roboBob 6.46667s linear infinite' : 'none',
            }}
          >
            krobo
          </span>
        </div>

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

      {/*
        設定画面への導線（フェーズI・J-2で控えめな見た目に調整）。
        目立ちすぎるという指摘のため、下線を外し・色を var(--muted)（より薄い）に・フォントサイズを
        小さくして存在感を落とす（クリックできることは維持）。ボタン列との余白も広げて誤タップを防ぐ。
      */}
      <button
        onClick={() => navigate('/settings')}
        style={{
          marginTop: 32,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--muted)',
          fontSize: 11.5,
          fontWeight: 500,
          fontFamily: 'inherit',
          padding: 4,
        }}
      >
        ボタンをカスタム
      </button>

      <div style={{ flex: 3 }} />
    </div>
  );
}
