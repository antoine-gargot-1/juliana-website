'use client';

import { useState } from 'react';
import type { Faq } from '@/lib/content';

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState(0);

  return (
    <div className="faq-list">
      {faqs.map((f, i) => (
        <div key={i} className={`faq-item ${open === i ? 'open' : ''}`}>
          {/*
            THE QUESTION IS A HEADING WITH THE DISCLOSURE BUTTON INSIDE IT.
            The shape the ARIA authoring practices prescribe for an accordion,
            and the reason /coach/faq now has an outline at all: 1,183 words of
            Q&A were sixteen buttons and no headings, so neither a crawler nor a
            screen-reader user could see the questions as structure. Finding #9
            in docs/seo-audit.md.

            h3 rather than h2, because on /coach this accordion sits under the
            visible h2 "What people ask before they book."; /coach/faq has no
            visible label there and supplies an .sr-only h2 of its own, so
            neither route skips a level.

            The h3 is a box and nothing else. `.faq-item > h3` in app/styles.css
            zeroes its margins and inherits its font; .faq-q on the button keeps
            every type declaration it already had and is still width:100%, so
            the row is unchanged. .faq-item is a two-row grid and this is still
            two children, so the open/close transition is unchanged too.
          */}
          <h3>
            <button
              className="faq-q"
              onClick={() => setOpen(open === i ? -1 : i)}
              aria-expanded={open === i}
              aria-controls={`faq-a-${i}`}
            >
              <span>
                {/*
                  Upright sans at 1rem, not italic serif at 14px.
                  This numeral was the last surviving instance of the pattern the
                  retype removed everywhere else: small, italic, and in `--accent`
                  at 5.15:1. Italic at 14px in a high-contrast serif is where the
                  thin strokes land under a pixel, and it sits on the page a
                  nervous parent reads immediately before paying.
                  `tabular-nums` because these are a counted sequence — 01, 02, 09,
                  10 — and proportional old-style figures make a numbered list
                  visibly ragged down the left edge.
                  aria-hidden: it is decorative ordering. A screen reader already
                  gets the position from the list, and hearing "zero one" before
                  every question is noise.
                */}
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: 'var(--sans)',
                    color: 'var(--accent-text)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    fontVariantNumeric: 'lining-nums tabular-nums',
                    marginRight: 18,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {f.q}
              </span>
              <span className="plus">+</span>
            </button>
          </h3>
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
