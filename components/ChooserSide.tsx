'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Each half of the chooser is a real <a> now (it used to be a div with an
 * onClick, invisible to crawlers). The localStorage write still happens on the
 * client so returning visitors land straight in their side of the site.
 */
export function ChooserSide({
  mode,
  className,
  children,
}: {
  mode: 'coach' | 'artist';
  className: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={`/${mode}`}
      className={className}
      onClick={() => {
        try {
          localStorage.setItem('juliana-mode', mode);
        } catch {
          /* storage blocked — navigation still works */
        }
      }}
    >
      {children}
    </Link>
  );
}
