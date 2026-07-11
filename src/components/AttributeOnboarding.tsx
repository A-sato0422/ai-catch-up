import { useState } from 'react';
import ButtonGroupChecklist, { CheckIcon } from './ButtonGroupChecklist';
import { countSelectedButtons, checkboxId, type ButtonSelection } from '../lib/buttonSettings';

// 重要トピック・お気に入りは常に表示される固定枠（G-1）。ボタン数のプレビューに含める。
const FIXED_SCREEN_COUNT = 2;

interface Props {
  /** 「キャッチアップ開始」押下時の処理。保存・初回フラグ更新は呼び出し側（App.tsx）の責務。 */
  onStart: (selection: ButtonSelection) => void;
}

/**
 * 初回訪問時の属性選択画面（フェーズI）。
 * 旧デザイン（5つの属性プリセットから単一選択）を、設定画面と同じチェックボックスUI
 * （`ButtonGroupChecklist` 共有）に変更し、ホーム画面に表示されるボタン数（固定枠2 + 自由枠）を
 * その場でプレビューしながら選べるようにする。プリセットという中間概念を廃止し、
 * 設定画面の操作性とそのまま揃える。
 */
export default function AttributeOnboarding({ onStart }: Props) {
  const [selection, setSelection] = useState<ButtonSelection>({});

  const toggle = (groupKey: string, sub: string) => {
    const id = checkboxId(groupKey, sub);
    setSelection((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const buttonCount = FIXED_SCREEN_COUNT + countSelectedButtons(selection);

  return (
    <div
      style={{
        minHeight: '100vh',
        overflowY: 'auto',
        background: 'var(--win-bg)',
        padding: 'clamp(24px, 5vw, 48px) clamp(16px, 4vw, 40px) 120px',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1
          style={{
            fontSize: 'clamp(22px, 4vw, 28px)',
            fontWeight: 900,
            color: 'var(--title)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          あなたに合わせてホーム画面をつくりましょう
        </h1>
        <p style={{ marginTop: 8, marginBottom: 24, color: 'var(--muted)', fontSize: 14, lineHeight: 1.7 }}>
          気になる項目にチェックを入れてください（複数選択可）。あとから設定画面でいつでも変更できます。
          重要トピック・お気に入りは常に表示されます。
        </p>

        <ButtonGroupChecklist selection={selection} onToggle={toggle} />
      </div>

      {/* Sticky footer: ボタン数プレビュー + キャッチアップ開始 */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          padding: '16px clamp(16px, 4vw, 40px)',
          background: 'var(--card)',
          borderTop: '1px solid var(--hairline)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--muted2)' }}>
          <CheckIcon size={15} strokeWidth={2.4} />
          ホーム画面に {buttonCount} 個のボタンが表示されます（重要トピック・お気に入り含む）
        </span>
        <button
          onClick={() => onStart(selection)}
          style={{
            border: 'none',
            cursor: 'pointer',
            height: 50,
            padding: '0 32px',
            borderRadius: 25,
            background: 'linear-gradient(135deg, #ff8a45, #ff4d28)',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: '.4px',
            flexShrink: 0,
            animation: 'acGlow 2.6s ease-in-out infinite',
          }}
        >
          キャッチアップ開始
        </button>
      </div>
    </div>
  );
}
