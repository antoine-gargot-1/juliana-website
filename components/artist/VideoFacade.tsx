'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { track } from '@/lib/analytics';
import {
  type Video,
  embedUrl,
  setlistChapters,
  timecode,
  videoLength,
  videoYear,
  watchUrl,
} from '@/lib/content';

type Props = {
  video: Video;
  /** Where on the site this player sits — carried into every video event. */
  placement: string;
  /** The designated "watch this one" video — larger frame and heading. */
  primary?: boolean;
  /**
   * Set only where the poster is genuinely above the fold and is the likely LCP
   * element (the live-video page, the EPK). Kept separate from `primary`: on the
   * artist home page the primary video sits far below a priority hero image, and
   * eager-loading its poster there would compete with the real LCP.
   */
  posterPriority?: boolean;
  /**
   * Render the setlist as clickable chapters under the player. Opt-in rather
   * than automatic: it is the right content on the live-video page and in the
   * EPK, where the visitor came to evaluate the performance, but ten rows of
   * tracklist would bury the artist home page's teaser section.
   */
  showSetlist?: boolean;
};

/**
 * Click-to-load YouTube facade.
 *
 * First paint ships a single <img> and a button — no iframe, no YouTube script,
 * no third-party cookies. Embedding YouTube eagerly costs roughly a megabyte of
 * JS across several requests and reliably damages LCP and TBT, which is exactly
 * what we were told not to do to this page. The iframe is only created after a
 * real click, and then it points at youtube-nocookie.com.
 *
 * The poster is a plain <img> rather than next/image on purpose: i.ytimg.com is
 * a remote host, so next/image would need a remotePatterns entry and would then
 * proxy YouTube's already-optimised JPEGs through the image optimiser for no
 * gain. Width/height are set from the JSON so the box never shifts (CLS).
 */
