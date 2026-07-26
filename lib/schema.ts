import {
  AGGREGATE_RATING,
  ARTIST_BIO,
  FAQS,
  SERVICES,
  TESTIMONIALS,
  type Show,
  isPast,
} from './content';
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

export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'MusicSchool'],
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

export function coachingServiceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': abs('/coach#service'),
    name: 'Music coaching with Juliana Beltran',
    serviceType: 'Music lessons',
    provider: { '@id': BUSINESS_ID },
    description:
      'Personalised voice, guitar, piano, songwriting and artist development coaching, online and in person in Los Angeles.',
    areaServed: { '@type': 'City', name: 'Los Angeles' },
    audience: { '@type': 'Audience', audienceType: 'Singers and songwriters, ages 5 to 70+' },
    aggregateRating: aggregateRatingSchema(),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Lessons & coaching',
      itemListElement: SERVICES.map((s) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: s.name,
          description: s.short,
        },
      })),
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
    provider: { '@id': BUSINESS_ID },
    availableLanguage: ['en', 'es'],
    areaServed: [
      { '@type': 'City', name: 'Los Angeles' },
      { '@type': 'Country', name: 'Worldwide (online)' },
    ],
    aggregateRating: aggregateRatingSchema(),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Voice lesson formats',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'In-person voice lessons — Los Angeles',
            description: 'Weekly one-to-one sessions at the Mid-City studio.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Online voice lessons',
            description: 'Calibrated video sessions so technique work translates clearly.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Free 15-minute consultation',
            description: 'A short call to map goals before booking a first lesson.',
          },
        },
      ],
    },
  };
}
