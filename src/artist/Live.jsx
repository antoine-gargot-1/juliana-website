import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { UPCOMING_SHOWS, PAST_SHOWS } from './constants';

export function Live() {
  useReveal();

  return (
    <div className="page-fade artist-theme">
      <div className="wrap">
        <section className="svc-page-hero">
          <div className="eyebrow">Tour dates &amp; appearances</div>
          <h1>Live.</h1>
        </section>

        <section className="block" style={{ paddingTop: 20 }}>
          {UPCOMING_SHOWS.length > 0 ? (
            <>
              <div className="eyebrow reveal" style={{ marginBottom: 30 }}>Upcoming</div>
              <div className="shows-list">
                {UPCOMING_SHOWS.map((show, i) => {
                  const d = new Date(show.date);
                  return (
                    <div key={i} className="show-row reveal" style={{ '--rd': `${i * 80}ms` }}>
                      <div className="show-date">
                        <span className="show-month">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                        <span className="show-day">{d.getDate()}</span>
                      </div>
                      <div className="show-info">
                        <div className="show-venue">{show.venue}</div>
                        <div className="show-city">{show.city}</div>
                        {show.note && <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4 }}>{show.note}</div>}
                      </div>
                      <div className="show-action">
                        {show.tickets ? (
                          <a href={show.tickets} target="_blank" rel="noopener noreferrer" className="btn">Tickets &nearr;</a>
                        ) : (
                          <span className="eyebrow">Details coming</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="reveal" style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink-soft)', fontWeight: 300 }}>
                No upcoming shows announced yet.
              </p>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--muted)', fontWeight: 300, marginTop: 8 }}>
                Follow on <a href="https://www.instagram.com/juliana.beltran/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Instagram</a> for updates.
              </p>
            </div>
          )}

          {PAST_SHOWS.length > 0 && (
            <div style={{ marginTop: 80 }}>
              <div className="eyebrow reveal" style={{ marginBottom: 30 }}>Past shows</div>
              <div className="shows-list" style={{ opacity: 0.6 }}>
                {PAST_SHOWS.map((show, i) => {
                  const d = new Date(show.date);
                  return (
                    <div key={i} className="show-row reveal" style={{ '--rd': `${i * 80}ms` }}>
                      <div className="show-date">
                        <span className="show-month">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                        <span className="show-day">{d.getDate()}</span>
                      </div>
                      <div className="show-info">
                        <div className="show-venue">{show.venue}</div>
                        <div className="show-city">{show.city}</div>
                        {show.note && <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4 }}>{show.note}</div>}
                      </div>
                      <div className="show-action">
                        <span className="eyebrow">Past</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="cta">
          <h2>Book a <span className="it">show.</span></h2>
          <p>Interested in having Juliana perform at your venue or event?</p>
          <Link className="btn btn--solid" to="/artist/booking">
            Booking inquiry <span className="arrow">&rarr;</span>
          </Link>
        </section>
      </div>
    </div>
  );
}
