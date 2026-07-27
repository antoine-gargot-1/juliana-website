export function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-inner">
        {[...Array(2)].map((_, i) => (
          <span key={i} className="marquee-line">
            <span className="m-word">Voice</span>
            <span className="m-sep" />
            <span className="m-word it">Guitar</span>
            <span className="m-sep" />
            <span className="m-word">Piano</span>
            <span className="m-sep" />
            <span className="m-word it">Songwriting</span>
            <span className="m-sep" />
            <span className="m-word">Artist Development</span>
            <span className="m-sep" />
            <span className="m-word it">Performance</span>
            <span className="m-sep" />
          </span>
        ))}
      </div>
    </div>
  );
}
