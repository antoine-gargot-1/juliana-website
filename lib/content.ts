import artistJson from '@/content/artist.json';
import coachJson from '@/content/coach.json';
import showsJson from '@/content/shows.json';
import videosJson from '@/content/videos.json';

/* ---------------- types ---------------- */

export type Stat = { value: string; label: string };
export type Release = { title: string; type: string; status: string };
export type Playlist = { name: string; url: string; embedId: string };
export type PressQuote = { quote: string; source: string };
export type PressArticle = {
  title: string;
  source: string;
  date: string;
  url: string;
  excerpt: string;
};

export type Place = {
  name: string;
  streetAddress?: string;
  addressLocality: string;
  addressRegion: string;
  postalCode?: string;
  addressCountry: string;
};

export type Show = {
  slug: string;
  date: string;
  start: string;
  end: string;
  venue: string;
  city: string;
  note: string | null;
  tickets: string | null;
  price: string | number | null;
  priceCurrency: string;
  place: Place;
};

export type VideoKind = 'live-session' | 'music-video';

export type Video = {
  slug: string;
  youtubeId: string;
  title: string;
  subtitle: string;
  kind: VideoKind;
  /** ISO 8601 date, YYYY-MM-DD. */
  uploadDate: string;
  durationSeconds: number;
  thumbnail: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  description: string;
  credits: string | null;
};

export type Service = {
  n: string;
  name: string;
  short: string;
  bullets: string[];
  lead: string;
};
export type Testimonial = {
  quote: string;
  name: string;
  rating: number;
  datePublished: string;
};
export type Faq = { q: string; a: string };
export type Credit = { what: string; em: string };

/* ---------------- artist ---------------- */

export const STATS = artistJson.stats.map(({ value, label }) => ({ value, label })) as Stat[];
export const DISCOGRAPHY = artistJson.discography as Release[];
export const PLAYLISTS = artistJson.playlists as Playlist[];
export const PRESS_QUOTES = artistJson.pressQuotes as PressQuote[];
export const PRESS_ARTICLES = artistJson.pressArticles as PressArticle[];
export const NOTABLE_VENUES = artistJson.notableVenues as string[];
export const ARTIST_BIO = artistJson.bio as string;

/* ---------------- videos ---------------- */

/**
 * Two independent concerns live in this block, and they must not be merged:
 *
 *   DISPLAY ORDER  — always newest upload first. Every exported list below is
 *                    sorted by `uploadDate` descending, so ordering is a
 *                    property of the data, not of where a row happens to sit
 *                    in videos.json.
 *   BOOKING PIN    — `BOOKING_LIVE_VIDEO`, the single video a booking email
 *                    points a talent buyer at. It is an editorial choice and
 *                    is deliberately exempt from the recency sort: the buyer
 *                    is clicking through to judge whether she can perform
 *                    live, so it has to be real live footage even when a
 *                    studio release video is newer.
 *
 * Sorting the pin into the listing (or, worse, defining the pin as "whatever
 * is first") would silently hand a talent buyer a music video. Don't.
 */

/** ISO YYYY-MM-DD strings sort correctly as plain strings. Newest first. */
const byNewest = (a: Video, b: Video) => b.uploadDate.localeCompare(a.uploadDate);

/** Every video, newest upload first. */
export const ALL_VIDEOS = [...(videosJson.videos as Video[])].sort(byNewest);

/**
 * The live performance a talent buyer should watch — the target of the EPK and
 * of booking outreach. Resolved from `bookingLiveVideoSlug` rather than from
 * array position or from the recency sort, so reordering can never silently
 * demote it.
 *
 * Both guards below are build-time failures rather than runtime fallbacks: a
 * booking link that quietly points at nothing, or at a studio video, is worse
 * than a failed deploy.
 */
export const BOOKING_LIVE_VIDEO: Video = (() => {
  const slug = videosJson.bookingLiveVideoSlug;
  const found = ALL_VIDEOS.find((v) => v.slug === slug);
  if (!found) {
    throw new Error(
      `content/videos.json: bookingLiveVideoSlug "${slug}" matches no video slug.`,
    );
  }
  if (found.kind !== 'live-session') {
    throw new Error(
      `content/videos.json: bookingLiveVideoSlug "${slug}" is kind "${found.kind}". ` +
        'It must be a "live-session" — a talent buyer follows this link to see her ' +
        'perform live, so an official/studio video cannot serve as the booking video. ' +
        'If you were trying to surface the newest upload, note that the listing is ' +
        'already sorted newest-first; leave this pin on live footage.',
    );
  }
  return found;
})();

