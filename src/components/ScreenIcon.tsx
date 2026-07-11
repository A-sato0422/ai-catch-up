import GroupIconSvg from './GroupIcon';
import { getScreenGradient } from '../lib/screenGradients';
import type { ScreenIconKind } from '../types';

const ICON_COLOR = 'var(--muted)';

/** 重要トピック用: 王冠 + 先端の丸 3 個 + 中央に「1」 */
function PodiumIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="5" r="1.3" stroke={ICON_COLOR} strokeWidth="1.4" />
      <circle cx="12" cy="3.3" r="1.3" stroke={ICON_COLOR} strokeWidth="1.4" />
      <circle cx="19" cy="5" r="1.3" stroke={ICON_COLOR} strokeWidth="1.4" />
      <path
        d="M4 17.5L5.3 7.3L8.7 11.2L12 5.1L15.3 11.2L18.7 7.3L20 17.5Z"
        stroke={ICON_COLOR} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"
      />
      <path d="M4 17.5h16" stroke={ICON_COLOR} strokeWidth="1.4" strokeLinecap="round" />
      <text x="12" y="16.3" textAnchor="middle" fontSize="7" fontWeight="700" fill={ICON_COLOR}>1</text>
    </svg>
  );
}

function HeartIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <path
        d="M11 19C11 19 2 13 2 7.5C2 5 4 3 6.5 3C8 3 9.4 3.8 10.3 5C10.7 5.6 11 5.6 11.7 5C12.6 3.8 14 3 15.5 3C18 3 20 5 20 7.5C20 13 11 19 11 19Z"
        stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

/** ホームのボタン・BottomNav で使う素のアイコン（ホバー/アクティブ時は呼び出し側で白反転させる） */
export function ScreenIconGlyph({ kind, size = 20 }: { kind: ScreenIconKind; size?: number }) {
  if (kind === 'top5') return <PodiumIcon size={size} />;
  if (kind === 'fav') return <HeartIcon size={size} />;
  return <GroupIconSvg icon={kind} size={size} />;
}

/** リスト画面ヘッダー用: グラデーション背景 + 白抜きアイコンのバッジ */
export function ScreenIconBadge({ kind, size = 42 }: { kind: ScreenIconKind; size?: number }) {
  const [from, to] = getScreenGradient(kind);
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        background: `linear-gradient(135deg, ${from}, ${to})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ display: 'flex', filter: 'brightness(0) invert(1)' }}>
        <ScreenIconGlyph kind={kind} size={Math.round(size * 0.5)} />
      </span>
    </span>
  );
}
