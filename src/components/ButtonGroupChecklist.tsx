import { SETTINGS_GROUPS, checkboxId, type ButtonSelection } from '../lib/buttonSettings';
import GroupIconSvg from './GroupIcon';

// 設定画面（G-2）と初回属性選択（フェーズI・AttributeOnboarding）で共有するチェックボックス群。
// 上限（旧 MAX_CUSTOM_BUTTONS による disabled 制御）はフェーズIで撤廃済みのため、
// このコンポーネントに disabled の概念は持たせない。

export function CheckIcon({ size, strokeWidth }: { size: number; strokeWidth: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function CheckboxRow({
  label,
  desc,
  checked,
  onToggle,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 13,
        padding: '14px 16px',
        borderRadius: 12,
        border: `1.5px solid ${checked ? '#ff5a2c' : 'var(--chip-line)'}`,
        background: checked ? 'var(--sel-soft)' : 'var(--chip-bg)',
        cursor: 'pointer',
        transition: 'border-color .18s, background .18s',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          flexShrink: 0,
          marginTop: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all .18s',
          border: `2px solid ${checked ? '#ff5a2c' : 'var(--box-line)'}`,
          background: checked ? '#ff5a2c' : 'transparent',
          color: '#fff',
        }}
      >
        {checked && <CheckIcon size={14} strokeWidth={3.2} />}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--title)' }}>
          {label}
        </span>
        <span style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--muted2)', textWrap: 'pretty' }}>
          {desc}
        </span>
      </span>
    </label>
  );
}

interface Props {
  selection: ButtonSelection;
  onToggle: (groupKey: string, sub: string) => void;
}

/** グループ別チェックボックス一覧（設定画面・初回属性選択の両方で使う共通 UI。フェーズI）。 */
export default function ButtonGroupChecklist({ selection, onToggle }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {SETTINGS_GROUPS.map((group) => (
        <div
          key={group.key}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--card-line)',
            borderRadius: 16,
            boxShadow: 'var(--card-shadow)',
            padding: 'clamp(14px, 2.5vw, 18px) clamp(14px, 3vw, 22px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 15 }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'var(--logo-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <GroupIconSvg icon={group.icon} />
            </span>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--title)', letterSpacing: '.3px' }}>
              {group.name}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {group.items.map((item) => {
              const checked = selection[checkboxId(group.key, item.sub)] === true;
              return (
                <CheckboxRow
                  key={item.sub}
                  label={item.label}
                  desc={item.desc}
                  checked={checked}
                  onToggle={() => onToggle(group.key, item.sub)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
