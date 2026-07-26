import type { Metadata } from 'next';
import { OG_IMAGE, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, SITE_NAME, SITE_URL, abs } from './site';

type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
};

/**
 * Single place where canonical URL, OpenGraph and Twitter tags are assembled so
 * every route gets a distinct, correct head. `metadataBase` lives in the root
 * layout and forces the www host onto every relative URL.
 */
export function pageMeta({
  title,
  description,
  path,
  image = OG_IMAGE,
  imageWidth = OG_IMAGE_WIDTH,
  imageHeight = OG_IMAGE_HEIGHT,
  type = 'website',
  noindex = false,
}: PageMetaInput): Metadata {
  const url = abs(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type,
      locale: 'en_US',
      images: [{ url: abs(image), width: imageWidth, height: imageHeight, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [abs(image)],
    },
  };
}

/* ------------------------------------------------------------------ */
/* JSON-LD builders                                                     */
/* ------------------------------------------------------------------ */

export type Crumb = { name: string; path: string };

export function breadcrumbList(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  };
}

export const PERSON_ID = `${SITE_URL}/#person`;
export const MUSICGROUP_ID = `${SITE_URL}/artist#musicgroup`;
export const BUSINESS_ID = `${SITE_URL}/coach#business`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
