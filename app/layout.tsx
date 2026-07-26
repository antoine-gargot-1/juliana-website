import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

import './styles.css';
import './fonts.css';

import { fontClassNames } from './fonts';
import { CursorRing } from '@/components/CursorRing';
import { JsonLd } from '@/components/JsonLd';
import { personSchema, websiteSchema } from '@/lib/schema';
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, SITE_NAME, SITE_URL, abs } from '@/lib/site';

export const metadata: Metadata = {
  // Forces every relative canonical / og:url onto the canonical www host.
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Juliana Beltran — Colombian Singer-Songwriter & Music Coach in Los Angeles',
    template: '%s | Juliana Beltran',
  },
  description:
    'Juliana Beltran is a Colombian singer-songwriter based in Los Angeles — live shows and event booking, plus voice, guitar, piano and songwriting coaching online and in person.',
  applicationName: SITE_NAME,
  authors: [{ name: 'Juliana Beltran', url: SITE_URL }],
  creator: 'Juliana Beltran',
  publisher: 'Juliana Beltran',
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    url: SITE_URL,
    images: [
      {
        url: abs('/img/juliana-goldenhour.png'),
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: 'Juliana Beltran',
      },
    ],
  },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f6f1e9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontClassNames}>
      <body>
        {children}
        <CursorRing />
        <JsonLd data={[personSchema(), websiteSchema()]} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
