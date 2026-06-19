import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ListPage from './pages/ListPage';

export default function App() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}
