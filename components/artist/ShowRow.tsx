import Link from 'next/link';
import { showDay, showMonth, type Show } from '@/lib/content';

/**
 * One row of the live list. The venue name links through to the show's own
 * indexable page at /artist/live/[slug].
 */
export function ShowRow({
  show,
  index = 0,
  past = false,
  ticketLabel = 'Tickets',
  emptyLabel = 'Coming soon',
}: {
  show: Show;
  index?: number;
  past?: boolean;
  ticketLabel?: string;
  emptyLabel?: string;
}) {
  return (
    <div className="show-row reveal" style={{ '--rd': `${index * 80}ms` }}>
      <div className="show-date">
        <span className="show-month">{showMonth(show)}</span>
        <span className="show-day">{showDay(show)}</span>
      </div>
      <div className="show-info">
        <div className="show-venue">
          <Link href={`/artist/live/${show.slug}`}>{show.venue}</Link>
        </div>
        <div className="show-city">{show.city}</div>
        {show.note && (
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 14,
              color: 'var(--muted)',
              fontStyle: 'italic',
              marginTop: 4,
            }}
          >
            {show.note}
          </div>
        )}
      </div>
      <div className="show-action">
        {past ? (
          <span className="eyebrow">Past</span>
        ) : show.tickets ? (
          <a href={show.tickets} target="_blank" rel="noopener noreferrer" className="btn">
            {ticketLabel}
          </a>
        ) : (
          <span className="eyebrow">{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}