export function VideoFacade({
  video,
  placement,
  primary = false,
  posterPriority = false,
  showSetlist = false,
}: Props) {
  const [activated, setActivated] = useState(false);
  // Seek offset the iframe is currently built for. Changing it remounts the
  // iframe (see `key` below), which is how a setlist click seeks a player that
  // is already running.
  const [startAt, setStartAt] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const activate = useCallback(
    (start = 0, from = 'poster') => {
      setStartAt(start);
      setActivated(true);
      track('video_play', {
        video_id: video.youtubeId,
        video_slug: video.slug,
        video_title: video.title,
        video_kind: video.kind,
        is_primary: primary,
        start_seconds: start,
        from,
        placement,
      });
    },
    [placement, primary, video],
  );

  const chapters = showSetlist ? setlistChapters(video) : [];

  // Watch-through milestones. The IFrame Player API is fetched only once the
  // visitor has already chosen to play something, so it costs nothing on first
  // paint. If it fails to load the video still plays perfectly — we just lose
  // the milestones, which is the right way round for this to degrade.
  useEffect(() => {
    if (!activated) return;

    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    const reached = new Set<number>();

    loadPlayerApi()
      .then((YT) => {
        if (cancelled || !iframeRef.current) return;

        const player = new YT.Player(iframeRef.current, {
          events: {
            onStateChange: (e: { data: number }) => {
              // 0 === ENDED
              if (e.data === 0) {
                track('video_finish', {
                  video_id: video.youtubeId,
                  video_slug: video.slug,
                  placement,
                });
              }
            },
          },
        });

        poll = setInterval(() => {
          const duration = player.getDuration?.() ?? 0;
          const current = player.getCurrentTime?.() ?? 0;
          if (!duration) return;

          const percent = (current / duration) * 100;
          for (const milestone of [25, 50, 75]) {
            if (percent >= milestone && !reached.has(milestone)) {
              reached.add(milestone);
              track('video_milestone', {
                video_id: video.youtubeId,
                video_slug: video.slug,
                video_title: video.title,
                percent: milestone,
                placement,
              });
            }
          }
        }, 2000);
      })
      .catch(() => {
        /* API blocked or offline — playback is unaffected. */
      });

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
    };
    // `startAt` is a dependency because a setlist click remounts the iframe;
    // the previous YT.Player is bound to a detached element and must be rebuilt.
  }, [activated, startAt, placement, video]);

  return (
    <figure className={`video-facade ${primary ? 'is-primary' : ''}`}>
      <div className="video-frame">
        {activated ? (
          <iframe
            // Keyed on the seek offset so picking a track rebuilds the player
            // at that point rather than mutating the src of a live iframe.
            key={startAt}
            ref={iframeRef}
            className="video-player"
            // enablejsapi=1 is what lets the Player API attach to this element
            // after the fact for the watch-through milestones above.
            src={`${embedUrl(video, { autoplay: true, start: startAt })}&enablejsapi=1`}
            title={`${video.title} — ${video.subtitle}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="video-poster"
            onClick={() => activate(0, 'poster')}
            aria-label={`Play ${video.title} — ${video.subtitle}, ${videoLength(video)}`}
          >
            <img
              src={video.thumbnail}
              alt=""
              width={video.thumbnailWidth}
              height={video.thumbnailHeight}
              loading={posterPriority ? 'eager' : 'lazy'}
              fetchPriority={posterPriority ? 'high' : 'auto'}
              decoding="async"
            />
            <span className="video-scrim" aria-hidden="true" />
            <span className="video-play" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26" focusable="false">
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
            </span>
            <span className="video-duration" aria-hidden="true">
              {videoLength(video)}
            </span>
          </button>
        )}
      </div>

      <figcaption className="video-meta">
        <div className="video-meta-head">
          <span className="video-title">
            {video.title} <span className="it">{video.subtitle}</span>
          </span>
          <span className="eyebrow video-year">{videoYear(video)}</span>
        </div>
        {video.credits && <p className="video-credits">{video.credits}</p>}

        {/* The setlist is content, not chrome: "here is what she played for 47
            minutes, and seven of the ten were hers" is itself the pitch, and it
            is real indexable text rather than a thumbnail. Rows are anchors to
            the timestamped watch URL — the same URLs emitted as schema.org Clip
            parts — so they crawl and still work with JS off, but a click is
            intercepted to seek the on-page player instead of leaving the site. */}
        {chapters.length > 0 && (
          <div className="video-setlist">
            <div className="eyebrow video-setlist-head">
              Setlist &mdash; {chapters.length} songs,{' '}
              {chapters.filter((c) => !c.cover).length} originals
            </div>
            <ol>
              {chapters.map((chapter) => (
                <li key={chapter.at}>
                  <a
                    href={watchUrl(video, { start: chapter.at })}
                    onClick={(e) => {
                      // Let modified clicks (new tab, download, middle-click)
                      // behave normally and actually go to YouTube.
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                      e.preventDefault();
                      activate(chapter.at, 'setlist');
                    }}
                  >
                    <span className="video-setlist-time">{timecode(chapter.at)}</span>
                    <span className="video-setlist-title">{chapter.title}</span>
                    <span className="video-setlist-tag">
                      {chapter.cover ? `${chapter.cover} cover` : 'Original'}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* YouTube IFrame Player API                                           */
/* ------------------------------------------------------------------ */

type YTPlayerCtor = new (
  el: HTMLIFrameElement,
  options: { events?: { onStateChange?: (e: { data: number }) => void } },
) => {
  getDuration?: () => number;
  getCurrentTime?: () => number;
};

type YTNamespace = { Player: YTPlayerCtor };

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

/** Loads https://www.youtube.com/iframe_api once, lazily, and memoises it. */
function loadPlayerApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    // The API invokes this global once it has finished parsing. Chain any
    // existing handler so a second facade on the page cannot clobber the first.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
      else reject(new Error('YT namespace missing'));
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('iframe_api failed to load'));
    document.head.appendChild(script);
  });

  return apiPromise;
}
