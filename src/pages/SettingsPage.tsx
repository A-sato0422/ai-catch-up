import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  countSelectedButtons,
  checkboxId,
  loadButtonSelection,
  saveButtonSelection,
  buildFullSelection,
} from '../lib/buttonSettings';
import type { ButtonSelection } from '../lib/buttonSettings';
// フェーズI: グループ別チェックボックス群は設定画面・初回属性選択の共通コンポーネントへ抽出済み
import ButtonGroupChecklist, { CheckIcon } from '../components/ButtonGroupChecklist';
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

export default function SettingsPage() {
  const navigate = useNavigate();
  const { dark } = useTheme();
  // ページ内 state で編集し、「保存する」で初めて localStorage に書き込む
  const [selection, setSelection] = useState<ButtonSelection>(() => loadButtonSelection());
  // G-2 残タスク: 属性の再選択導線（G-3 の AttributePopup を設定画面からモーダルとして再利用）
  const [showAttributePopup, setShowAttributePopup] = useState(false);

  const count = countSelectedButtons(selection);

  const toggle = (groupKey: string, sub: string) => {
    const id = checkboxId(groupKey, sub);
    setSelection((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // フェーズI: 一括全選択 / 全解除
  const handleSelectAll = () => setSelection(buildFullSelection());
  const handleDeselectAll = () => setSelection({});

  const handleSave = () => {
    saveButtonSelection(selection);
    navigate('/');
  };

  const handleCancel = () => {
    navigate('/');
  };

  // フェーズI: 属性プリセットの適用はページ内 state のみを更新し、localStorage への保存は
  // 「保存する」ボタン押下時にまとめて行う（以前は選択した瞬間に保存されてしまっていたバグの修正）。
  const handleAttributeSelect = (attribute: AttributeId) => {
    setSelection(presetForAttribute(attribute));
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
            重要トピック・お気に入りは常に表示されます
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

      {/* count bar + 一括操作（フェーズI） */}
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
            background: 'var(--bubble-bg)',
            color: 'var(--muted2)',
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          <CheckIcon size={15} strokeWidth={2.4} />
          {count} 個選択中
        </span>

        <button
          onClick={handleSelectAll}
          style={{
            border: '1px solid var(--pill-line)',
            background: 'var(--pill-bg)',
            cursor: 'pointer',
            color: 'var(--muted2)',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'inherit',
            padding: '6px 13px',
            borderRadius: 9,
          }}
        >
          すべて選択
        </button>
        <button
          onClick={handleDeselectAll}
          style={{
            border: '1px solid var(--pill-line)',
            background: 'var(--pill-bg)',
            cursor: 'pointer',
            color: 'var(--muted2)',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'inherit',
            padding: '6px 13px',
            borderRadius: 9,
          }}
        >
          すべて解除
        </button>
      </div>

      {/* groups */}
      <div
        className="md:pb-28"
        style={{
          padding: 'clamp(14px, 2vw, 14px) clamp(14px, 3vw, 30px) 8px',
        }}
      >
        <ButtonGroupChecklist selection={selection} onToggle={toggle} />
      </div>

      {/*
        footer save/cancel — フェーズI: PC 表示（md 以上）では画面右下に固定表示する。
        モバイルはこれまでどおりコンテンツ末尾に静的配置する。
        `position: fixed` はページ全体の祖先チェーンに transform/filter/perspective 等を持つ要素があると
        その要素基準にクリップされてしまう（この SettingsPage 自身のルート div が
        `animation: fadeInUp ...`（fill-mode both → 終了後も `transform: translateY(0)` が残る）を
        持つため、footer をそのまま子孫に置くと fixed が画面基準にならないバグがあった）。
        AttributePopup と同じ理由・同じ対処として `document.body` へ直接ポータル表示する。
        ポータル先は `[data-theme]` スコープ（Layout.tsx）の外になるため、ダークモード用 CSS 変数が
        正しく解決されるようこの div 自身に `data-theme` を付け直す。
      */}
      {createPortal(
        <div
          data-theme={dark ? 'dark' : 'light'}
          className="border-t md:border md:border-t md:rounded-2xl md:shadow-xl md:fixed md:bottom-6 md:right-8 md:z-40 md:bg-[var(--card)]"
          style={{
            padding: `16px ${sidePad} 40px`,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 18,
            borderColor: 'var(--hairline)',
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
        </div>,
        document.body,
      )}

      {showAttributePopup && (
        <AttributePopup
          onSelect={handleAttributeSelect}
          onClose={() => setShowAttributePopup(false)}
        />
      )}
    </div>
  );
}
