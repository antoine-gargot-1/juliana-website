import {
  AGGREGATE_RATING,
  ARTIST_BIO,
  FAQS,
  SERVICES,
  TESTIMONIALS,
  type Show,
  type Video,
  embedUrl,
  isLiveFootage,
  isPast,
  isoDuration,
  setlistChapters,
  watchUrl,
} from './content';
import {
  ASSESSMENT,
  LESSONS_PER_MONTH,
  type LessonMode,
  type Price,
  formatUsd,
  lookup,
  modeLabel,
  monthlyPlans,
  pack10,
  singleLesson,
  toMajorUnits,
} from './pricing';
import {
  BUSINESS_ID,
  MUSICGROUP_ID,
  PERSON_ID,
  WEBSITE_ID,
} from './seo';
import { EMAIL, OG_IMAGE, PORTRAIT_IMAGE, SAME_AS, SITE_NAME, SITE_URL, abs } from './site';

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

/**
 * Cross-page reference to the coaching business.
 *
 * WHY NOT A BARE `{ '@id': BUSINESS_ID }`: the full LocalBusiness node is
 * emitted on /coach and /coach/contact only. On any other page a bare id
 * reference points at a node that page never defines, so a validator reading
 * that page alone sees a `provider` it cannot resolve. Restating type/name/url
 * makes the reference stand on its own and still merges by `@id` — the same
 * pattern liveMusicServiceSchema already uses for its MusicGroup provider.
 */
const BUSINESS_REF = {
  '@type': 'LocalBusiness',
  '@id': BUSINESS_ID,
  name: 'Juliana Beltran Music Coaching',
  url: abs('/coach'),
} as const;

export function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: 'Juliana Beltran',
    alternateName: 'Juliana Beltrán',
    url: SITE_URL,
    image: abs(PORTRAIT_IMAGE),
    email: `mailto:${EMAIL}`,
    jobTitle: ['Singer-songwriter', 'Vocal coach'],
    nationality: { '@type': 'Country', name: 'Colombia' },
    description: ARTIST_BIO.split('\n\n')[0],
    knowsLanguage: ['en', 'es'],
    sameAs: SAME_AS,
    homeLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Los Angeles',
        addressRegion: 'CA',
        addressCountry: 'US',
      },
    },
  };
}

/**
 * The same Person, enriched for /coach/about — the one page that is genuinely
 * *about* her rather than about a service.
 *
 * WHY THE SAME `@id` RATHER THAN A SECOND ENTITY: personSchema() is emitted
 * across the site with PERSON_ID, and every other node (`author`, `founder`,
 * `publisher`) points at that id. A second Person node with its own id would
 * fork the identity graph and split the credentials away from the entity that
 * everything else references. Re-stating the node under the same `@id` with
 * extra properties is how JSON-LD merges: consumers see one Person who happens
 * to be described most fully on the about page.
 *
 * WHY `hasCredential` AND NOT `alumniOf`: the degree is an Associate of Arts,
 * but nobody has supplied the awarding institution. `alumniOf` expects an
 * Organization/EducationalOrganization, so honouring it would mean inventing a
 * school name in structured data — the one place a fabrication is machine-read
 * and repeated. `hasCredential` (EducationalOccupationalCredential) states the
 * qualification without asserting an institution. Add `alumniOf` the day
 * someone provides the real college.
 */
