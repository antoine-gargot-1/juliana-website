import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { ShowRow } from '@/components/artist/ShowRow';
import {
  ALL_SHOWS,
  getShow,
  isPast,
  partitionShows,
  showLongDate,
  showTime,
  showYear,
} from '@/lib/content';
import { musicEventSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_SHOWS.map((s) => ({ slug: s.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const show = getShow(slug);
  if (!show) return {};

  const past = isPast(show);
  const when = showLongDate(show);

  return pageMeta({
    title: `Juliana Beltran ${past ? 'played' : 'live at'} ${show.venue} — ${when}`,
    description: past
      ? `Juliana Beltran performed at ${show.venue}, ${show.city} on ${when}${
          show.note ? ` (${show.note})` : ''
        }. See upcoming Los Angeles dates and booking details.`
      : `Juliana Beltran plays ${show.venue}, ${show.city} on ${when} at ${showTime(show)}${
          show.note ? ` — ${show.note}` : ''
        }. Latin pop and indie pop, live.`,
    path: `/artist/live/${show.slug}`,
    type: 'article',
  });
}

export default async function ShowPage({ params }: Props) {
  const { slug } = await params;
  const show = getShow(slug);
  if (!show) notFound();

  const past = isPast(show);
  const { upcoming } = partitionShows();
  const others = upcoming.filter((s) => s.slug !== show.slug).slice(0, 3);

  const addressLine = [
    show.place.streetAddress,
    `${show.place.addressLocality}, ${show.place.addressRegion}`,
    show.place.postalCode,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="page-fade artist-theme">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">
            {past ? 'Past show' : 'Upcoming show'} &middot; {showYear(show)}
          </div>
          <h1>
            {show.venue}
            <span className="it">.</span>
          </h1>
          <p
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 20,
              lineHeight: 1.55,
              color: 'var(--ink-soft)',
              maxWidth: 640,
              marginTop: 24,
              fontWeight: 300,
            }}
          >
            Juliana Beltran {past ? 'performed' : 'performs'} live at {show.venue} in {show.city} on{' '}
            {showLongDate(show)}, {showTime(show)}.{show.note ? ` ${show.note}.` : ''} A set of
            original Latin pop, indie pop and singer-songwriter material, in English and Spanish.
          </p>
        </section>

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }} className="about-cols">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Details
              </div>
              <dl className="show-detail-list" style={{ margin: 0 }}>
                <div
                  className="reveal"
                  style={{ padding: '18px 0', borderTop: '1px solid var(--rule)' }}
                >
                  <dt className="eyebrow">Date</dt>
                  <dd
                    style={{
                      margin: '8px 0 0',
                      fontFamily: 'var(--serif)',
                      fontSize: 19,
                      fontWeight: 300,
                    }}
                  >
                    {showLongDate(show)}
                  </dd>
                </div>
                <div
                  className="reveal"
                  style={{ '--rd': '60ms', padding: '18px 0', borderTop: '1px solid var(--rule)' }}
                >
                  <dt className="eyebrow">Doors / set</dt>
                  <dd
                    style={{
                      margin: '8px 0 0',
                      fontFamily: 'var(--serif)',
                      fontSize: 19,
                      fontWeight: 300,
                    }}
                  >
                    {showTime(show)} &middot; Pacific Time
                  </dd>
                </div>
                <div
                  className="reveal"
                  style={{ '--rd': '120ms', padding: '18px 0', borderTop: '1px solid var(--rule)' }}
                >
                  <dt className="eyebrow">Venue</dt>
                  <dd
                    style={{
                      margin: '8px 0 0',
                      fontFamily: 'var(--serif)',
                      fontSize: 19,
                      fontWeight: 300,
                    }}
                  >
                    {show.place.name}
                    <br />
                    <span style={{ color: 'var(--ink-soft)', fontSize: 16 }}>{addressLine}</span>
                  </dd>
                </div>
                <div
                  className="reveal"
                  style={{
                    '--rd': '180ms',
                    padding: '18px 0',
                    borderTop: '1px solid var(--rule)',
                    borderBottom: '1px solid var(--rule)',
                  }}
                >
                  <dt className="eyebrow">Tickets</dt>
                  <dd
                    style={{
                      margin: '8px 0 0',
                      fontFamily: 'var(--serif)',
                      fontSize: 19,
                      fontWeight: 300,
                    }}
                  >
                    {show.tickets ? (
                      <a href={show.tickets} target="_blank" rel="noopener noreferrer">
                        Buy tickets ↗{show.price ? ` — $${show.price}` : ''}
                      </a>
                    ) : past ? (
                      'This show has already taken place.'
                    ) : (
                      'Ticket link coming soon.'
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                About the set
              </div>
              <p
                className="reveal"
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 19,
                  lineHeight: 1.65,
                  color: 'var(--ink-soft)',
                  fontWeight: 300,
                  margin: '0 0 22px',
                }}
              >
                Juliana is a Colombian singer-songwriter based in Los Angeles. Her live sets move
                between stripped-back voice-and-guitar arrangements and fuller band material,
                drawing on Latin pop, indie pop and acoustic singer-songwriter writing.
              </p>
              <p
                className="reveal"
                style={{
                  '--rd': '120ms',
                  fontFamily: 'var(--serif)',
                  fontSize: 19,
                  lineHeight: 1.65,
                  color: 'var(--ink-soft)',
                  fontWeight: 300,
                  margin: '0 0 30px',
                }}
              >
                Booking a similar night at your venue, or private music for an event? The booking
                form takes two minutes.
              </p>
              <Link className="btn btn--solid reveal" style={{ '--rd': '200ms' }} href="/artist/booking">
                Booking inquiry <span className="arrow">&rarr;</span>
              </Link>
            </div>
          </div>
        </section>

        {others.length > 0 && (
          <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
            <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
              Other upcoming dates
            </div>
            <div className="shows-list">
              {others.map((s, i) => (
                <ShowRow key={s.slug} show={s} index={i} emptyLabel="Details coming" />
              ))}
            </div>
          </section>
        )}

        <section className="cta">
          <h2>
            All <span className="it">dates.</span>
          </h2>
          <p>Every past and upcoming Juliana Beltran show in one place.</p>
          <Link className="btn btn--solid" href="/artist/live">
            View live dates <span className="arrow">&rarr;</span>
          </Link>
        </section>
      </div>

      <JsonLd
        data={[
          musicEventSchema(show),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Artist', path: '/artist' },
            { name: 'Live', path: '/artist/live' },
            { name: `${show.venue} — ${showLongDate(show)}`, path: `/artist/live/${show.slug}` },
          ]),
        ]}
      />
    </div>
  );
}
