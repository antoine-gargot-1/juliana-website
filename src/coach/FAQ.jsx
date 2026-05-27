import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { FAQS } from './constants';

export function FAQ() {
  const [open, setOpen] = useState(0);
  useReveal();

  return (
    <div className="page-fade">
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Common Questions</div>
          <h1>Asked &amp; <span className="it">answered.</span></h1>
        </section>

        <section className="block" style={{ paddingTop: 20 }}>
          <div style={{ maxWidth: 880 }}>
            <div className="faq-list">
              {FAQS.map((f, i) => (
                <div key={i} className={`faq-item ${open === i ? 'open' : ''}`}>
                  <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                    <span>
                      <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--accent)', fontSize: 14, marginRight: 18 }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {f.q}
                    </span>
                    <span className="plus">+</span>
                  </button>
                  <div className="faq-a">{f.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cta">
          <h2>Still <span className="it">curious?</span></h2>
          <p>Send me a note — happy to answer anything before you book.</p>
          <Link className="btn btn--solid" to="/coach/contact">
            Get in touch <span className="arrow">&rarr;</span>
          </Link>
        </section>
      </div>
    </div>
  );
}
