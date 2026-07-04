import { Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Header from './Header';
import BottomNav from './BottomNav';

export default function Layout() {
  const { dark } = useTheme();
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  // 設定画面は保存/キャンセルの独自フッターを持つため、BottomNav は出さない
  // （BottomNav 遷移で編集中の選択が破棄される事故も防ぐ）
  const isSettings = pathname === '/settings';
  const showBottomNav = !isHome && !isSettings;

  return (
    <div
      data-theme={dark ? 'dark' : 'light'}
      style={{
        minHeight: '100vh',
        background: 'var(--win-bg)',
        fontFamily: "'Noto Sans JP', -apple-system, 'Hiragino Kaku Gothic ProN', sans-serif",
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div
        className="w-full mx-auto overflow-hidden"
        style={{
          maxWidth: 1180,
          background: 'var(--win-bg)',
          paddingBottom: showBottomNav ? 100 : 0,
        }}
      >
        <Header />
        <Outlet />
      </div>

      {showBottomNav && <BottomNav />}
    </div>
  );
}
