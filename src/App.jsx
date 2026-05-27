import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { CursorRing } from './components/CursorRing';
import { Chooser } from './components/Chooser';
import { NotFound } from './components/NotFound';

import { Nav as CoachNav } from './coach/Nav';
import { Footer as CoachFooter } from './coach/Footer';
import { Home as CoachHome } from './coach/Home';
import { About } from './coach/About';
import { Services } from './coach/Services';
import { FAQ } from './coach/FAQ';
import { Contact } from './coach/Contact';

import { ArtistNav } from './artist/Nav';
import { ArtistFooter } from './artist/Footer';
import { ArtistHome } from './artist/Home';
import { Music } from './artist/Music';
import { Live } from './artist/Live';
import { Press } from './artist/Press';
import { Booking } from './artist/Booking';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function CoachLayout() {
  return (
    <>
      <CoachNav />
      <Routes>
        <Route index element={<CoachHome />} />
        <Route path="about" element={<About />} />
        <Route path="services" element={<Services />} />
        <Route path="faq" element={<FAQ />} />
        <Route path="contact" element={<Contact />} />
      </Routes>
      <CoachFooter />
    </>
  );
}

function ArtistLayout() {
  return (
    <>
      <ArtistNav />
      <Routes>
        <Route index element={<ArtistHome />} />
        <Route path="music" element={<Music />} />
        <Route path="live" element={<Live />} />
        <Route path="press" element={<Press />} />
        <Route path="booking" element={<Booking />} />
      </Routes>
      <ArtistFooter />
    </>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Chooser />} />
        <Route path="/coach/*" element={<CoachLayout />} />
        <Route path="/artist/*" element={<ArtistLayout />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <CursorRing />
    </>
  );
}
