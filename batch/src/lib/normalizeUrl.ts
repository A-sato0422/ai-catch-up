// トラッキングパラメータ一覧（SPEC §5.3）
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'twclid', 'igshid',
  'ref', 'referral', 'source',
]);

export function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);

  // スキーム・ホストを小文字化（URL コンストラクタが自動で行うが念のため明示）
  url.hostname = url.hostname.toLowerCase();
  url.protocol = url.protocol.toLowerCase();

  // フラグメント除去
  url.hash = '';

  // トラッキングパラメータ除去
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key)) {
      url.searchParams.delete(key);
    }
  }

  // 末尾スラッシュを統一（パスが "/" のみの場合はそのまま、それ以外は除去）
  const normalized = url.toString();
  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }

  return url.toString() || normalized;
}