export function coachPersonSchema() {
  return {
    ...personSchema(),
    // The about page is where a crawler should look for the full description.
    mainEntityOfPage: abs('/coach/about'),
    // Superset of personSchema()'s two titles, not a replacement: the coaching
    // side sells songwriting and artist development as well as voice.
    jobTitle: [
      'Singer-songwriter',
      'Vocal coach',
      'Songwriting coach',
      'Music teacher',
      'Artist development coach',
    ],
    worksFor: BUSINESS_REF,
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      name: 'Associate of Arts',
      credentialCategory: 'Associate degree',
      about: ['Voice', 'Songwriting'],
    },
    /**
     * Topic coverage. Deliberately the things she is on record teaching (see
     * content/coach.json `services`) plus the two credentials the site already
     * claims — touring with Amanda Miguel and Spotify editorial placements make
     * her stronger on performance and release strategy than the degree does,
     * and this list must not quietly shrink to the degree's subjects.
     */
    knowsAbout: [
      'Vocal technique',
      'Breath support',
      'Vocal range extension',
      'Pitch accuracy and ear training',
      'Vocal harmony',
      'Songwriting',
      'Lyric writing',
      'Melody writing',
      'Song structure',
      'Guitar',
      'Piano',
      'Artist development',
      'Live performance coaching',
      'Audition preparation',
      'Bilingual voice instruction in English and Spanish',
      'Latin pop',
    ],
  };
}

export function musicGroupSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    '@id': MUSICGROUP_ID,
    name: 'Juliana Beltran',
    alternateName: 'Juliana Beltrán',
    url: abs('/artist'),
    image: abs(OG_IMAGE),
    email: `mailto:${EMAIL}`,
    description: ARTIST_BIO.replace(/\n\n/g, ' '),
    genre: ['Latin Pop', 'Indie Pop', 'Singer-Songwriter', 'Acoustic'],
    sameAs: SAME_AS,
    member: { '@id': PERSON_ID },
    foundingLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Los Angeles',
        addressRegion: 'CA',
        addressCountry: 'US',
      },
    },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: 'en-US',
    publisher: { '@id': PERSON_ID },
  };
}

/* ------------------------------------------------------------------ */
/* MusicEvent                                                          */
/* ------------------------------------------------------------------ */

export function musicEventSchema(show: Show, { withContext = true } = {}) {
  const past = isPast(show);
  const event: Record<string, unknown> = {
    ...(withContext ? { '@context': 'https://schema.org' } : {}),
    '@type': 'MusicEvent',
    '@id': abs(`/artist/live/${show.slug}`),
    name: `Juliana Beltran at ${show.venue}`,
    url: abs(`/artist/live/${show.slug}`),
    startDate: show.start,
    endDate: show.end,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: [abs(OG_IMAGE)],
    description: show.note
      ? `${show.note} — Juliana Beltran performs live at ${show.venue}, ${show.city}.`
      : `Juliana Beltran performs live at ${show.venue}, ${show.city}.`,
    location: {
      '@type': 'Place',
      name: show.place.name,
      address: {
        '@type': 'PostalAddress',
        ...(show.place.streetAddress ? { streetAddress: show.place.streetAddress } : {}),
        addressLocality: show.place.addressLocality,
        addressRegion: show.place.addressRegion,
        ...(show.place.postalCode ? { postalCode: show.place.postalCode } : {}),
        addressCountry: show.place.addressCountry,
      },
    },
    performer: {
      '@type': 'MusicGroup',
      '@id': MUSICGROUP_ID,
      name: 'Juliana Beltran',
      url: abs('/artist'),
      sameAs: SAME_AS,
    },
    organizer: {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: 'Juliana Beltran',
      url: SITE_URL,
    },
  };

  if (show.tickets) {
    event.offers = {
      '@type': 'Offer',
      url: show.tickets,
      availability: past
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
      ...(show.price != null
        ? { price: String(show.price), priceCurrency: show.priceCurrency }
        : {}),
      validFrom: show.start,
      category: 'primary',
    };
  }

  return event;
}

export function eventListSchema(shows: Show[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Juliana Beltran live dates',
    itemListElement: shows.map((show, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: abs(`/artist/live/${show.slug}`),
      item: musicEventSchema(show, { withContext: false }),
    })),
  };
}

/* ------------------------------------------------------------------ */
/* VideoObject                                                         */
/* ------------------------------------------------------------------ */

export const VIDEO_PAGE = '/artist/live-video';

/**
 * One VideoObject per video. `contentUrl` points at the YouTube watch page and
 * `embedUrl` at the privacy-enhanced player, which is the pairing Google's video
 * structured-data docs ask for when the media is hosted on YouTube rather than
 * served from your own origin.
 */
