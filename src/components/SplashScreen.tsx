import { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import AIAnimation from '../assets/lottie/AI animation.json';

const STORAGE_KEY = 'splashShown';

export function shouldShowSplash(): boolean {
  return !sessionStorage.getItem(STORAGE_KEY);
}

interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
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
      setFading(true);
      setTimeout(() => {
        sessionStorage.setItem(STORAGE_KEY, '1');
        onDone();
      }, 500);
    });

    return () => anim.destroy();
  }, [onDone]);

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
