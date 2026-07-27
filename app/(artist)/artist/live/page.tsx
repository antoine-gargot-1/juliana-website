import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { ShowRow } from '@/components/artist/ShowRow';
import { partitionShows } from '@/lib/content';
import { eventListSchema } from '@/lib/schema';
import { SOCIAL } from '@/lib/site';
import { breadcrumbList, pageMeta } from '@/lib/seo';

// Upcoming/past flips purely on the clock, so re-render daily.
export const revalidate = 86400;

export const metadata: Metadata = pageMeta({
  title: 'Live — Tour Dates & Upcoming Shows in Los Angeles',
  description:
    'Upcoming and past live dates for Juliana Beltran — Hotel Cafe, Harvard and Stone, The Virgil and more across Los Angeles. Every show has its own page with venue and time details.',
  path: '/artist/live',
});

export default function LivePage() {
  const { upcoming, past } = partitionShows();

  return (
    <div className="page-fade artist-theme">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Tour dates &amp; appearances</div>
          <h1>Live.</h1>
        </section>

        <section className="block" style={{ paddingTop: 20 }}>
          {upcoming.length > 0 ? (
            <>
              <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
                Upcoming
              </div>
              <div className="shows-list">
                {upcoming.map((show, i) => (
                  <ShowRow
                    key={show.slug}
                    show={show}
                    index={i}
                    ticketLabel="Tickets ↗"
                    emptyLabel="Details coming"
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="reveal" style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink-soft)', fontWeight: 300 }}>
                No upcoming shows announced yet.
              </p>
              <p
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 18,
                  color: 'var(--muted)',
                  fontWeight: 300,
                  marginTop: 8,
                }}
              >
                Follow on{' '}
                <a
                  href={SOCIAL.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent)' }}
                >
                  Instagram
                </a>{' '}
                for updates.
              </p>
            </div>
          )}

          {past.length > 0 && (
            <div style={{ marginTop: 80 }}>
              <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
                Past shows
              </div>
              <div className="shows-list" style={{ opacity: 0.6 }}>
                {past.map((show, i) => (
                  <ShowRow key={show.slug} show={show} index={i} past />
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="cta">
          <h2>
            Book a <span className="it">show.</span>
          </h2>
          <p>Interested in having Juliana perform at your venue or event?</p>
          <Link className="btn btn--solid" href="/artist/booking">
            Booking inquiry <span className="arrow">&rarr;</span>
          </Link>
        </section>
      </div>

      <JsonLd
        data={[
          eventListSchema([...upcoming, ...past]),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Artist', path: '/artist' },
            { name: 'Live', path: '/artist/live' },
          ]),
        ]}
      />
    </div>
  );
}
