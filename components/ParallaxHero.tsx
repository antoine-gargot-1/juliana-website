'use client';

import { useRef, type ReactNode } from 'react';
import { useParallax } from '@/hooks/useParallax';

/**
 * The hero markup is identical to the SPA's; only the two refs that the
 * parallax needs live on the client. Everything inside (`bg`, `corner`,
 * `children`) is rendered on the server and streamed in as props, so the copy
 * and the LCP image are present in the static HTML.
 */
export function ParallaxHero({
  bg,
  corner,
  children,
}: {
  bg: ReactNode;
  corner?: ReactNode;
  children: ReactNode;
}) {
  const heroBgRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  useParallax(heroBgRef, heroContentRef);

  return (
    <section className="hero">
      <div className="hero-bg" ref={heroBgRef}>
        {bg}
      </div>
      {corner}
      <div className="hero-content" ref={heroContentRef}>
        {children}
      </div>
      <div className="hero-scroll">
        <span>Scroll</span>
        <span className="bar" />
      </div>
    </section>
  );
}
