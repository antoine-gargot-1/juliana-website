'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';
import { EMAIL } from '@/lib/site';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mojbyjdn';

type Status = 'idle' | 'sending' | 'sent' | 'error';

const EMPTY = {
  name: '',
  organization: '',
  eventType: 'Bar / Club',
  eventDate: '',
  location: '',
  budget: '',
  message: '',
};

/**
 * Full booking page body. It is a client component because of the form state,
 * but it is still server-rendered into the static HTML, so every word here is
 * crawlable.
 */
export function BookingForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  // Honeypot: moved off-screen, so only a bot ever fills it in.
  const [gotcha, setGotcha] = useState('');

  const upd =
    (k: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (gotcha) {
      // Bot. Show the same success UI, send nothing.
      setStatus('sent');
      return;
    }

    setStatus('sending');
    setError(null);

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...form, type: 'booking' }),
      });

      if (res.ok) {
        // Only a genuine 2xx counts as a conversion — tracking on submit-click
        // would inflate the number with failed and bot submissions.
        track('booking_submit', {
          event_type: form.eventType,
          has_date: form.eventDate !== '',
          has_budget: form.budget !== '',
          organization: form.organization.slice(0, 100),
        });
        setStatus('sent');
        setForm(EMPTY);
        return;
      }

      // Previously a non-ok response was swallowed: the form reset and the
      // visitor was told nothing. Surface it instead.
      let detail = `the form service returned ${res.status}.`;
      try {
        const body = await res.json();
        if (Array.isArray(body?.errors) && body.errors.length) {
          detail = body.errors
            .map((x: { message?: string }) => x.message)
            .filter(Boolean)
            .join(' ');
        } else if (typeof body?.error === 'string') {
          detail = body.error;
        }
      } catch {
        /* non-JSON error body — keep the status-code message */
      }
      setError(detail);
      setStatus('error');
    } catch {
      setError('the request never reached the server.');
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="page-fade artist-theme">
        <div
          className="wrap"
          style={{
            minHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: '120px 0',
          }}
        >
          <div
            className="script"
            style={{ fontSize: 96, color: 'var(--accent)', lineHeight: 1, marginBottom: 30 }}
          >
            Thank you&hellip;
          </div>
          <h2
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 400,
              fontSize: 'clamp(36px, 5vw, 64px)',
              margin: '0 0 20px',
            }}
          >
            Inquiry received.
          </h2>
          <p
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 19,
              color: 'var(--ink-soft)',
              maxWidth: 540,
              fontWeight: 300,
            }}
          >
            I&apos;ll get back to you within 48 hours with availability and details.
          </p>
          <button
            className="btn btn--ghost"
            style={{ marginTop: 30 }}
            onClick={() => setStatus('idle')}
          >
            Send another &rarr;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-fade artist-theme">
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Booking inquiry</div>
          <h1>
            Book <span className="it">Juliana.</span>
          </h1>
        </section>

        <section className="block" style={{ paddingTop: 20 }}>
          <div className="contact">
            <div className="contact-info">
              <p>
                Available for live shows, festivals, private events, corporate events, and artistic
                collaborations. Share your event details and I&apos;ll get back to you promptly.
              </p>
              <dl>
                <dt>Booking email</dt>
                <dd>
                  <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
                </dd>
                <dt>Based in</dt>
                <dd>Los Angeles, CA</dd>
                <dt>Available for</dt>
                <dd>Nationwide &middot; International</dd>
                <dt>Response time</dt>
                <dd
                  style={{
                    fontFamily: 'var(--serif)',
                    fontStyle: 'italic',
                    color: 'var(--ink-soft)',
                  }}
                >
                  Within 48 hours
                </dd>
              </dl>
            </div>

            <form onSubmit={handleSubmit}>
              {/* honeypot — off-screen, never announced */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                }}
              >
                <label htmlFor="booking-company-website">Company website</label>
                <input
                  id="booking-company-website"
                  type="text"
                  name="_gotcha"
                  tabIndex={-1}
                  autoComplete="off"
                  value={gotcha}
                  onChange={(e) => setGotcha(e.target.value)}
                />
              </div>

              <div className="row">
                <div>
                  <label>Your name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={upd('name')}
                    required
                  />
                </div>
                <div>
                  <label>Organization / Venue</label>
                  <input
                    type="text"
                    name="organization"
                    value={form.organization}
                    onChange={upd('organization')}
                    required
                  />
                </div>
              </div>
              <div className="row">
                <div>
                  <label>Event type</label>
                  <select name="eventType" value={form.eventType} onChange={upd('eventType')}>
                    <option>Bar / Club</option>
                    <option>Festival</option>
                    <option>Private Event</option>
                    <option>Wedding</option>
                    <option>Quincea&ntilde;era</option>
                    <option>Corporate</option>
                    <option>Collaboration</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label>Event date</label>
                  <input
                    type="date"
                    name="eventDate"
                    value={form.eventDate}
                    onChange={upd('eventDate')}
                  />
                </div>
              </div>
              <div className="row">
                <div>
                  <label>Location</label>
                  <input
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={upd('location')}
                    placeholder="City, Venue"
                  />
                </div>
                <div>
                  <label>Budget range</label>
                  <input
                    type="text"
                    name="budget"
                    value={form.budget}
                    onChange={upd('budget')}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <label>Message</label>
              <textarea
                name="message"
                rows={3}
                value={form.message}
                onChange={upd('message')}
                placeholder="Tell me about the event, audience, and what you're looking for."
              />

              {status === 'error' && (
                <p
                  role="alert"
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 16,
                    color: 'var(--accent)',
                    margin: '18px 0 0',
                    fontWeight: 300,
                  }}
                >
                  Your inquiry didn&apos;t send &mdash; {error} Please try again, or email{' '}
                  <a href={`mailto:${EMAIL}`} style={{ textDecoration: 'underline' }}>
                    {EMAIL}
                  </a>
                  .
                </p>
              )}

              <div className="submit-row">
                <span className="submit-note">
                  Technical rider and stage plot available on request.
                </span>
                <button type="submit" className="btn btn--solid" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending...' : 'Send inquiry'}{' '}
                  <span className="arrow">&rarr;</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
