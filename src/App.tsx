import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ListPage from './pages/ListPage';
import SplashScreen, { shouldShowSplash } from './components/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(() => shouldShowSplash());
  const [renderApp, setRenderApp] = useState(() => !shouldShowSplash());
  const [appVisible, setAppVisible] = useState(() => !shouldShowSplash());

  const handleFadeStart = () => {
    setRenderApp(true);
    // 2フレーム待ってアプリがDOMに描画されてからフェードイン開始
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAppVisible(true);
      });
    });
  };

  const handleDone = () => {
    setShowSplash(false);
  };

  return (
    <ThemeProvider>
      {showSplash && (
        <SplashScreen onFadeStart={handleFadeStart} onDone={handleDone} />
      )}
      {renderApp && (
        <div
          style={{
            opacity: appVisible ? 1 : 0,
            transition: appVisible ? 'opacity 0.5s ease' : 'none',
          }}
        >
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/top5" element={<ListPage screen="top5" />} />
                <Route path="/update" element={<ListPage screen="update" />} />
                <Route path="/tips" element={<ListPage screen="tips" />} />
                <Route path="/tips-gemini" element={<ListPage screen="tipsGemini" />} />
                <Route path="/fav" element={<ListPage screen="fav" />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </div>
      )}
    </ThemeProvider>
  );
}