export function videoObjectSchema(video: Video, { withContext = true } = {}) {
  const live = isLiveFootage(video);
  const chapters = setlistChapters(video);

  return {
    ...(withContext ? { '@context': 'https://schema.org' } : {}),
    '@type': 'VideoObject',
    '@id': abs(`${VIDEO_PAGE}#${video.slug}`),
    name: `Juliana Beltran — ${video.title} (${video.subtitle})`,
    description: video.description,
    thumbnailUrl: [video.thumbnail],
    uploadDate: video.uploadDate,
    // Describes the whole video, so `embedUrl` below must address the whole
    // video too — never a seek offset, or the two disagree.
    duration: isoDuration(video.durationSeconds),
    embedUrl: embedUrl(video),
    contentUrl: watchUrl(video),
    url: abs(`${VIDEO_PAGE}#${video.slug}`),
    inLanguage: video.inLanguage ?? 'es',
    isFamilyFriendly: true,
    genre: live ? 'Live music performance' : 'Music video',
    creator: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
    author: { '@id': PERSON_ID },
    // Key moments. For a 47-minute set this is what lets Google surface the
    // individual songs in the result, and it is the honest way to express
    // "start here" without lying about the video's duration.
    ...(chapters.length
      ? {
          hasPart: chapters.map((chapter) => ({
            '@type': 'Clip',
            name: chapter.cover ? `${chapter.title} (${chapter.cover} cover)` : chapter.title,
            startOffset: chapter.at,
            endOffset: chapter.endsAt,
            url: watchUrl(video, { start: chapter.at }),
          })),
        }
      : {}),
  };
}

/* ------------------------------------------------------------------ */
/* Coaching side                                                       */
/* ------------------------------------------------------------------ */

export function faqPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': abs('/coach/faq#faq'),
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

const stripQuotes = (s: string) => s.replace(/^"|"$/g, '');

export function aggregateRatingSchema() {
  return {
    '@type': 'AggregateRating',
    ratingValue: AGGREGATE_RATING.value,
    reviewCount: AGGREGATE_RATING.count,
    bestRating: AGGREGATE_RATING.best,
    worstRating: AGGREGATE_RATING.worst,
  };
}

export function reviewsSchema() {
  return TESTIMONIALS.map((t) => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: t.name },
    datePublished: t.datePublished,
    reviewBody: stripQuotes(t.quote),
    reviewRating: {
      '@type': 'Rating',
      ratingValue: t.rating,
      bestRating: 5,
      worstRating: 1,
    },
  }));
}

/**
 * The coaching practice as a LocalBusiness / MusicSchool.
 *
 * ---------------------------------------------------------------------------
 * DELIBERATELY ABSENT: `streetAddress`, `geo`, `openingHours`. DO NOT ADD THEM.
 * ---------------------------------------------------------------------------
 * In-person lessons happen in a private residence. There is no studio and no
 * commercial space, so this business is a service-area business, not a
 * storefront, and each of those three properties would assert something untrue:
 *
 *   `streetAddress` / `geo` — publish a home address as a place of business.
 *     Beyond being misleading, listing a residence as a storefront is also what
 *     gets a Google Business Profile suspended (see marketing/gbp-setup.md:
 *     service-area business, address hidden).
 *   `openingHours`          — means "you may turn up during these hours". There
 *     are no drop-in hours; every lesson is a booked appointment. Note that
 *     IN_PERSON_DAYS in lib/pricing.ts exists to configure the *scheduler*, and
 *     is explicitly not the same thing as opening hours.
 *
 * `address` stays, narrowed to locality/region/country: Google requires an
 * address on LocalBusiness, and city-level is the correct granularity for a
 * service-area business. `areaServed` carries the actual local signal, and it
 * does so without implying anywhere a stranger could walk into.
 */
