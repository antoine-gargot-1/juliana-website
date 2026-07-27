import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { VideoFacade } from '@/components/artist/VideoFacade';
import {
  ALL_VIDEOS,
  OTHER_LIVE_VIDEOS,
  PRIMARY_VIDEO,
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
  title: 'Live Video — Full-Band Live Sessions',
  description:
    'Watch Juliana Beltran perform live: full-song, live-vocal band sessions plus official release videos. Live footage for venues, festivals and talent buyers.',
  path: '/artist/live-video',
  image: PRIMARY_VIDEO.thumbnail,
  imageWidth: PRIMARY_VIDEO.thumbnailWidth,
  imageHeight: PRIMARY_VIDEO.thumbnailHeight,
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

        {/* Primary — the one a talent buyer should watch */}
        <section className="block" style={{ paddingTop: 20, paddingBottom: 60 }}>
          <div className="video-primary-flag reveal">
            <span className="line" />
            <span className="eyebrow">Watch this one</span>
          </div>
          <div className="reveal" style={{ '--rd': '80ms' }}>
            <VideoFacade video={PRIMARY_VIDEO} placement="live-video-page" primary posterPriority />
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
            A complete song, one take, live vocal over a live four-piece band &mdash;{' '}
            {videoLength(PRIMARY_VIDEO)} of what the set actually sounds like in a room. If
            you only have time for one, make it this one.
          </p>
        </section>

        {/* Remaining live sessions */}
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

        {/* Release videos, clearly labelled as not-live */}
        {RELEASE_VIDEOS.length > 0 && (
          <section
            className="block"
            style={{ paddingTop: 20, paddingBottom: 60, borderTop: '1px solid var(--rule)' }}
          >
            <div className="eyebrow reveal" style={{ marginBottom: 8 }}>
              Release videos
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
