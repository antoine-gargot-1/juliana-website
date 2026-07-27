import type { Metadata } from 'next';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { ContactForm } from '@/components/coach/ContactForm';
import { localBusinessSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Book a Lesson — Studio Inquiry',
  description:
    'Tell Juliana about your goals and book a free consultation. Voice, guitar, piano, songwriting and artist development lessons in Los Angeles or online worldwide.',
  path: '/coach/contact',
});

export default function ContactPage() {
  return (
    <>
      <Reveal />
      <ContactForm />
      <JsonLd
        data={[
          localBusinessSchema(),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Coaching', path: '/coach' },
            { name: 'Contact', path: '/coach/contact' },
          ]),
        ]}
      />
    </>
  );
}
