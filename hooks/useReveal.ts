'use client';

import { useEffect } from 'react';

/**
 * Scroll-reveal driver. Ported unchanged from the Vite build: it queries the
 * document for `.reveal` / `.reveal-clip` / `.reveal-up` and adds `.in` as they
 * enter the viewport, with a 1.5s safety net so nothing stays invisible.
 */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-clip, .reveal-up');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px -10% 0px' },
    );
    els.forEach((el) => io.observe(el));

    const timeout = setTimeout(() => {
      document
        .querySelectorAll('.reveal:not(.in), .reveal-clip:not(.in), .reveal-up:not(.in)')
        .forEach((el) => el.classList.add('in'));
    }, 1500);

    return () => {
      io.disconnect();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
