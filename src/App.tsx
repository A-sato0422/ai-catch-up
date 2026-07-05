import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ListPage from './pages/ListPage';
import GroupScreenPage from './pages/GroupScreenPage';
import SettingsPage from './pages/SettingsPage';
import SplashScreen, { shouldShowSplash } from './components/SplashScreen';
import AttributePopup from './components/AttributePopup';
import {
  shouldShowAttributePopup,
  markAttributeOnboarded,
  presetForAttribute,
  type AttributeId,
} from './lib/attributePresets';
import { saveButtonSelection } from './lib/buttonSettings';
import { TOP5_SCREEN, FAV_SCREEN } from './lib/screens';

export default function App() {
  const [showSplash, setShowSplash] = useState(() => shouldShowSplash());
  const [renderApp, setRenderApp] = useState(() => !shouldShowSplash());
  const [appVisible, setAppVisible] = useState(() => !shouldShowSplash());
  // G-3: 初回訪問（属性未選択）なら true。スプラッシュ完了後・ホーム表示前に出す（下記 JSX の !showSplash 条件）
  const [showAttributePopup, setShowAttributePopup] = useState(() => shouldShowAttributePopup());

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

  // 初回訪問時の属性選択: プリセットを保存し、初回フラグを立ててポップアップを閉じる
  const handleAttributeSelect = (attribute: AttributeId) => {
    saveButtonSelection(presetForAttribute(attribute));
    markAttributeOnboarded();
    setShowAttributePopup(false);
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
          {/*
            スプラッシュ完了前（showSplash中）は何も描画しない（スプラッシュ自身が最前面に表示中のため）。
            スプラッシュ完了後・初回訪問時はホーム画面より先に属性ポップアップを表示し、
            Routes（HomePage 等）は選択完了までマウントしない。これにより HomePage が
            loadButtonSelection() を読む時点では既にプリセットが保存済みになる。
          */}
          {showSplash ? null : showAttributePopup ? (
            <AttributePopup onSelect={handleAttributeSelect} />
          ) : (
            <BrowserRouter>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/top5" element={<ListPage screenConfig={TOP5_SCREEN} />} />
                  <Route path="/fav" element={<ListPage screenConfig={FAV_SCREEN} />} />
                  <Route path="/screen/:groupKey" element={<GroupScreenPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          )}
        </div>
      )}
    </ThemeProvider>
  );
}
