import { ArtistNav } from '@/components/artist/ArtistNav';
import { ArtistFooter } from '@/components/artist/ArtistFooter';

export default function ArtistLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ArtistNav />
      {children}
      <ArtistFooter />
    </>
  );
}
