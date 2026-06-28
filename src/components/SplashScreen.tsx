import { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import AIAnimation from '../assets/lottie/AI animation.json';

const STORAGE_KEY = 'splashShown';

export function shouldShowSplash(): boolean {
  return !sessionStorage.getItem(STORAGE_KEY);
}

interface Props {
  onFadeStart: () => void;
  onDone: () => void;
}

export default function SplashScreen({ onFadeStart, onDone }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      animationData: AIAnimation,
    });

    anim.addEventListener('complete', () => {
      onFadeStart(); // アプリ側のフェードインを同時に開始
      setFading(true);
      setTimeout(() => {
        sessionStorage.setItem(STORAGE_KEY, '1');
        onDone();
      }, 500);
    });

    return () => anim.destroy();
  }, [onFadeStart, onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--bg)',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
