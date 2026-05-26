import { useEffect } from 'react';

export function useParallax(heroBgRef, heroContentRef) {
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      const t = Math.min(1, Math.max(0, y / (vh * 0.9)));
      if (heroBgRef.current) {
        heroBgRef.current.style.transform = `translateY(${y * 0.35}px)`;
      }
      if (heroContentRef.current) {
        heroContentRef.current.style.opacity = String(1 - t * 1.15);
        heroContentRef.current.style.transform = `translateY(${y * 0.18}px)`;
      }
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    tick();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [heroBgRef, heroContentRef]);
}
