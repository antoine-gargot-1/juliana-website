import type { MetadataRoute } from 'next';
import { ALL_SHOWS, isPast } from '@/lib/content';
import { abs } from '@/lib/site';

export const revalidate = 86400;

type Entry = MetadataRoute.Sitemap[number];

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: Entry['changeFrequency'] }[] =
  [
    { path: '/', priority: 1.0, changeFrequency: 'monthly' },
    { path: '/artist', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/artist/music', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/artist/live-video', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/artist/live', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/artist/press', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/artist/booking', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/live-music-for-events-los-angeles', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/coach', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/coach/about', priority: 0.7, changeFrequency: 'yearly' },
    { path: '/coach/services', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/coach/voice-lessons-los-angeles', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/coach/faq', priority: 0.7, changeFrequency: 'yearly' },
    { path: '/coach/contact', priority: 0.8, changeFrequency: 'yearly' },
  ];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: abs(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const showEntries: MetadataRoute.Sitemap = ALL_SHOWS.map((show) => ({
    url: abs(`/artist/live/${show.slug}`),
    lastModified: now,
    changeFrequency: 'weekly',
    // Past shows still deserve to be indexed, just below the live ones.
    priority: isPast(show, now) ? 0.4 : 0.8,
  }));

  return [...staticEntries, ...showEntries];
}