export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    /**
     * Multi-typed because a one-teacher practice is genuinely both.
     *
     * This used to read `['LocalBusiness', 'MusicSchool']`. THERE IS NO
     * `MusicSchool` TYPE IN SCHEMA.ORG — checked against the published
     * vocabulary (schemaorg-current-https.jsonld): the EducationalOrganization
     * subtypes are School, ElementarySchool, MiddleSchool, HighSchool and
     * CollegeOrUniversity, and nothing music-specific exists. An undefined type
     * is silently ignored by consumers, so the "music school" signal was never
     * being read at all. EducationalOrganization is real and is read.
     */
    '@type': ['LocalBusiness', 'EducationalOrganization'],
    '@id': BUSINESS_ID,
    name: 'Juliana Beltran Music Coaching',
    url: abs('/coach'),
    image: abs(OG_IMAGE),
    email: `mailto:${EMAIL}`,
    priceRange: '$$',
    description:
      'Voice, guitar, piano, songwriting and artist development lessons in Los Angeles with Colombian singer-songwriter Juliana Beltran. Online and in person.',
    founder: { '@id': PERSON_ID },
    sameAs: SAME_AS,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Los Angeles',
      addressRegion: 'CA',
      addressCountry: 'US',
    },
    areaServed: [
      { '@type': 'City', name: 'Los Angeles' },
      { '@type': 'AdministrativeArea', name: 'Orange County' },
      { '@type': 'Country', name: 'Worldwide (online)' },
    ],
    knowsLanguage: ['en', 'es'],
    aggregateRating: aggregateRatingSchema(),
    review: reviewsSchema(),
    makesOffer: SERVICES.map((s) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: `${s.name} lessons`,
        description: s.short,
        serviceType: s.name,
        provider: { '@id': PERSON_ID },
      },
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Priced offers — the rate card as schema.org                          */
/* ------------------------------------------------------------------ */

/**
 * Where each delivery mode's lesson page lives. Exported because the sitemap,
 * the nav and the pages themselves all need the same two strings, and a typo in
 * one of them is a 404 that only shows up in Search Console weeks later.
 */
export const LESSONS_PAGE: Record<LessonMode, string> = {
  online: '/coach/lessons/online',
  inperson: '/coach/lessons/in-person',
};

const lessonsServiceId = (mode: LessonMode) => abs(`${LESSONS_PAGE[mode]}#service`);

export const SONGWRITING_SERVICE_ID = abs('/coach/songwriting#service');

/** Serves the local signal without asserting a place. See localBusinessSchema. */
const LOS_ANGELES = { '@type': 'City', name: 'Los Angeles' } as const;
const ONLINE_WORLDWIDE = { '@type': 'Country', name: 'Worldwide (online)' } as const;


const areaServedFor = (mode: LessonMode) => (mode === 'online' ? ONLINE_WORLDWIDE : LOS_ANGELES);

/**
 * How you reach the service, and in which languages.
 *
 * WHY THE LANGUAGES LIVE HERE RATHER THAN ON THE SERVICE: `availableLanguage` is
 * out of domain on `Service`. schema.org's published vocabulary lists its
 * domainIncludes as ContactPoint, Course, LodgingBusiness, ServiceChannel and
 * TouristAttraction — no Service. `ServiceChannel` is the type that is meant to
 * carry it, so the bilingual signal is stated where a consumer will actually
 * read it instead of on a property it drops.
 *
 * `serviceUrl` is /coach/book for every channel: booking is the single entry
 * point, whatever the mode or discipline.
 */
const bookingChannel = (name: string) => ({
  '@type': 'ServiceChannel',
  name,
  serviceUrl: abs('/coach/book'),
  availableLanguage: ['en', 'es'],
});

