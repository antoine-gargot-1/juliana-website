import { useState } from 'react';
import { useReveal } from '../hooks/useReveal';

export function Booking() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    organization: '',
    eventType: 'Bar / Club',
    eventDate: '',
    location: '',
    budget: '',
    message: '',
  });

  useReveal();

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('https://formspree.io/f/mojbyjdn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type: 'booking' }),
      });
      if (res.ok) setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="page-fade artist-theme">
        <div className="wrap" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '120px 0' }}>
          <div className="script" style={{ fontSize: 96, color: 'var(--accent)', lineHeight: 1, marginBottom: 30 }}>Thank you&hellip;</div>
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: 400, fontSize: 'clamp(36px, 5vw, 64px)', margin: '0 0 20px' }}>
            Inquiry received.
          </h2>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink-soft)', maxWidth: 540, fontWeight: 300 }}>
            I'll get back to you within 48 hours with availability and details.
          </p>
          <button className="btn btn--ghost" style={{ marginTop: 30 }} onClick={() => setSent(false)}>
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
          <h1>Book <span className="it">Juliana.</span></h1>
        </section>

        <section className="block" style={{ paddingTop: 20 }}>
          <div className="contact">
            <div className="contact-info">
              <p>
                Available for live shows, festivals, private events, corporate events, and artistic collaborations. Share your event details and I'll get back to you promptly.
              </p>
              <dl>
                <dt>Booking email</dt>
                <dd><a href="mailto:julianabeltranmusic@gmail.com">julianabeltranmusic@gmail.com</a></dd>
                <dt>Based in</dt>
                <dd>Los Angeles, CA</dd>
                <dt>Available for</dt>
                <dd>Nationwide &middot; International</dd>
                <dt>Response time</dt>
                <dd style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-soft)' }}>Within 48 hours</dd>
              </dl>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row">
                <div>
                  <label>Your name</label>
                  <input type="text" name="name" value={form.name} onChange={upd('name')} required />
                </div>
                <div>
                  <label>Organization / Venue</label>
                  <input type="text" name="organization" value={form.organization} onChange={upd('organization')} required />
                </div>
              </div>
              <div className="row">
                <div>
                  <label>Event type</label>
                  <select name="eventType" value={form.eventType} onChange={upd('eventType')}>
                    <option>Bar / Club</option>
                    <option>Festival</option>
                    <option>Private Event</option>
                    <option>Corporate</option>
                    <option>Collaboration</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label>Event date</label>
                  <input type="date" name="eventDate" value={form.eventDate} onChange={upd('eventDate')} />
                </div>
              </div>
              <div className="row">
                <div>
                  <label>Location</label>
                  <input type="text" name="location" value={form.location} onChange={upd('location')} placeholder="City, Venue" />
                </div>
                <div>
                  <label>Budget range</label>
                  <input type="text" name="budget" value={form.budget} onChange={upd('budget')} placeholder="Optional" />
                </div>
              </div>
              <label>Message</label>
              <textarea name="message" rows="3" value={form.message} onChange={upd('message')} placeholder="Tell me about the event, audience, and what you're looking for." />
              <div className="submit-row">
                <span className="submit-note">Technical rider and stage plot available on request.</span>
                <button type="submit" className="btn btn--solid" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send inquiry'} <span className="arrow">&rarr;</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
