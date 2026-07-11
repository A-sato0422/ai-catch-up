import type { GroupIcon } from '../lib/buttonSettings';

interface Props {
  icon: GroupIcon;
  size?: number;
}

// 通常表示はモノトーン（var(--muted)）に統一する。ホバー時の配色は呼び出し側（HomePage/BottomNav）の
// CSS filter（brightness(0) invert(1)）が担うため、ここでの色指定はホバー時の見た目に影響しない。
const ICON_COLOR = 'var(--muted)';

/**
 * グループ別アイコン SVG（デザイン正本: ChatGPT Image 2026年7月11日 07_15_29.png のボタンアイコンを
 * 忠実に再現）。SettingsPage・HomePage・BottomNav の 3 箇所で共有するため抽出した（G-1）。
 */
export default function GroupIconSvg({ icon, size = 20 }: Props) {
  switch (icon) {
    case 'gemini':
      // 4方向のスパークル（アウトライン）
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 1.5c.7 5 3.5 7.8 8.5 8.5-5 .7-7.8 3.5-8.5 8.5-.7-5-3.5-7.8-8.5-8.5C8.5 9.3 11.3 6.5 12 1.5z"
            stroke={ICON_COLOR} strokeWidth="1.4" strokeLinejoin="round"
          />
        </svg>
      );
    case 'claude':
      // 放射状バースト（16本、長短交互）
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <g stroke={ICON_COLOR} strokeWidth="1.3" strokeLinecap="round">
            <line x1="12" y1="9" x2="12" y2="2" />
            <line x1="13.15" y1="9.23" x2="14.68" y2="5.53" />
            <line x1="14.12" y1="9.88" x2="19.07" y2="4.93" />
            <line x1="14.77" y1="10.85" x2="18.47" y2="9.32" />
            <line x1="15" y1="12" x2="22" y2="12" />
            <line x1="14.77" y1="13.15" x2="18.47" y2="14.68" />
            <line x1="14.12" y1="14.12" x2="19.07" y2="19.07" />
            <line x1="13.15" y1="14.77" x2="14.68" y2="18.47" />
            <line x1="12" y1="15" x2="12" y2="22" />
            <line x1="10.85" y1="14.77" x2="9.32" y2="18.47" />
            <line x1="9.88" y1="14.12" x2="4.93" y2="19.07" />
            <line x1="9.23" y1="13.15" x2="5.53" y2="14.68" />
            <line x1="9" y1="12" x2="2" y2="12" />
            <line x1="9.23" y1="10.85" x2="5.53" y2="9.32" />
            <line x1="9.88" y1="9.88" x2="4.93" y2="4.93" />
            <line x1="10.85" y1="9.23" x2="9.32" y2="5.53" />
          </g>
        </svg>
      );
    case 'codex':
      // OpenAI ロゴマーク
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path
            fill={ICON_COLOR}
            d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.7948.7948 0 0 0-.4069-.6765zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.4592a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.6069 1.4997-2.602-1.4997z"
          />
        </svg>
      );
    case 'office':
      // 電卓（バックオフィス業務を一目で表す）
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="5" y="2" width="14" height="20" rx="2" stroke={ICON_COLOR} strokeWidth="1.5" />
          <rect x="7" y="4.3" width="10" height="4" rx="0.6" stroke={ICON_COLOR} strokeWidth="1.3" />
          <rect x="7" y="11" width="2.6" height="2.2" rx="0.5" fill={ICON_COLOR} />
          <rect x="10.7" y="11" width="2.6" height="2.2" rx="0.5" fill={ICON_COLOR} />
          <rect x="14.4" y="11" width="2.6" height="2.2" rx="0.5" fill={ICON_COLOR} />
          <rect x="7" y="14.1" width="2.6" height="2.2" rx="0.5" fill={ICON_COLOR} />
          <rect x="10.7" y="14.1" width="2.6" height="2.2" rx="0.5" fill={ICON_COLOR} />
          <rect x="14.4" y="14.1" width="2.6" height="2.2" rx="0.5" fill={ICON_COLOR} />
          <rect x="7" y="17.2" width="2.6" height="2.2" rx="0.5" fill={ICON_COLOR} />
          <rect x="10.7" y="17.2" width="2.6" height="2.2" rx="0.5" fill={ICON_COLOR} />
          <rect x="14.4" y="17.2" width="2.6" height="2.2" rx="0.5" fill={ICON_COLOR} />
        </svg>
      );
    case 'exec':
      // 成長グラフ（増加する棒グラフ + 右肩上がりの矢印）
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="16" width="2.4" height="4" rx="0.3" fill={ICON_COLOR} />
          <rect x="7.2" y="13" width="2.4" height="7" rx="0.3" fill={ICON_COLOR} />
          <rect x="11.4" y="10" width="2.4" height="10" rx="0.3" fill={ICON_COLOR} />
          <rect x="15.6" y="6.5" width="2.4" height="13.5" rx="0.3" fill={ICON_COLOR} />
          <path
            d="M2.5 15L8 10L12.5 13L20 3M14 3L20 3L20 9"
            stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      );
  }
}
