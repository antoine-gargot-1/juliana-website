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

/**
 * `live-show`    — a full set in front of an audience at a real venue.
 * `live-session` — one song captured live with the band, no audience.
 * `music-video`  — studio/official production. Not live footage.
 */
export type VideoKind = 'live-show' | 'live-session' | 'music-video';

/**
 * The kinds that are genuine live-performance footage, and therefore the only
 * kinds allowed to hold the booking pin. Deliberately a whitelist rather than
 * `kind !== 'music-video'`: a new non-live kind added later should fail the
 * guard by default instead of quietly qualifying.
 */
export const LIVE_KINDS: readonly VideoKind[] = ['live-show', 'live-session'];

export const isLiveFootage = (video: Video) => LIVE_KINDS.includes(video.kind);

/** One song within a longer set, at `at` seconds in. `cover` names the original artist. */
export type SetlistTrack = { at: number; title: string; cover: string | null };

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
  /** BCP-47 tag(s) for VideoObject. Defaults to Spanish where absent. */
  inLanguage?: string | string[];
  /** Booking blurb shown next to the pin. Keeps the sales copy with the data. */
  bookingPitch?: string;
  /** Chapters for a multi-song set — rendered as deep links and as Clip markup. */
  setlist?: SetlistTrack[];
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

/**
 * Field-by-field pick rather than a cast.
 *
 * `Video` is handed straight to <VideoFacade>, a client component, so whatever
 * this returns is serialised verbatim into the RSC flight payload and is
 * readable in page source. The JSON rows carry `_comment` / `_risk` /
 * `_setlist` / `_startTime` maintainer notes — internal editorial reasoning,
 * including who does and does not control a given upload — which has no
 * business being published on an EPK that talent buyers read. A cast would ship
 * all of it; this drops every key that is not part of the contract.
 */
const toVideo = (raw: (typeof videosJson.videos)[number]): Video => ({
  slug: raw.slug,
  youtubeId: raw.youtubeId,
  title: raw.title,
  subtitle: raw.subtitle,
  kind: raw.kind as VideoKind,
  uploadDate: raw.uploadDate,
  durationSeconds: raw.durationSeconds,
  thumbnail: raw.thumbnail,
  thumbnailWidth: raw.thumbnailWidth,
  thumbnailHeight: raw.thumbnailHeight,
  description: raw.description,
  credits: raw.credits,
  ...('inLanguage' in raw ? { inLanguage: raw.inLanguage } : {}),
  ...('bookingPitch' in raw ? { bookingPitch: raw.bookingPitch } : {}),
  ...('setlist' in raw ? { setlist: raw.setlist as SetlistTrack[] } : {}),
});

/** Every video, newest upload first. */
export const ALL_VIDEOS = videosJson.videos.map(toVideo).sort(byNewest);

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
  if (!isLiveFootage(found)) {
    throw new Error(
      `content/videos.json: bookingLiveVideoSlug "${slug}" is kind "${found.kind}". ` +
        `It must be one of ${LIVE_KINDS.join(' | ')} — a talent buyer follows this ` +
        'link to see her perform live, so an official/studio video cannot serve as ' +
        'the booking video. If you were trying to surface the newest upload, note ' +
        'that the listing is already sorted newest-first; leave this pin on live footage.',
    );
  }
  return found;
})();

/** Every live performance, newest first — including the booking pin. */
export const LIVE_VIDEOS = ALL_VIDEOS.filter(isLiveFootage);

/** Live performances other than the booking pin (which is shown separately). */
export const OTHER_LIVE_VIDEOS = LIVE_VIDEOS.filter((v) => v.slug !== BOOKING_LIVE_VIDEO.slug);

/** Official release videos — not live footage, kept visually separate. */
export const RELEASE_VIDEOS = ALL_VIDEOS.filter((v) => v.kind === 'music-video');

/** 238 -> "3:58", 2839 -> "47:19". Minutes are not wrapped into hours. */
export function videoLength(video: Video) {
  return timecode(video.durationSeconds);
}

/** 799 -> "13:19" — the label on a setlist row. */
export function timecode(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Setlist rows paired with the offset each one ends at, so a chapter can be
 * expressed as a half-open [start, end) range. The last track runs to the end
 * of the video. Returns [] when the video is a single song.
 */
export function setlistChapters(video: Video) {
  const tracks = video.setlist ?? [];
  return tracks.map((track, i) => ({
    ...track,
    endsAt: tracks[i + 1]?.at ?? video.durationSeconds,
  }));
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

/**
 * Privacy-enhanced embed. youtube-nocookie sets no tracking cookie until play.
 *
 * `start` is a seek offset in seconds, used when a visitor picks a track out of
 * the setlist. It is left at 0 for the canonical embed: the `embedUrl` that goes
 * into VideoObject has to address the whole video, because the `duration` beside
 * it describes the whole video.
 */
export function embedUrl(video: Video, { autoplay = false, start = 0 } = {}) {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    ...(autoplay ? { autoplay: '1' } : {}),
    ...(start > 0 ? { start: String(start) } : {}),
  });
  return `https://www.youtube-nocookie.com/embed/${video.youtubeId}?${params}`;
}

/** `start` in seconds becomes `&t=` — the form Google's Clip markup requires. */
export function watchUrl(video: Video, { start = 0 } = {}) {
  const base = `https://www.youtube.com/watch?v=${video.youtubeId}`;
  return start > 0 ? `${base}&t=${start}` : base;
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
