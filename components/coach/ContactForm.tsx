'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';
import { EMAIL, SOCIAL } from '@/lib/site';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xlgvagbj';

type Status = 'idle' | 'sending' | 'sent' | 'error';

const EMPTY = {
  name: '',
  age: '',
  interest: 'Voice',
  experience: 'Beginner',
  goals: '',
  artists: '',
  mode: 'Either',
  availability: '',
};

/**
 * Full studio-inquiry page body. Client component for the form state; still
 * server-rendered into the static HTML so the copy is crawlable.
 */
export function ContactForm() {
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
      setStatus('sent');
      return;
    }

    setStatus('sending');
    setError(null);

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        // See BookingForm: conversion fires on a real 2xx, not on click.
        track('contact_submit', {
          interest: form.interest,
          experience: form.experience,
          mode: form.mode,
        });
        setStatus('sent');
        setForm(EMPTY);
        return;
      }

      // Previously a non-ok response was swallowed: the form reset silently.
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
      <div className="page-fade">
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
            Your note is on its way.
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
            I&apos;ll be in touch within a few days to set up a free consultation. Looking forward
            to hearing your story.
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
    <div className="page-fade">
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Studio Inquiry</div>
          <h1>
            Let&apos;s <span className="it">work</span> together.
          </h1>
        </section>

        <section className="block" style={{ paddingTop: 20 }}>
          <div className="contact">
            <div className="contact-info">
              <p>
                I&apos;d love to hear about your goals and how I can support your musical journey.
                Whether you want to improve your voice, learn an instrument, write songs, or grow as
                an artist — lessons are personalized to help you feel confident and inspired.
              </p>
              <dl>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
                </dd>
                <dt>Instagram</dt>
                <dd>
                  <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer">
                    @juliana.beltran
                  </a>
                </dd>
                <dt>YouTube</dt>
                <dd>
                  <a href={SOCIAL.youtube} target="_blank" rel="noopener noreferrer">
                    @juliana.beltran
                  </a>
                </dd>
                <dt>Spotify</dt>
                <dd>
                  <a href={SOCIAL.spotify} target="_blank" rel="noopener noreferrer">
                    Listen
                  </a>
                </dd>
                <dt>Studio</dt>
                <dd>Los Angeles, CA &middot; Online available worldwide</dd>
                <dt>Response time</dt>
                <dd
                  style={{
                    fontFamily: 'var(--serif)',
                    fontStyle: 'italic',
                    color: 'var(--ink-soft)',
                  }}
                >
                  Within 2–3 business days
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
                <label htmlFor="contact-company-website">Company website</label>
                <input
                  id="contact-company-website"
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
                  <label>Age</label>
                  <input
                    type="text"
                    name="age"
                    value={form.age}
                    onChange={upd('age')}
                    placeholder="Or age group"
                  />
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
              <textarea
                name="goals"
                rows={2}
                value={form.goals}
                onChange={upd('goals')}
                placeholder="What are you hoping to build?"
              />
              <label>Favorite artists</label>
              <input
                type="text"
                name="artists"
                value={form.artists}
                onChange={upd('artists')}
                placeholder="A few names give me a sense of your taste"
              />
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
                  <input
                    type="text"
                    name="availability"
                    value={form.availability}
                    onChange={upd('availability')}
                    placeholder="Weeknights, Saturdays..."
                  />
                </div>
              </div>

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
                  Your note didn&apos;t send &mdash; {error} Please try again, or email{' '}
                  <a href={`mailto:${EMAIL}`} style={{ textDecoration: 'underline' }}>
                    {EMAIL}
                  </a>
                  .
                </p>
              )}

              <div className="submit-row">
                <span className="submit-note">
                  First lesson is followed by a free consultation call.
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
