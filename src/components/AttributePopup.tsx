import { ATTRIBUTE_OPTIONS, type AttributeId } from '../lib/attributePresets';

interface Props {
  /** 属性を選んだ時の処理。保存・初回フラグ更新・state更新などは呼び出し側の責務（App.tsx / SettingsPage.tsx で分岐） */
  onSelect: (attribute: AttributeId) => void;
  /**
   * 閉じるボタンの表示要否。指定時のみ × ボタンを出す。
   * 初回訪問時（App.tsx）は必ず1つ選んでもらう設計のため未指定（仕様上スキップ導線なし）。
   * 設定画面からの再選択時（SettingsPage.tsx）は誤タップで開いた場合に戻れるよう指定する。
   */
  onClose?: () => void;
}

/**
 * 属性選択ポップアップ（G-3）。初回訪問時の全画面ポップアップ・設定画面からの再選択モーダルの
 * 両方で同一コンポーネントを再利用する（SPEC_EXPANSION.md §7.3）。
 * デザインは SettingsPage のカード（var(--card) 背景・var(--card-line) ボーダー・角丸16px）に合わせる。
 */
export default function AttributePopup({ onSelect, onClose }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(10, 12, 16, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(16px, 4vw, 32px)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--card)',
          border: '1px solid var(--card-line)',
          borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.25)',
          padding: 'clamp(22px, 4vw, 30px)',
          animation: 'fadeInUp 0.3s ease 0s both',
        }}
      >
        {onClose && (
          <button
            onClick={onClose}
            aria-label="閉じる"
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--muted)',
              padding: 6,
              lineHeight: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        <h2
          style={{
            fontSize: 'clamp(19px, 4vw, 22px)',
            fontWeight: 800,
            color: 'var(--title)',
            margin: 0,
          }}
        >
          あなたに近いものを選んでください
        </h2>
        <p style={{ marginTop: 8, marginBottom: 20, color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
          ふだんの関わり方に合わせて、ホーム画面に表示する情報を絞り込みます。あとから設定画面でいつでも変更できます。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ATTRIBUTE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: 12,
                border: '1.5px solid var(--chip-line)',
                background: 'var(--chip-bg)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color .18s, background .18s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ff5a2c';
                e.currentTarget.style.background = 'var(--sel-soft)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--chip-line)';
                e.currentTarget.style.background = 'var(--chip-bg)';
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--title)' }}>{option.label}</span>
              <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--muted2)', textWrap: 'pretty' }}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