/** Every live performance, newest first — including the booking pin. */
export const LIVE_VIDEOS = ALL_VIDEOS.filter((v) => v.kind === 'live-session');

/** Live performances other than the booking pin (which is shown separately). */
export const OTHER_LIVE_VIDEOS = LIVE_VIDEOS.filter((v) => v.slug !== BOOKING_LIVE_VIDEO.slug);

/** Official release videos — not live footage, kept visually separate. */
export const RELEASE_VIDEOS = ALL_VIDEOS.filter((v) => v.kind === 'music-video');

/** 238 -> "3:58" */
export function videoLength(video: Video) {
  const m = Math.floor(video.durationSeconds / 60);
  const s = video.durationSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 238 -> "PT3M58S", the ISO 8601 duration VideoObject requires. */
export function isoDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s ? `${s}S` : ''}` || 'PT0S';
}

/** "Apr 2018" — same label convention as the press list. */
export function videoYear(video: Video) {
  return new Date(`${video.uploadDate}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Privacy-enhanced embed. youtube-nocookie sets no tracking cookie until play. */
export function embedUrl(video: Video, { autoplay = false } = {}) {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    ...(autoplay ? { autoplay: '1' } : {}),
  });
  return `https://www.youtube-nocookie.com/embed/${video.youtubeId}?${params}`;
}

export function watchUrl(video: Video) {
  return `https://www.youtube.com/watch?v=${video.youtubeId}`;
}

/* ---------------- coach ---------------- */

export const SERVICES = coachJson.services as Service[];
export const TESTIMONIALS = coachJson.testimonials as Testimonial[];
export const FAQS = coachJson.faqs as Faq[];
export const CREDITS = coachJson.credits as Credit[];

export const AGGREGATE_RATING = {
  value: (
    TESTIMONIALS.reduce((sum, t) => sum + t.rating, 0) / TESTIMONIALS.length
  ).toFixed(1),
  count: TESTIMONIALS.length,
  best: 5,
  worst: 1,
};

/* ---------------- shows ---------------- */

const LA_TZ = 'America/Los_Angeles';

export const ALL_SHOWS = (showsJson.shows as Show[])
  .slice()
  .sort((a, b) => b.start.localeCompare(a.start));

/**
 * Upcoming/past is derived from the show's ISO end time, never from which
 * array a row happens to live in. A dated row can therefore never get stuck
 * in "upcoming" once its date passes.
 */
export function partitionShows(now: Date = new Date()) {
  const t = now.getTime();
  const upcoming = ALL_SHOWS.filter((s) => new Date(s.end).getTime() >= t).sort((a, b) =>
    a.start.localeCompare(b.start),
  );
  const past = ALL_SHOWS.filter((s) => new Date(s.end).getTime() < t);
  return { upcoming, past };
}

export function getShow(slug: string): Show | undefined {
  return ALL_SHOWS.find((s) => s.slug === slug);
}

export function isPast(show: Show, now: Date = new Date()) {
  return new Date(show.end).getTime() < now.getTime();
}

/** "Sep" — formatted in LA time so the build machine's TZ cannot shift the day. */
export function showMonth(show: Show) {
  return new Date(show.start).toLocaleDateString('en-US', {
    month: 'short',
    timeZone: LA_TZ,
  });
}

/** "1" */
export function showDay(show: Show) {
  return new Date(show.start).toLocaleDateString('en-US', {
    day: 'numeric',
    timeZone: LA_TZ,
  });
}

/** "Tuesday, September 1, 2026" */
export function showLongDate(show: Show) {
  return new Date(show.start).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: LA_TZ,
  });
}

/** "8:00 PM" */
export function showTime(show: Show) {
  return new Date(show.start).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: LA_TZ,
  });
}

export function showYear(show: Show) {
  return new Date(show.start).toLocaleDateString('en-US', {
    year: 'numeric',
    timeZone: LA_TZ,
  });
}

/** Press articles store ISO dates; the page label stays "Apr 2026". */
export function monthYear(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
