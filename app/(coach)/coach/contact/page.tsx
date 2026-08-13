import type { Metadata } from 'next';

import { JsonLd } from '@/components/JsonLd';
import { Reveal } from '@/components/Reveal';
import { ContactForm } from '@/components/coach/ContactForm';
import { localBusinessSchema } from '@/lib/schema';
import { breadcrumbList, pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'Contact Juliana — Ask Something Before You Book',
  description:
    'Send Juliana a question about voice, guitar, piano, songwriting or artist development lessons — or book the free 30-minute assessment straight away. Lessons in Los Angeles or online worldwide, in English or Spanish.',
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
