import type { SourceType } from '../types';

interface Props {
  source: SourceType;
}

const SOURCE_CONFIG: Record<SourceType, { label: string; badge: React.ReactNode }> = {
  github: {
    label: 'GitHub',
    badge: (
      <span style={{
        width: 16, height: 16, borderRadius: '50%',
        background: '#1f2328', color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 900, flexShrink: 0,
      }}>G</span>
    ),
  },
  zenn: {
    label: 'Zenn',
    badge: (
      <span style={{
        width: 16, height: 16, borderRadius: 3,
        background: '#3ea8ff', color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 900, fontStyle: 'italic', flexShrink: 0,
      }}>Z</span>
    ),
  },
  qiita: {
    label: 'Qiita',
    badge: (
      <span style={{
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', border: '1.5px solid #55c500',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8, fontWeight: 900, color: '#55c500', flexShrink: 0,
      }}>Q</span>
    ),
  },
  hatena: {
    label: 'はてブ',
    badge: (
      <span style={{
        width: 16, height: 16, borderRadius: 3,
        background: '#00a4de', color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 7, fontWeight: 900, flexShrink: 0,
      }}>B!</span>
    ),
  },
  google: {
    label: 'Google DeepMind',
    badge: (
      <span style={{
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', border: '1.5px solid #e6e8ec',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 900, color: '#4285f4', flexShrink: 0,
      }}>G</span>
    ),
  },
};

import React from 'react';

export default function SourceBadge({ source }: Props) {
  const cfg = SOURCE_CONFIG[source];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 8,
      background: 'var(--pill-bg)', border: '1px solid var(--pill-line)',
      fontSize: 12, fontWeight: 600, color: 'var(--muted2)',
      whiteSpace: 'nowrap',
    }}>
      {cfg.badge}
      {cfg.label}
    </span>
  );
}
