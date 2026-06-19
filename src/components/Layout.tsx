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
        background: 'var(--backdrop)',
        fontFamily: "'Noto Sans JP', -apple-system, 'Hiragino Kaku Gothic ProN', sans-serif",
        WebkitFontSmoothing: 'antialiased',
        padding: 'clamp(0px, 3vw, 40px) clamp(0px, 3vw, 24px)',
      }}
    >
      <div
        className="w-full mx-auto overflow-hidden lg:rounded-2xl"
        style={{
          maxWidth: 1180,
          background: 'var(--win-bg)',
          boxShadow: '0 30px 90px rgba(15, 20, 45, 0.20)',
        }}
      >
        <Header />
        <Outlet />
      </div>
    </div>
  );
}
