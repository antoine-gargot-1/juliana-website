import { ArtistNav } from '@/components/artist/ArtistNav';
import { ArtistFooter } from '@/components/artist/ArtistFooter';
import { MetaPixel } from '@/components/artist/MetaPixel';

export default function ArtistLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MetaPixel disabled={process.env.SITE_NOINDEX === '1'} />
      <ArtistNav />
      {children}
      <ArtistFooter />
    </>
  );
}
