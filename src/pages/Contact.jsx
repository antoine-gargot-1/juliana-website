import { useState } from 'react';
import { useReveal } from '../hooks/useReveal';

export function Contact() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    age: '',
    interest: 'Voice',
    experience: 'Beginner',
    goals: '',
    artists: '',
    mode: 'Either',
    availability: '',
  });

  useReveal();

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('https://formspree.io/f/xpwdqgvl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="page-fade">
        <div className="wrap" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '120px 0' }}>
          <div className="script" style={{ fontSize: 96, color: 'var(--accent)', lineHeight: 1, marginBottom: 30 }}>Gracias&hellip;</div>
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: 400, fontSize: 'clamp(36px, 5vw, 64px)', margin: '0 0 20px' }}>
            Your note is on its way.
          </h2>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink-soft)', maxWidth: 540, fontWeight: 300 }}>
            I'll be in touch within a few days to set up a free consultation. Looking forward to hearing your story.
          </p>
          <button className="btn btn--ghost" style={{ marginTop: 30 }} onClick={() => setSent(false)}>
            Send another &rarr;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-fade">
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Studio Inquiry</div>
          <h1>Let's <span className="it">work</span> together.</h1>
        </section>

        <section className="block" style={{ paddingTop: 20 }}>
          <div className="contact">
            <div className="contact-info">
              <p>
                I'd love to hear about your goals and how I can support your musical journey. Whether you want to improve your voice, learn an instrument, write songs, or grow as an artist — lessons are personalized to help you feel confident and inspired.
              </p>
              <dl>
                <dt>Email</dt>
                <dd><a href="mailto:julianabeltranmusic@gmail.com">julianabeltranmusic@gmail.com</a></dd>
                <dt>Instagram</dt>
                <dd><a href="https://www.instagram.com/juliana.beltran/" target="_blank" rel="noopener noreferrer">@juliana.beltran</a></dd>
                <dt>YouTube</dt>
                <dd><a href="https://www.youtube.com/@juliana.beltran" target="_blank" rel="noopener noreferrer">@juliana.beltran</a></dd>
                <dt>Spotify</dt>
                <dd><a href="https://open.spotify.com/artist/5NfNMKwOPzCw9S1s3OMS6z" target="_blank" rel="noopener noreferrer">Listen</a></dd>
                <dt>Studio</dt>
                <dd>Los Angeles, CA &middot; Online available worldwide</dd>
                <dt>Response time</dt>
                <dd style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-soft)' }}>Within 2–3 business days</dd>
              </dl>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row">
                <div>
                  <label>Your name</label>
                  <input type="text" name="name" value={form.name} onChange={upd('name')} required />
                </div>
                <div>
                  <label>Age</label>
                  <input type="text" name="age" value={form.age} onChange={upd('age')} placeholder="Or age group" />
                </div>
              </div>
              <div className="row">
                <div>
                  <label>Lesson interest</label>
                  <select name="interest" value={form.interest} onChange={upd('interest')}>
                    <option>Voice</option>
                    <option>Guitar</option>
                    <option>Piano</option>
                    <option>Songwriting</option>
                    <option>Artist Development</option>
                    <option>A mix</option>
                  </select>
                </div>
                <div>
                  <label>Experience level</label>
                  <select name="experience" value={form.experience} onChange={upd('experience')}>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                    <option>Performing artist</option>
                  </select>
                </div>
              </div>
              <label>Musical goals</label>
              <textarea name="goals" rows="2" value={form.goals} onChange={upd('goals')} placeholder="What are you hoping to build?" />
              <label>Favorite artists</label>
              <input type="text" name="artists" value={form.artists} onChange={upd('artists')} placeholder="A few names give me a sense of your taste" />
              <div className="row">
                <div>
                  <label>Online or in-person</label>
                  <select name="mode" value={form.mode} onChange={upd('mode')}>
                    <option>Online</option>
                    <option>In-person &middot; LA</option>
                    <option>Either</option>
                  </select>
                </div>
                <div>
                  <label>Availability</label>
                  <input type="text" name="availability" value={form.availability} onChange={upd('availability')} placeholder="Weeknights, Saturdays..." />
                </div>
              </div>
              <div className="submit-row">
                <span className="submit-note">First lesson is followed by a free consultation call.</span>
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