/**
 * One row of the rate card as an Offer.
 *
 * WHY `price` AND `priceCurrency` AT ALL: until content/pricing.json existed the
 * repo had no prices, so every Offer here was an empty shell — structurally
 * valid, worth nothing in a rich result. Real numbers are the upgrade.
 *
 * WHY A `UnitPriceSpecification` *AS WELL* ON RECURRING PLANS: a bare
 * `price: "280.00"` does not say "per month" anywhere a machine can read it, and
 * $280 read as a one-off is a 4x misstatement of the commitment. schema.org's
 * way to express a billing period is UnitPriceSpecification with `unitCode` in
 * UN/CEFACT codes (`MON` = month) plus `billingDuration`. The flat `price` stays
 * because that is the field consumers actually read; the spec adds the period.
 *
 * Lesson counts live in `name`/`description` rather than in `referenceQuantity`:
 * the reference quantity here is one month of billing, not four lessons, and
 * conflating the two produces a per-lesson price that nobody charges.
 */
function lessonOffer(price: Price) {
  return {
    '@type': 'Offer',
    name: `${modeLabel(price.mode)} — ${price.name}`,
    description: price.blurb,
    price: toMajorUnits(price.amountCents),
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    url: abs('/coach/pricing'),
    seller: { '@id': BUSINESS_ID },
    category:
      price.type === 'monthly'
        ? 'Monthly plan'
        : price.type === 'pack'
          ? 'Lesson pack'
          : 'Single lesson',
    // In-person is Los Angeles only. No address, ever — see localBusinessSchema.
    areaServed: areaServedFor(price.mode),
    ...(price.interval === 'month'
      ? {
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: toMajorUnits(price.amountCents),
            priceCurrency: 'USD',
            unitCode: 'MON',
            billingDuration: 1,
          },
        }
      : {}),
  };
}

/**
 * The rate card for one mode, anchor offer first.
 *
 * Order is deliberate and not `byMode()`'s cheapest-first: the monthly plan is
 * the offer the business wants read first, because retention is what clears
 * breakeven (see monthlySavingVs in lib/pricing.ts). monthlyPlans() already
 * sorts 60-minute before 30-minute.
 */
function rateCard(mode: LessonMode): Price[] {
  const single = singleLesson(mode);
  return [...monthlyPlans(mode), ...(single ? [single] : []), pack10(mode)];
}

/**
 * The free assessment as an Offer, priced at zero.
 *
 * `price: '0'` is a real, meaningful claim — it is the entry point of the whole
 * funnel and the thing the ads bid on. The card-on-file mechanic is stated in
 * the description because it is stated in the copy: being coy about a card
 * capture converts worse, and structured data that contradicts the page is
 * worse still.
 *
 * `withContext: false` when nesting inside another node — same convention as
 * musicEventSchema.
 */
export function assessmentOfferSchema({ withContext = true } = {}) {
  return {
    ...(withContext ? { '@context': 'https://schema.org' } : {}),
    '@type': 'Offer',
    '@id': abs('/coach/book#assessment'),
    name: `Free ${ASSESSMENT.durationMinutes}-minute vocal assessment`,
    description:
      `A ${ASSESSMENT.durationMinutes}-minute one-to-one assessment at no charge — we map your ` +
      'range, habits and goals and you leave with something to work on. A card is taken to hold ' +
      'the slot; nothing is charged for the assessment.',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    url: abs('/coach/book'),
    seller: BUSINESS_REF,
    category: 'Free assessment',
    areaServed: [LOS_ANGELES, ONLINE_WORLDWIDE],
    itemOffered: {
      '@type': 'Service',
      name: 'Vocal assessment',
      serviceType: 'Vocal assessment',
      description: `A ${ASSESSMENT.durationMinutes}-minute assessment of range, technique and goals, in English or Spanish, online or in person in Los Angeles.`,
      provider: BUSINESS_REF,
    },
  };
}

/**
 * Voice/guitar/piano/songwriting/artist-development lessons for one delivery
 * mode — the Service behind /coach/lessons/online and /coach/lessons/in-person.
 *
 * NOTE FOR THE IN-PERSON VARIANT: `areaServed: Los Angeles` and nothing else.
 * No `address`, no `geo`, no `hoursAvailable`. `hoursAvailable` is the Service
 * equivalent of `openingHours` and is out for the same reason — IN_PERSON_DAYS
 * constrains the scheduler, it does not advertise a room to walk into.
 */
