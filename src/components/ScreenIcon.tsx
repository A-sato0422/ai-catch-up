import GroupIconSvg from './GroupIcon';
import { getScreenGradient } from '../lib/screenGradients';
import type { ScreenIconKind } from '../types';

const ICON_COLOR = 'var(--muted)';

function FlameIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <path
        d="M11 2C9.5 5 7 7.5 7 11.5C7 14.5 8.8 17 11 17C13.2 17 15 14.5 15 11.5C15 9.5 14.2 8 13 7C13 9 11.8 10.2 11 10.5C11 7.5 12 4.5 11 2Z"
        stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
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
  if (kind === 'top5') return <FlameIcon size={size} />;
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
