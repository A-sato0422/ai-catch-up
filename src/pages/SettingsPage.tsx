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

function BackArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

// フェーズJ: フッターは「保存する」ボタン単体になったため共通化する
// （モバイルの静的フッター・PCのフローティングボタンの両方で使う）。
function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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
        // J-5: 背景のカード（白い div）を無くしてボタン単体を浮かせるため、影を少し強めて
        // 「浮いている」感を保つ。
        boxShadow: '0 10px 28px rgba(255, 77, 40, 0.4)',
        animation: 'acGlow 2.6s ease-in-out infinite',
      }}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <path d="M17 21v-8H7v8M7 3v5h8" />
      </svg>
      保存する
    </button>
  );
}

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

  // J-1: 「ひとつ前の画面に戻る」。ヘッダーの歯車アイコンはどの画面からでも押せるため、
  // 常にホームへ固定遷移するのではなくブラウザ履歴で1つ戻る。react-router（history パッケージ）は
  // window.history.state.idx にセッション内の履歴インデックスを積んでいるため、それが 0（このアプリの
  // 履歴スタックの先頭 = 直接 URL を叩いて来た等で戻り先が無い）の場合のみホームへフォールバックする。
  const handleBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
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
        {/* J-1: ひとつ前の画面に戻る導線（歯車アイコンはどの画面からでも押せるため、ホーム固定遷移をやめる） */}
        <button
          onClick={handleBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            marginLeft: -4,
            marginBottom: 10,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--muted2)',
            fontSize: 13.5,
            fontWeight: 700,
            fontFamily: 'inherit',
            padding: '4px',
          }}
        >
          <BackArrowIcon />
          戻る
        </button>
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
            「重要トピック」ボタン「お気に入り」ボタンは常に表示されます
          </span>
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
          {count} 個のボタンを追加
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
        footer save — フェーズJ: 「戻る」導線（J-1）ができたのでキャンセルボタンは削除。
        モバイル（<md）はこれまでどおりコンテンツ末尾に静的な保存導線を置く。
      */}
      <div
        className="flex md:hidden"
        style={{
          padding: `16px ${sidePad} 40px`,
          justifyContent: 'flex-end',
          borderTop: '1px solid var(--hairline)',
          marginTop: 12,
        }}
      >
        <SaveButton onClick={handleSave} />
      </div>

      {/*
        footer save — PC 表示（md 以上）はボタン単体を浮かせて表示する（J-5: 背景のカード・枠線は
        表示しない）。
        `position: fixed` はページ全体の祖先チェーンに transform/filter/perspective 等を持つ要素があると
        その要素基準にクリップされてしまう（この SettingsPage 自身のルート div が
        `animation: fadeInUp ...`（fill-mode both → 終了後も `transform: translateY(0)` が残る）を
        持つため、そのまま子孫に置くと fixed が画面基準にならないバグがあった）。
        AttributePopup と同じ理由・同じ対処として `document.body` へ直接ポータル表示する。
        ポータル先は `[data-theme]` スコープ（Layout.tsx）の外になるため、ダークモード用 CSS 変数が
        正しく解決されるようこの div 自身に `data-theme` を付け直す。
        J-6: 画面右端ではなく「コンテンツ列（Layout.tsx の max-width: 1180px）の右下」に重ねて表示したい
        ため、outer は `position: fixed; inset: 0; pointer-events: none` の透明な全画面レイヤーにし、
        その内側に同じ max-width + `margin: 0 auto` のコンテナを重ね、その中でボタンを
        `position: absolute; bottom; right: sidePad` に置く。sidePad はカード列の左右余白と同じ値なので、
        ウルトラワイド画面でもボタンがカード列の右下に留まる。
      */}
      {createPortal(
        <div
          data-theme={dark ? 'dark' : 'light'}
          className="hidden md:block"
          style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 40 }}
        >
          <div style={{ maxWidth: 1180, margin: '0 auto', position: 'relative', height: '100%' }}>
            <div style={{ position: 'absolute', bottom: 24, right: sidePad, pointerEvents: 'auto' }}>
              <SaveButton onClick={handleSave} />
            </div>
          </div>
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
