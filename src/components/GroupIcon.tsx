import type { GroupIcon } from '../lib/buttonSettings';

interface Props {
  icon: GroupIcon;
  size?: number;
}

/**
 * グループ別アイコン SVG（デザイン正本: claude.ai/design「Button Settings.dc.html」からコピー）。
 * SettingsPage・HomePage・BottomNav の 3 箇所で共有するため抽出した（G-1）。
 */
export default function GroupIconSvg({ icon, size = 20 }: Props) {
  switch (icon) {
    case 'gemini':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 1.5c.7 5 3.5 7.8 8.5 8.5-5 .7-7.8 3.5-8.5 8.5-.7-5-3.5-7.8-8.5-8.5C8.5 9.3 11.3 6.5 12 1.5z" fill="#2f6df0" />
        </svg>
      );
    case 'claude':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 1.5c.7 5 3.5 7.8 8.5 8.5-5 .7-7.8 3.5-8.5 8.5-.7-5-3.5-7.8-8.5-8.5C8.5 9.3 11.3 6.5 12 1.5z" fill="#ff5a2c" />
        </svg>
      );
    case 'codex':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9.5" stroke="#10a37f" strokeWidth="1.9" />
          <path d="M9 9l-3 3 3 3M15 9l3 3-3 3" stroke="#10a37f" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'office':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#22a06b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
          <path d="M15 9h2a2 2 0 0 1 2 2v10" />
          <path d="M9 7h2M9 11h2M9 15h2" />
        </svg>
      );
    case 'exec':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 3 3 5-6" />
        </svg>
      );
  }
}
