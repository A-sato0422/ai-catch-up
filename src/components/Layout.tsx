import { Outlet } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Header from './Header';

export default function Layout() {
  const { dark } = useTheme();
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
        }}
      >
        <Header />
        <Outlet />
      </div>
    </div>
  );
}
