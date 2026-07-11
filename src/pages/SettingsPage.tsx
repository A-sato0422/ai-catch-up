import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SETTINGS_GROUPS,
  MAX_CUSTOM_BUTTONS,
  checkboxId,
  countSelectedButtons,
  isGroupSelected,
  loadButtonSelection,
  saveButtonSelection,
} from '../lib/buttonSettings';
import type { ButtonSelection } from '../lib/buttonSettings';
// アイコン SVG は HomePage / BottomNav と共有するため src/components/GroupIcon.tsx へ抽出済み（G-1）
import GroupIconSvg from '../components/GroupIcon';
// G-2 残タスク: 属性の再選択導線（G-3 の AttributePopup を設定画面からモーダルとして再利用）
import AttributePopup from '../components/AttributePopup';
import { presetForAttribute, type AttributeId } from '../lib/attributePresets';

function TitleIcon() {
  return (
    <span
      style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        background: 'var(--logo-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: '#3a72f0',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="9" r="3" />
        <path d="M6 9v6" />
        <path d="M9 6.5h4a2 2 0 0 1 2 2v.5" />
      </svg>
    </span>
  );
}

function CheckIcon({ size, strokeWidth }: { size: number; strokeWidth: number }) {
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
  disabled,
  onToggle,
}: {
  label: string;
  desc: string;
  checked: boolean;
  disabled: boolean;
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
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'border-color .18s, background .18s, opacity .18s',
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
        <span style={{ fontSize: 15, fontWeight: 700, color: disabled ? 'var(--muted)' : 'var(--title)' }}>
          {label}
        </span>
        <span style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--muted2)', textWrap: 'pretty' }}>
          {desc}
        </span>
      </span>
    </label>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  // ページ内 state で編集し、「保存する」で初めて localStorage に書き込む
  const [selection, setSelection] = useState<ButtonSelection>(() => loadButtonSelection());
  // G-2 残タスク: 属性の再選択導線（G-3 の AttributePopup を設定画面からモーダルとして再利用）
  const [showAttributePopup, setShowAttributePopup] = useState(false);

  const count = countSelectedButtons(selection);
  const atLimit = count >= MAX_CUSTOM_BUTTONS;

  const toggle = (groupKey: string, sub: string) => {
    const id = checkboxId(groupKey, sub);
    const on = selection[id] === true;
    // 上限判定はボタン数（グループ数）基準。既にボタンが立っているグループへの
    // 追加チェックはボタン数が増えないため、上限中でも許容する
    if (!on && atLimit && !isGroupSelected(selection, groupKey)) return;
    setSelection((prev) => ({ ...prev, [id]: !on }));
  };

  const handleSave = () => {
    saveButtonSelection(selection);
    navigate('/');
  };

  const handleCancel = () => {
    navigate('/');
  };

  // 属性プリセットの適用は一括操作のため「その場で確定」とする（保存する ボタンを待たない）。
  // localStorage への保存とページ内 state の両方を即時更新し、チェックボックス群に反映する。
  const handleAttributeSelect = (attribute: AttributeId) => {
    const preset = presetForAttribute(attribute);
    saveButtonSelection(preset);
    setSelection(preset);
    setShowAttributePopup(false);
  };

  const sidePad = 'clamp(20px, 4vw, 42px)';

  return (
    <div style={{ animation: 'fadeInUp 0.4s ease 0s both' }}>
      {/* title block */}
      <div style={{ padding: `32px ${sidePad} 6px` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <TitleIcon />
          <h1
            style={{
              fontSize: 'clamp(22px, 4vw, 30px)',
              fontWeight: 800,
              color: 'var(--title)',
              margin: 0,
              letterSpacing: '.2px',
              whiteSpace: 'nowrap',
            }}
          >
            表示するボタンを選ぶ
          </h1>
        </div>
        <div
          className="ml-0 sm:ml-14"
          style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px' }}
        >
          <span style={{ color: 'var(--muted)', fontSize: 14.5 }}>
            最大5つまで選べます（重要トピック・お気に入りは常に表示）
          </span>
          <button
            onClick={() => setShowAttributePopup(true)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#ff5a2c',
              fontSize: 13.5,
              fontWeight: 700,
              fontFamily: 'inherit',
              padding: 0,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            属性から選び直す
          </button>
        </div>
      </div>

      {/* count bar */}
      <div
        className="flex-wrap"
        style={{ padding: `16px ${sidePad} 4px`, display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 13px',
            borderRadius: 9,
            background: atLimit ? 'var(--sel-soft)' : 'var(--bubble-bg)',
            color: atLimit ? '#ef5c34' : 'var(--muted2)',
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          <CheckIcon size={15} strokeWidth={2.4} />
          {count}/{MAX_CUSTOM_BUTTONS} 選択中
        </span>
        {atLimit && (
          <span style={{ color: 'var(--muted2)', fontSize: 13.5 }}>
            上限に達しました。変更するには他の選択を外してください。
          </span>
        )}
      </div>

      {/* groups */}
      <div
        style={{
          padding: 'clamp(14px, 2vw, 14px) clamp(14px, 3vw, 30px) 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
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
                const disabled = !checked && atLimit && !isGroupSelected(selection, group.key);
                return (
                  <CheckboxRow
                    key={item.sub}
                    label={item.label}
                    desc={item.desc}
                    checked={checked}
                    disabled={disabled}
                    onToggle={() => toggle(group.key, item.sub)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* footer save */}
      <div
        style={{
          padding: `16px ${sidePad} 40px`,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 18,
          borderTop: '1px solid var(--hairline)',
          marginTop: 12,
        }}
      >
        <button
          onClick={handleCancel}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--muted2)',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'inherit',
            padding: '10px 6px',
          }}
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          style={{
            border: 'none',
            cursor: 'pointer',
            height: 54,
            padding: '0 40px',
            borderRadius: 27,
            background: 'linear-gradient(135deg, #ff8a45, #ff4d28)',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: '.4px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            animation: 'acGlow 2.6s ease-in-out infinite',
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <path d="M17 21v-8H7v8M7 3v5h8" />
          </svg>
          保存する
        </button>
      </div>

      {showAttributePopup && (
        <AttributePopup
          onSelect={handleAttributeSelect}
          onClose={() => setShowAttributePopup(false)}
        />
      )}
    </div>
  );
}
