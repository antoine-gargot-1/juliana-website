/** Canonical origin. www is canonical; the apex 308-redirects to it (see vercel.json). */
export const SITE_URL = 'https://www.juliana-beltran.com';

export const SITE_NAME = 'Juliana Beltran';

export const EMAIL = 'julianabeltranmusic@gmail.com';

export const SOCIAL = {
  spotify: 'https://open.spotify.com/artist/5NfNMKwOPzCw9S1s3OMS6z',
  youtube: 'https://www.youtube.com/@juliana.beltran',
  instagram: 'https://www.instagram.com/juliana.beltran/',
  appleMusic: 'https://music.apple.com/uy/artist/juliana-beltr%C3%A1n/1212882399',
} as const;

export const SAME_AS = [SOCIAL.spotify, SOCIAL.youtube, SOCIAL.instagram, SOCIAL.appleMusic];

/** Default social share image (also the LCP hero). */
export const OG_IMAGE = '/img/juliana-goldenhour.png';
export const OG_IMAGE_WIDTH = 1990;
export const OG_IMAGE_HEIGHT = 3355;

export const PORTRAIT_IMAGE = '/img/juliana-portrait.jpg';

export const abs = (path: string) => new URL(path, SITE_URL).toString();
