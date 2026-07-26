import type { MetadataRoute } from 'next';
import { SITE_URL, abs } from '@/lib/site';

/**
 * Preview and staging deployments serve a byte-for-byte copy of the site whose
 * canonical tags point at production. A canonical is a hint, not a directive,
 * so a crawlable copy can still be indexed and compete with www in search.
 *
 * Any deployment that sets SITE_NOINDEX=1 therefore disallows crawling wholesale
 * and drops the sitemap reference. Production never sets it. The flag is opt-in
 * rather than derived from VERCEL_ENV because a throwaway review project builds
 * to its *own* production target, so VERCEL_ENV reads "production" there too.
 */
const NOINDEX = process.env.SITE_NOINDEX === '1';

export default function robots(): MetadataRoute.Robots {
  if (NOINDEX) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: abs('/sitemap.xml'),
    host: SITE_URL,
  };
}
