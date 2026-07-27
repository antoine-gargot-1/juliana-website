import type { Metadata } from 'next';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { BookingForm } from '@/components/artist/BookingForm';
import { liveMusicServiceSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Booking — Hire Juliana Beltran for Shows & Events',
  description:
    'Book Juliana Beltran for venues, festivals, weddings, quinceañeras, corporate and private events. Los Angeles based, available nationwide and internationally. Reply within 48 hours.',
  path: '/artist/booking',
});

export default function BookingPage() {
  return (
    <>
      <Reveal />
      <BookingForm />
      <JsonLd
        data={[
          liveMusicServiceSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Artist', path: '/artist' },
            { name: 'Booking', path: '/artist/booking' },
          ]),
        ]}
      />
    </>
  );
}
