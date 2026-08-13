import { CoachNav } from '@/components/coach/CoachNav';
import { CoachFooter } from '@/components/coach/CoachFooter';
import { StickyCta } from '@/components/coach/StickyCta';
import {
  ASSESSMENT_CARD_COPY,
  ASSESSMENT_CTA_LABEL,
  PURCHASE_CTA_LABEL,
} from '@/components/coach/PriceGrid';

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CoachNav />
      {children}
      <CoachFooter />
      {/*
        The page's primary CTA, sticky on mobile — most paid-search traffic here
        arrives on a phone, and a visitor who has to scroll back to a nav to
        convert usually doesn't.

        MOUNTED EXACTLY ONCE, HERE. Individual pages must NOT render their own:
        the bar is fixed-position, so a second instance sits on top of the first
        and the same CTA is announced twice to a screen reader. Pages used to
        mount their own on top of this one; that is why several of them no longer
        import StickyCta at all.

        Which CTA it shows is decided by StickyCta from the pathname, not passed
        in from here — a server layout does not know the route, and there are now
        two conversion paths (buy a package, or book the free assessment) with a
        different one primary per page. See PURCHASE_FIRST in that file. It also
        suppresses itself on /coach/book* and /coach/purchase*, where a bar
        offering the thing you are already doing steals a tap.

        `note` is a required prop deliberately: the card-hold policy travels with
        the assessment CTA, so no surface can invite a booking without also
        stating that a card is taken and nothing is charged. StickyCta swaps in
        the purchase note instead on pages that sell a package, because there the
        card genuinely is charged.
      */}
      <StickyCta
        note={ASSESSMENT_CARD_COPY}
        label={ASSESSMENT_CTA_LABEL}
        purchaseLabel={PURCHASE_CTA_LABEL}
      />
    </>
  );
}