export function lessonsServiceSchema(mode: LessonMode) {
  const online = mode === 'online';
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': lessonsServiceId(mode),
    name: online ? 'Online music lessons' : 'In-person music lessons in Los Angeles',
    serviceType: online ? 'Online music lessons' : 'In-person music lessons',
    url: abs(LESSONS_PAGE[mode]),
    image: abs(OG_IMAGE),
    description: online
      ? 'One-to-one voice, guitar, piano, songwriting and artist development lessons over video with Colombian singer-songwriter Juliana Beltran. Calibrated audio so technique work translates, in English or Spanish, anywhere in the world.'
      : 'One-to-one voice, guitar, piano, songwriting and artist development lessons in person in Los Angeles with Colombian singer-songwriter Juliana Beltran, in English or Spanish. The lesson address is shared privately once a booking is confirmed.',
    provider: BUSINESS_REF,
    areaServed: areaServedFor(mode),
    audience: {
      '@type': 'Audience',
      audienceType: 'Singers, songwriters and instrumentalists, ages 5 to 70+',
    },
    aggregateRating: aggregateRatingSchema(),
    availableChannel: bookingChannel(
      online ? 'Online lesson' : 'In-person lesson in Los Angeles',
    ),
    // `offers` directly on the Service, rather than a nested OfferCatalog whose
    // every Offer would need an `itemOffered` pointing back here. Attaching the
    // prices to the Service they belong to says the same thing with no
    // self-reference to keep in sync.
    offers: rateCard(mode).map(lessonOffer),
  };
}

/**
 * Songwriting lessons — the depth play.
 *
 * Voice keywords are a national bloodbath; "songwriting lessons" is winnable, so
 * songwriting gets its own Service rather than living inside the six-discipline
 * catalog. Both modes' offers hang off it because the price is per lesson slot,
 * not per discipline.
 *
 * The free assessment is NOT folded in here: it is a *vocal* assessment, and
 * pages that want it in their markup add `assessmentOfferSchema()` as a sibling
 * node instead of having this Service imply something it does not sell.
 */
export function songwritingServiceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': SONGWRITING_SERVICE_ID,
    name: 'Songwriting lessons with Juliana Beltran',
    serviceType: 'Songwriting lessons',
    url: abs('/coach/songwriting'),
    image: abs(OG_IMAGE),
    description:
      'One-to-one songwriting lessons online and in person in Los Angeles with a releasing Colombian singer-songwriter. Lyric writing, melody, song structure, object writing and emotional storytelling — from a first idea to a finished, recordable song, in English or Spanish.',
    provider: BUSINESS_REF,
    areaServed: [LOS_ANGELES, ONLINE_WORLDWIDE],
    audience: {
      '@type': 'Audience',
      audienceType: 'Songwriters and artists writing their own material, ages 5 to 70+',
    },
    aggregateRating: aggregateRatingSchema(),
    availableChannel: bookingChannel('Songwriting lesson, online or in person in Los Angeles'),
    offers: [
      lessonOffer(lookup('online_monthly_60')),
      lessonOffer(lookup('online_single_60')),
      lessonOffer(lookup('inperson_monthly_60')),
    ],
  };
}

/**
 * The whole rate card for /coach/pricing, both modes plus the free assessment.
 *
 * Structure is OfferCatalog → two nested OfferCatalogs (one per mode) → Offers,
 * which is schema.org's own idiom for a menu of offers and keeps the two modes
 * from being read as alternatives to each other's prices.
 *
 * Each Offer's `itemOffered` is a reference to the mode's lesson Service by the
 * same `@id` those pages emit. Restating a node under an existing `@id` with
 * only a couple of properties is normal JSON-LD merging — the reference
 * resolves on this page (it defines a Service) and joins up with the fuller
 * description on /coach/lessons/*.
 */
