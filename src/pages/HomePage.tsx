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
    // fadeInUp はボタンと SP 用ラベルを同じタイミングで出すためラッパーに掛ける
    // （ボタン単体に掛けていた従来と見た目のタイミングは変わらない）。
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        animation: `fadeInUp 0.45s ease ${animDelay} both`,
      }}
    >
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
      {/*
        SP にはホバーが無くアイコンだけでは用途が分からないため、ボタン名を常時表示する（フェーズJ追加分）。
        sm 以上（ホバーが使える幅）では従来どおりホバー時のラベル展開に任せて非表示にし、
        PC の既存デザイン・ホバー挙動は変えない。
      */}
      <span
        className="sm:hidden"
        style={{
          marginTop: 6,
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--muted)',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
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
    // krobo ロゴは Lottie アニメーション内の画像レイヤー（RobotSaludando.json の "krobo" レイヤー）
    // として埋め込み済みのため、本体と同じ再生クロックで動く。DOM 側での同期処理は不要。
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
      // 縦パディング: 低さのある画面（iPhone SE 等）では flex スペーサーが 0 まで潰れて
      // ヘッダーと吹き出しが密着するため、最低限の余白をパディングで保証する
      padding: 'clamp(20px, 4vh, 44px) clamp(20px, 5vw, 56px)',
    }}>
      <div style={{ flex: 2 }} />

      {/*
        Robot + speech bubble — 画面幅が小さいときは縦並びにして視認性を保つ（フェーズI）。
        SP では吹き出しを上・ロボットを下に置くため col-reverse（DOM 順は robot→bubble のままにして
        fadeInUp の出現順・delay を変えない）。
      */}
      <div
        className="flex-col-reverse sm:flex-row items-center sm:items-start"
        style={{
          display: 'flex',
          gap: 'clamp(16px, 3vw, 32px)',
          width: '100%', maxWidth: 700,
        }}
      >
        {/*
          Robot Lottie animation（方式A）。「krobo」ロゴは RobotSaludando.json に画像レイヤーとして
          埋め込み済みのため、本体と同じ再生クロックで動く。DOM 側のオーバーレイ・同期処理は不要。
        */}
        <div
          style={{
            width: 'clamp(160px, 24vw, 260px)',
            flexShrink: 0,
            animation: 'fadeInUp 0.45s ease 0.25s both',
          }}
        >
          <div ref={robotRef} style={{ width: '100%' }} />
        </div>

        {/* Speech bubble — appears last */}
        <div
          className="mt-0 sm:mt-3"
          style={{ position: 'relative', animation: 'fadeInUp 0.4s ease 1.1s both' }}
        >
          {/* Triangle（PC・横並び）— 左にいるロボットへ向けて左辺から出す */}
          <span className="hidden sm:block" style={{
            position: 'absolute',
            left: -14, top: 24,
            borderWidth: '8px 14px 8px 0',
            borderStyle: 'solid',
            borderColor: 'transparent var(--bubble-bg) transparent transparent',
          }} />

          {/*
            Triangle（SP・縦並び）— 吹き出しが上・ロボットが下（col-reverse）のため、
            吹き出し口は下辺中央から下向きに出す。bottom を -12px（高さ 13px）にして本体と 1px 重ね、
            継ぎ目の線を防ぐ。
          */}
          <span className="block sm:hidden" style={{
            position: 'absolute',
            bottom: -12, left: '50%',
            transform: 'translateX(-50%)',
            borderWidth: '13px 9px 0 9px',
            borderStyle: 'solid',
            borderColor: 'var(--bubble-bg) transparent transparent transparent',
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
        目立ちすぎるという指摘のため、色を var(--muted)（より薄い）に・フォントサイズを小さくして
        存在感を落とす。ただしリンクと分かる程度のアンダーラインは付ける（フェーズJ追加分）。
        出現はナビボタンと同じ fadeInUp で、最後のボタンの次のディレイに続けて表示する。
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
          textDecoration: 'underline',
          textUnderlineOffset: 3,
          animation: `fadeInUp 0.45s ease ${NAV_ANIM_BASE_DELAY + screens.length * NAV_ANIM_STEP}s both`,
        }}
      >
        ボタンをカスタム
      </button>

      <div style={{ flex: 3 }} />
    </div>
  );
}
