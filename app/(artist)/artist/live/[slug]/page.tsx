import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { ShowRow } from '@/components/artist/ShowRow';
import { VideoFacade } from '@/components/artist/VideoFacade';
import {
  ALL_SHOWS,
  ALL_VIDEOS,
  getShow,
  googleCalendarUrl,
  isPast,
  partitionShows,
  showLongDate,
  showTime,
  showYear,
} from '@/lib/content';
import { musicEventSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';
import { EMAIL } from '@/lib/site';

export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_SHOWS.map((s) => ({ slug: s.slug }));
}

const lede = {
  fontFamily: 'var(--serif)',
  fontSize: 20,
  lineHeight: 1.55,
  color: 'var(--ink-soft)',
  fontWeight: 400,
  maxWidth: 640,
} as const;
const detailRow = { padding: '18px 0', borderTop: '1px solid var(--rule)' } as const;
const detailValue = { margin: '8px 0 0', fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 400 } as const;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const show = getShow(slug);
  if (!show) return {};

  const past = isPast(show);
  const when = showLongDate(show);

  return pageMeta({
    title: show.title
      ? `${show.title} — ${show.venue}, ${when}`
      : `Juliana Beltran ${past ? 'played' : 'live at'} ${show.venue} — ${when}`,
    description: past
      ? `Juliana Beltran performed at ${show.venue}, ${show.city} on ${when}${
          show.note ? ` (${show.note})` : ''
        }. See upcoming Los Angeles dates and booking details.`
      : `Juliana Beltran plays ${show.venue}, ${show.city} on ${when} at ${showTime(show)}${
          show.note ? ` — ${show.note}` : ''
        }. Latin pop and indie pop, live.`,
    path: `/artist/live/${show.slug}`,
    type: 'article',
    ...(show.image ? { image: show.image, imageWidth: 1200, imageHeight: 630 } : {}),
  });
}

export default async function ShowPage({ params }: Props) {
  const { slug } = await params;
  const show = getShow(slug);
  if (!show) notFound();

  const past = isPast(show);
  const { upcoming } = partitionShows();
  const others = upcoming.filter((s) => s.slug !== show.slug).slice(0, 3);

  // Build-time failure, same as the BOOKING_LIVE_VIDEO guard: a show page that
  // silently drops its video is worse than a failed deploy.
  const guestListMailto = `mailto:${EMAIL}?subject=${encodeURIComponent(
    `Guest list: ${show.title ?? show.venue}, ${showLongDate(show)}`,
  )}`;

  const video = show.videoSlug ? ALL_VIDEOS.find((v) => v.slug === show.videoSlug) : undefined;
  if (show.videoSlug && !video) {
    throw new Error(`content/shows.json: videoSlug "${show.videoSlug}" matches no video slug.`);
  }

  const addressLine = [
    show.place.streetAddress,
    `${show.place.addressLocality}, ${show.place.addressRegion}`,
    show.place.postalCode,
  ]
    .filter(Boolean)
    .join(' · ');

  // Year sits in the eyebrow, so the facts line drops it.
  const facts = [showLongDate(show).replace(/, \d{4}$/, ''), showTime(show), show.venue].join(' · ');

  return (
    <div className="page-fade artist-theme">
      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">
            {show.title ? show.venue : past ? 'Past show' : 'Upcoming show'} &middot; {showYear(show)}
          </div>
          <h1>
            {show.title ?? show.venue}
            <span className="it">.</span>
          </h1>
          <p style={{ ...lede, marginTop: 24 }}>{facts}</p>
          {show.note && <p style={{ ...lede, marginTop: 6 }}>{show.note}</p>}
          {!past && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 32 }}>
              {show.tickets && (
                <a
                  className="btn btn--solid"
                  href={show.tickets}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-ticket={show.slug}
                >
                  Get tickets{show.price ? ` — $${show.price}` : ''}{' '}
                  <span className="arrow">&rarr;</span>
                </a>
              )}
              <a
                className={show.tickets ? 'btn' : 'btn btn--solid'}
                href={googleCalendarUrl(show)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Add to calendar
              </a>
            </div>
          )}
          {show.image && (
            <Image
              src={show.image}
              alt={`${show.title ?? 'Juliana Beltran'} at ${show.venue}, ${showLongDate(show)}`}
              width={1200}
              height={630}
              priority
              sizes="(max-width: 1100px) 100vw, 1100px"
              style={{ display: 'block', width: '100%', height: 'auto', marginTop: 40 }}
            />
          )}
        </section>

        {video && (
          <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
            <VideoFacade video={video} placement="show-page" primary />
          </section>
        )}

        <section className="block" style={{ paddingTop: 20, paddingBottom: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }} className="about-cols">
            <div>
              <div className="eyebrow reveal" style={{ marginBottom: 24 }}>
                Details
              </div>
              <dl className="show-detail-list reveal" style={{ margin: 0, borderBottom: '1px solid var(--rule)' }}>
                <div style={detailRow}>
                  <dt className="eyebrow">Date</dt>
                  <dd style={detailValue}>{showLongDate(show)}</dd>
                </div>
                <div style={detailRow}>
                  <dt className="eyebrow">Doors / set</dt>
                  <dd style={detailValue}>{showTime(show)} &middot; Pacific Time</dd>
                </div>
                <div style={detailRow}>
                  <dt className="eyebrow">Venue</dt>
                  <dd style={detailValue}>
                    {show.place.name}
                    <br />
                    <span style={{ color: 'var(--ink-soft)', fontSize: 16 }}>{addressLine}</span>
                  </dd>
                </div>
                <div style={detailRow}>
                  <dt className="eyebrow">Tickets</dt>
                  <dd style={detailValue}>
                    {show.tickets ? (
                      <a
                        href={show.tickets}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-ticket={show.slug}
                      >
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
              <p className="reveal" style={{ ...lede, fontSize: 19, lineHeight: 1.65, margin: 0 }}>
                Juliana is a Colombian singer-songwriter based in Los Angeles. Her live sets move
                between stripped-back voice-and-guitar arrangements and fuller band material,
                drawing on Latin pop, indie pop and acoustic singer-songwriter writing.
              </p>
              {!past && (
                // Industry invites go out by email (marketing/meta-ads-seras-tu.md);
                // this is the self-serve route for managers, agents and press who
                // land here from elsewhere. A mailto, not a form: it only has to
                // reach an inbox someone reads daily.
                <p className="reveal" style={{ ...lede, fontSize: 17, margin: '28px 0 0' }}>
                  <strong>Industry and press:</strong> there&apos;s a guest list.{' '}
                  <a href={guestListMailto}>Email {EMAIL}</a> with your name and company, and
                  see the <Link href="/artist/press">press kit</Link>.
                </p>
              )}
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
                <ShowRow key={s.slug} show={s} index={i} />
              ))}
            </div>
          </section>
        )}

        <p style={{ padding: '20px 0 80px' }}>
          <Link href="/artist/live">&larr; All dates</Link>
        </p>
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
