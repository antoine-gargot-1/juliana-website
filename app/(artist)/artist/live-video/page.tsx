import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { VideoFacade } from '@/components/artist/VideoFacade';
import {
  ALL_VIDEOS,
  BOOKING_LIVE_VIDEO,
  OTHER_LIVE_VIDEOS,
  RELEASE_VIDEOS,
  videoLength,
} from '@/lib/content';
import { musicGroupSchema, videoObjectSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

/**
 * Lives at /artist/live-video rather than under /artist/live, because
 * /artist/live is already the tour-date index and /artist/live/[slug] its detail
 * pages — putting footage there would collide with a show slug and would muddle
 * "live dates" with "live video" in the nav. A standalone URL is also the thing
 * a booking email can link to directly, and giving the video its own page (with
 * the video as the main content) is what Google's video indexing guidelines ask
 * for.
 */
export const metadata: Metadata = pageMeta({
  title: 'Live Video — Full Show at Hotel Café & Live Sessions',
  description:
    "Watch Juliana Beltran perform live: her complete 47-minute set at Hotel Café in Los Angeles with a full band, plus live sessions and official release videos. Live footage for venues, festivals and talent buyers.",
  path: '/artist/live-video',
  image: BOOKING_LIVE_VIDEO.thumbnail,
  imageWidth: BOOKING_LIVE_VIDEO.thumbnailWidth,
  imageHeight: BOOKING_LIVE_VIDEO.thumbnailHeight,
});

export default function LiveVideoPage() {
  return (
    <div className="page-fade artist-theme">
      {/* Warm up the poster/player hosts before the visitor clicks. React
          hoists these into <head>. */}
      <link rel="preconnect" href="https://i.ytimg.com" />
      <link rel="preconnect" href="https://www.youtube-nocookie.com" />

      <Reveal />
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Live performance</div>
          <h1>
            Live <span className="it">video.</span>
          </h1>
        </section>

        {/* The booking pin: an editorial choice, held above the chronological
            listing on purpose. Newer uploads exist (the 2026 release videos) but
            they are studio productions, and a talent buyer follows this page to
            judge live performance. The copy says so out loud so the pin does not
            read as a broken sort. The pitch sentence comes from the pin's own
            `bookingPitch` so it cannot drift out of sync when the pin moves —
            it used to be hard-coded prose describing a single song, which went
            stale the moment a full show took the pin. */}
        <section className="block" style={{ paddingTop: 20, paddingBottom: 60 }}>
          <div className="video-primary-flag reveal">
            <span className="line" />
            <span className="eyebrow">Watch this one &mdash; live</span>
          </div>
          <div className="reveal" style={{ '--rd': '80ms' }}>
            <VideoFacade
              video={BOOKING_LIVE_VIDEO}
              placement="live-video-page"
              primary
              posterPriority
              showSetlist
            />
          </div>
          <p
            className="reveal"
            style={{
              '--rd': '200ms',
              fontFamily: 'var(--serif)',
              fontSize: 19,
              lineHeight: 1.6,
              color: 'var(--ink-soft)',
              fontWeight: 300,
              maxWidth: 720,
              margin: '30px 0 0',
            }}
          >
            {BOOKING_LIVE_VIDEO.bookingPitch ??
              `${videoLength(BOOKING_LIVE_VIDEO)} of live performance — live vocal over a live band, no overdubs. If you only have time for one, make it this one.`}
          </p>
          <p
            className="reveal"
            style={{
              '--rd': '280ms',
              fontFamily: 'var(--serif)',
              fontSize: 15,
              fontStyle: 'italic',
              color: 'var(--muted)',
              fontWeight: 300,
              maxWidth: 720,
              margin: '14px 0 0',
            }}
          >
            Hand-picked for bookers as the strongest live footage &mdash; not the newest upload.
            Jump to any song in the setlist above. Everything below is listed newest first.
          </p>
        </section>

        {/* Everything else, strictly newest-upload-first. The release videos are
            the most recent work, so they lead — each group stays labelled for
            what it is, live or not. */}
        {RELEASE_VIDEOS.length > 0 && (
          <section
            className="block"
            style={{ paddingTop: 20, paddingBottom: 60, borderTop: '1px solid var(--rule)' }}
          >
            <div className="eyebrow reveal" style={{ marginBottom: 8 }}>
              Latest release videos
            </div>
            <p
              className="reveal"
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 15,
                fontStyle: 'italic',
                color: 'var(--muted)',
                fontWeight: 300,
                margin: '0 0 30px',
              }}
            >
              Studio productions, not live footage &mdash; included for current repertoire.
            </p>
            <div className="video-grid">
              {RELEASE_VIDEOS.map((video, i) => (
                <div key={video.slug} className="reveal" style={{ '--rd': `${i * 90}ms` }}>
                  <VideoFacade video={video} placement="live-video-page-releases" />
                </div>
              ))}
            </div>
          </section>
        )}

        {OTHER_LIVE_VIDEOS.length > 0 && (
          <section
            className="block"
            style={{ paddingTop: 20, paddingBottom: 60, borderTop: '1px solid var(--rule)' }}
          >
            <div className="eyebrow reveal" style={{ marginBottom: 8 }}>
              More live sessions
            </div>
            <p
              className="reveal"
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 15,
                fontStyle: 'italic',
                color: 'var(--muted)',
                fontWeight: 300,
                margin: '0 0 30px',
              }}
            >
              Live band performances &mdash; full song, live vocal, no overdubs.
            </p>
            <div className="video-grid">
              {OTHER_LIVE_VIDEOS.map((video, i) => (
                <div key={video.slug} className="reveal" style={{ '--rd': `${i * 90}ms` }}>
                  <VideoFacade video={video} placement="live-video-page-secondary" />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="cta">
          <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
            &mdash; Booking
          </div>
          <h2 className="reveal" style={{ '--rd': '120ms' }}>
            Sound <span className="it">right?</span>
          </h2>
          <p className="reveal" style={{ '--rd': '240ms' }}>
            Bars, venues, festivals, private events. Tell me about the room.
          </p>
          <Link className="btn btn--solid reveal" style={{ '--rd': '320ms' }} href="/artist/booking">
            Book Juliana <span className="arrow">&rarr;</span>
          </Link>
        </section>
      </div>

      <JsonLd
        data={[
          musicGroupSchema(),
          // One standalone VideoObject per video — the shape Google's video
          // rich-result docs expect for a page hosting several videos.
          ...ALL_VIDEOS.map((video) => videoObjectSchema(video)),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Artist', path: '/artist' },
            { name: 'Live Video', path: '/artist/live-video' },
          ]),
        ]}
      />
    </div>
  );
}
