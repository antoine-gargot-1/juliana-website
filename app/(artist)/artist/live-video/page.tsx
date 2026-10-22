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
            listing on purpose — a talent buyer follows this page to judge live
            performance. The pitch comes from the pin's own `bookingPitch` so it
            can't drift out of sync when the pin moves. */}
        <section className="block" style={{ paddingTop: 20, paddingBottom: 60 }}>
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
              fontWeight: 400,
              maxWidth: 720,
              margin: '30px 0 0',
            }}
          >
            {BOOKING_LIVE_VIDEO.bookingPitch ??
              `${videoLength(BOOKING_LIVE_VIDEO)} of live performance — live vocal over a live band, no overdubs. If you only have time for one, make it this one.`}
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
            <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
              Latest release videos
            </div>
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
            <div className="eyebrow reveal" style={{ marginBottom: 30 }}>
              More live sessions
            </div>
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
          <h2>
            Book <span className="it">Juliana.</span>
          </h2>
          <p>Bars, venues, festivals and private events.</p>
          <Link className="btn btn--solid" href="/artist/booking">
            Booking inquiry <span className="arrow">&rarr;</span>
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
