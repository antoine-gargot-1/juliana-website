'use client';

import { useId, useState, type ReactNode } from 'react';

import { type LessonMode, modeLabel } from '@/lib/pricing';

/**
 * Online / in-person tabs.
 *
 * ---------------------------------------------------------------------------
 * WHY BOTH PANELS STAY IN THE DOM
 * ---------------------------------------------------------------------------
 * The inactive panel is hidden with the `hidden` attribute, not unmounted. Two
 * reasons, both load-bearing:
 *
 *   SEO — a pricing page whose in-person prices only exist after a click ships
 *   half its prices to a crawler. Both sets are in the served HTML, so the
 *   visible numbers and the Offers in the JSON-LD cannot disagree.
 *
 *   RSC — the panels are server-rendered and handed in as props (the same shape
 *   ParallaxHero uses for its background). This component only owns which one
 *   is visible, so PriceGrid stays a server component and no pricing data ends
 *   up in the client bundle.
 *
 * Tabs rather than a switch because there are exactly two named alternatives
 * with different prices and different availability, and a switch does not say
 * which state is which without a label doing the work anyway.
 */
export function ModeToggle({
  online,
  inperson,
  initial = 'online',
  label = 'Choose a lesson format',
}: {
  online: ReactNode;
  inperson: ReactNode;
  /**
   * Which mode opens first. The LA-local pages open on in-person because that
   * is the intent the ad was bought against; everything else opens on online.
   */
  initial?: LessonMode;
  label?: string;
}) {
  const [active, setActive] = useState<LessonMode>(initial);
  // Namespaced so two toggles on one page cannot collide on aria-controls.
  const base = useId();

  const modes: LessonMode[] = ['online', 'inperson'];

  return (
    <div>
      <div className="mode-tabs" role="tablist" aria-label={label}>
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            role="tab"
            id={`${base}-tab-${mode}`}
            className="mode-tab"
            aria-selected={active === mode}
            aria-controls={`${base}-panel-${mode}`}
            // Only the selected tab is in the tab order; arrow keys move between
            // them, which is the expected keyboard model for a tablist.
            tabIndex={active === mode ? 0 : -1}
            onClick={() => setActive(mode)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
              e.preventDefault();
              const next = modes[(modes.indexOf(active) + 1) % modes.length];
              setActive(next);
              document.getElementById(`${base}-tab-${next}`)?.focus();
            }}
          >
            {modeLabel(mode)}
          </button>
        ))}
      </div>

      {modes.map((mode) => (
        <div
          key={mode}
          role="tabpanel"
          id={`${base}-panel-${mode}`}
          aria-labelledby={`${base}-tab-${mode}`}
          hidden={active !== mode}
        >
          {mode === 'online' ? online : inperson}
        </div>
      ))}
    </div>
  );
}
