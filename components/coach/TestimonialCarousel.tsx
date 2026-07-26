'use client';

import { useEffect, useState } from 'react';
import type { Testimonial } from '@/lib/content';

export function TestimonialCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const [ti, setTi] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTi((v) => (v + 1) % testimonials.length), 7000);
    return () => clearInterval(id);
  }, [testimonials.length]);

  return (
    <>
      <p className="testi-quote serif reveal">{testimonials[ti].quote}</p>
      <div className="testi-name reveal" style={{ '--rd': '120ms' }}>
        &mdash; {testimonials[ti].name}
      </div>
      <div className="testi-nav">
        {testimonials.map((_, i) => (
          <div
            key={i}
            className={`testi-dot ${ti === i ? 'active' : ''}`}
            onClick={() => setTi(i)}
            role="button"
            tabIndex={0}
            aria-label={`Show testimonial ${i + 1}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setTi(i);
              }
            }}
          />
        ))}
      </div>
    </>
  );
}
