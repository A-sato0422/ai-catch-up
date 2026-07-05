import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ListPage from './ListPage';
import { findFreeScreen } from '../lib/screens';
import { loadButtonSelection } from '../lib/buttonSettings';

/**
 * `/screen/:groupKey` 用ルートページ。
 * localStorage の選択状態（設定画面で保存したチェック状態）から該当グループの ScreenConfig を導出する。
 * 未選択のグループへの直接アクセス（URL 直打ち・設定変更後に残ったブックマーク等）はホームへ戻す。
 */
export default function GroupScreenPage() {
  const { groupKey } = useParams<{ groupKey: string }>();
  const navigate = useNavigate();

  // groupKey が変わらない限り再計算しない（毎レンダー新規オブジェクトになると
  // useArticles 側の useCallback 依存が壊れて再フェッチが無限ループする）
  const screenConfig = useMemo(
    () => (groupKey ? findFreeScreen(loadButtonSelection(), groupKey) : undefined),
    [groupKey]
  );

  useEffect(() => {
    if (!screenConfig) navigate('/', { replace: true });
  }, [screenConfig, navigate]);

  if (!screenConfig) return null;

  return <ListPage screenConfig={screenConfig} />;
}