export function pricingOfferCatalogSchema() {
  const modeCatalog = (mode: LessonMode) => ({
    '@type': 'OfferCatalog',
    name: `${modeLabel(mode)} lessons`,
    itemListElement: rateCard(mode).map((price) => ({
      ...lessonOffer(price),
      itemOffered: {
        '@type': 'Service',
        '@id': lessonsServiceId(mode),
        name: mode === 'online' ? 'Online music lessons' : 'In-person music lessons in Los Angeles',
        provider: { '@id': BUSINESS_ID },
        areaServed: areaServedFor(mode),
      },
    })),
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    '@id': abs('/coach/pricing#catalog'),
    name: 'Lesson prices',
    url: abs('/coach/pricing'),
    description: `Voice, guitar, piano, songwriting and artist development lessons. Prices cover the lesson slot, not the discipline. Monthly plans bill ${LESSONS_PER_MONTH} lessons a month.`,
    // No `provider` here: OfferCatalog is an ItemList, and `provider` is not in
    // its domain. Each Offer inside carries `seller: BUSINESS_ID` instead, which
    // is where the vocabulary puts that relationship.
    // The free assessment leads: it is the entry point, and a $0 first step is
    // the most useful thing a price catalog can say.
    itemListElement: [
      assessmentOfferSchema({ withContext: false }),
      modeCatalog('online'),
      modeCatalog('inperson'),
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Coaching services                                                   */
/* ------------------------------------------------------------------ */

/**
 * The six disciplines, now priced.
 *
 * HOW THE PRICE MAPS ONTO A DISCIPLINE: the rate card prices the lesson *slot*,
 * so a 60-minute lesson costs the same whether it is voice or piano. Each
 * discipline Offer therefore carries the online 60-minute rate as its `price` —
 * the lowest real price at which that discipline can be bought — and states the
 * in-person rate in the description rather than pretending one number covers
 * both. Both figures are generated from content/pricing.json, so editing the
 * rate card cannot leave stale prose behind.
 *
 * GROUP CLASSES CARRY NO PRICE, ON PURPOSE. They are quoted per group and are
 * deliberately absent from content/pricing.json; inventing a per-head figure
 * here would be the one thing a pricing snippet must never do.
 */
export function coachingServiceSchema() {
  const onlineSingle = lookup('online_single_60');
  const inPersonSingle = lookup('inperson_single_60');
  const QUOTE_ONLY = new Set(['Group Classes']);

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': abs('/coach#service'),
    name: 'Music coaching with Juliana Beltran',
    serviceType: 'Music lessons',
    provider: BUSINESS_REF,
    description:
      'Personalised voice, guitar, piano, songwriting and artist development coaching, online and in person in Los Angeles.',
    areaServed: [LOS_ANGELES, ONLINE_WORLDWIDE],
    audience: { '@type': 'Audience', audienceType: 'Singers and songwriters, ages 5 to 70+' },
    aggregateRating: aggregateRatingSchema(),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Lessons & coaching',
      itemListElement: SERVICES.map((s) => {
        const quoteOnly = QUOTE_ONLY.has(s.name);
        return {
          '@type': 'Offer',
          name: quoteOnly ? s.name : `${s.name} lessons`,
          description: quoteOnly
            ? `${s.short} Quoted per group.`
            : `${s.short} ${formatUsd(onlineSingle.amountCents)} per 60-minute lesson online, ` +
              `${formatUsd(inPersonSingle.amountCents)} in person in Los Angeles; monthly plans cost less per lesson.`,
          url: abs(quoteOnly ? '/coach/contact' : '/coach/pricing'),
          availability: 'https://schema.org/InStock',
          seller: { '@id': BUSINESS_ID },
          ...(quoteOnly
            ? {}
            : { price: toMajorUnits(onlineSingle.amountCents), priceCurrency: 'USD' }),
          itemOffered: {
            '@type': 'Service',
            name: s.name,
            description: s.short,
            serviceType: s.name,
            provider: { '@id': BUSINESS_ID },
          },
        };
      }),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Events / private booking landing page                               */
/* ------------------------------------------------------------------ */

export const EVENT_SERVICE_AREAS = [
  'Los Angeles',
  'Orange County',
  'San Diego',
  'Inland Empire',
  'Palm Springs',
  'Santa Barbara',
  'Temecula',
];

export const EVENT_PACKAGES = [
  {
    name: 'Solo acoustic set',
    description:
      'Voice and guitar, self-contained PA. Ideal for cocktail hours, ceremonies, quinceañera receptions and intimate private parties.',
  },
  {
    name: 'Duo — voice, guitar & percussion',
    description:
      'Warmer, danceable arrangements of cumbia, vallenato, bolero and bachata alongside English-language pop.',
  },
  {
    name: 'Full band',
    description:
      'Four to six pieces for corporate events, galas, weddings and festivals that need the room on its feet.',
  },
];

export function liveMusicServiceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': abs('/live-music-for-events-los-angeles#service'),
    name: 'Live music for events in Los Angeles',
    serviceType: 'Live music entertainment',
    description:
      'Bilingual Colombian vocalist available for weddings, quinceañeras, corporate events and private parties across Southern California. Latin repertoire — cumbia, vallenato, salsa, bachata, boleros — plus English-language pop.',
    url: abs('/live-music-for-events-los-angeles'),
    image: abs(OG_IMAGE),
    provider: {
      '@type': 'MusicGroup',
      '@id': MUSICGROUP_ID,
      name: 'Juliana Beltran',
      url: abs('/artist'),
      sameAs: SAME_AS,
    },
    availableLanguage: ['en', 'es'],
    areaServed: EVENT_SERVICE_AREAS.map((name) => ({ '@type': 'AdministrativeArea', name })),
    offers: EVENT_PACKAGES.map((p) => ({
      '@type': 'Offer',
      name: p.name,
      description: p.description,
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: 'USD',
        // Quoted per event; a public price would be misleading.
        valueAddedTaxIncluded: false,
      },
      availability: 'https://schema.org/InStock',
      url: abs('/artist/booking'),
      seller: { '@id': MUSICGROUP_ID },
    })),
  };
}

export function voiceLessonsServiceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': abs('/coach/voice-lessons-los-angeles#service'),
    name: 'Voice lessons in Los Angeles',
    serviceType: 'Voice lessons',
    url: abs('/coach/voice-lessons-los-angeles'),
    image: abs(OG_IMAGE),
    description:
      'One-to-one voice lessons in Los Angeles and online with Colombian singer-songwriter and vocal coach Juliana Beltran. Healthy technique, breath support, range and stage confidence, in English or Spanish.',
    provider: BUSINESS_REF,
    // Languages ride on the channel, not the Service — see bookingChannel.
    availableChannel: bookingChannel('Voice lesson, online or in person in Los Angeles'),
    areaServed: [LOS_ANGELES, ONLINE_WORLDWIDE],
    aggregateRating: aggregateRatingSchema(),
    /**
     * The three ways to buy a voice lesson, with real prices.
     *
     * REWRITTEN, NOT JUST REPRICED. The in-person entry used to read "Weekly
     * one-to-one sessions at the Mid-City studio" — an assertion of a
     * commercial address that does not exist, in the one format a search
     * engine reads literally. It now names the city and says where the
     * address actually comes from: privately, after booking.
     *
     * The third entry was a "free 15-minute consultation"; the product is now
     * the free 30-minute assessment, which is a real Offer with its own `@id`,
     * so it is composed in rather than restated.
     */
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Voice lesson formats',
      itemListElement: [
        {
          ...lessonOffer(lookup('inperson_monthly_60')),
          name: 'In-person voice lessons — Los Angeles',
          description: `${LESSONS_PER_MONTH} one-to-one 60-minute sessions a month, in person in Los Angeles. The lesson address is shared privately once your first lesson is booked.`,
        },
        {
          ...lessonOffer(lookup('online_monthly_60')),
          name: 'Online voice lessons',
          description: `${LESSONS_PER_MONTH} one-to-one 60-minute sessions a month over video, on a calibrated audio setup so technique work translates clearly.`,
        },
        assessmentOfferSchema({ withContext: false }),
      ],
    },
  };
}
