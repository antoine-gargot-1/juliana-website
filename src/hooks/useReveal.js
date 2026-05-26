import { useEffect } from 'react';

export function useReveal() {
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
  });
}
