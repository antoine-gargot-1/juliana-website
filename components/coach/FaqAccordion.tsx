'use client';

import { useState } from 'react';
import type { Faq } from '@/lib/content';

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState(0);

  return (
    <div className="faq-list">
      {faqs.map((f, i) => (
        <div key={i} className={`faq-item ${open === i ? 'open' : ''}`}>
          <button
            className="faq-q"
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
            aria-controls={`faq-a-${i}`}
          >
            <span>
              <span
                style={{
                  fontFamily: 'var(--serif)',
                  fontStyle: 'italic',
                  color: 'var(--accent)',
                  fontSize: 14,
                  marginRight: 18,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              {f.q}
            </span>
            <span className="plus">+</span>
          </button>
          {/* Answer text stays in the DOM (CSS collapses it) so it is crawlable
              and matches the FAQPage JSON-LD on this route. */}
          <div className="faq-a" id={`faq-a-${i}`}>
            {f.a}
          </div>
        </div>
      ))}
    </div>
  );
}
