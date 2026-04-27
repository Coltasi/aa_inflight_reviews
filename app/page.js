'use client';

import { useState, useMemo } from 'react';
import styles from './page.module.css';

const SORT_OPTIONS = [
  { key: 'rt-desc', label: 'Best RT' },
  { key: 'rt-asc',  label: 'Worst RT' },
  { key: 'imdb',    label: 'Best IMDb' },
  { key: 'newest',  label: 'Newest' },
  { key: 'oldest',  label: 'Oldest' },
  { key: 'az',      label: 'A–Z' },
];

function RTBadge({ score }) {
  if (score === null || score === undefined) {
    return <div className={`${styles.rtBadge} ${styles.rtNa}`}><span className={styles.rtNum}>—</span><span className={styles.rtSrc}>RT</span></div>;
  }
  const cls = score >= 80 ? styles.rtHigh : score >= 60 ? styles.rtMid : styles.rtLow;
  return (
    <div className={`${styles.rtBadge} ${cls}`}>
      <span className={styles.rtNum}>{score}%</span>
      <span className={styles.rtSrc}>RT</span>
    </div>
  );
}

function ImdbBadge({ rating }) {
  if (!rating) return <div className={`${styles.imdbBadge} ${styles.imdbNa}`}><span className={styles.imdbNum}>—</span><span className={styles.imdbSrc}>IMDb</span></div>;
  return (
    <div className={styles.imdbBadge}>
      <span className={styles.imdbNum}>{rating}</span>
      <span className={styles.imdbSrc}>IMDb</span>
    </div>
  );
}

function MovieRow({ movie, rank }) {
  const imdbUrl = movie.imdbId ? `https://www.imdb.com/title/${movie.imdbId}/` : null;
  const isStrong = movie.criticsScore !== null && movie.criticsScore >= 80;

  return (
    <div className={`${styles.movieRow} ${isStrong ? styles.movieRowStrong : ''}`}>
      <span className={styles.rank}>{rank}</span>
      <div className={styles.movieInfo}>
        <div className={styles.titleRow}>
          {imdbUrl ? (
            <a href={imdbUrl} target="_blank" rel="noopener noreferrer" className={styles.titleLink}>{movie.title}</a>
          ) : (
            <span className={styles.titleText}>{movie.title}</span>
          )}
          {isStrong && <span className={styles.strongBadge}>Strong pick</span>}
        </div>
        <div className={styles.meta}>
          {[movie.genre, movie.year, movie.rating].filter(Boolean).join(' · ')}
          {!movie.rtFound && <span className={styles.notFound}> · not in OMDB</span>}
          {movie.rtFound && movie.criticsScore === null && <span className={styles.notFound}> · no RT score yet</span>}
        </div>
      </div>
      <div className={styles.badges}>
        <RTBadge score={movie.criticsScore} />
        <ImdbBadge rating={movie.imdbRating} />
      </div>
    </div>
  );
}

export default function Home() {
  const [flightNum, setFlightNum] = useState('');
  const [date, setDate]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [data, setData]           = useState(null);
  const [sortBy, setSortBy]       = useState('rt-desc');

  const todayISO = new Date().toISOString().split('T')[0];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!flightNum.trim() || !date) return;
    setLoading(true); setError(''); setData(null);
    try {
      const res  = await fetch(`/api/search?${new URLSearchParams({ flight: flightNum.trim(), date })}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Something went wrong.'); }
      else         { setData(json); setSortBy('rt-desc'); }
    } catch { setError('Network error — please try again.'); }
    finally { setLoading(false); }
  }

  const sorted = useMemo(() => {
    if (!data?.movies) return [];
    const mv = [...data.movies];
    switch (sortBy) {
      case 'rt-desc': return mv.sort((a,b) => (b.criticsScore ?? -1)   - (a.criticsScore ?? -1));
      case 'rt-asc':  return mv.sort((a,b) => (a.criticsScore ?? 101)  - (b.criticsScore ?? 101));
      case 'imdb':    return mv.sort((a,b) => (b.imdbScore ?? -1)      - (a.imdbScore ?? -1));
      case 'newest':  return mv.sort((a,b) => (b.year ?? 0)            - (a.year ?? 0));
      case 'oldest':  return mv.sort((a,b) => (a.year ?? 9999)         - (b.year ?? 9999));
      case 'az':      return mv.sort((a,b) => a.title.localeCompare(b.title));
      default:        return mv;
    }
  }, [data, sortBy]);

  const strongPicks = data?.movies.filter(m => m.criticsScore !== null && m.criticsScore >= 80) || [];

  return (
    <main className={styles.main}>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logoWrap}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <circle cx="18" cy="18" r="18" fill="#C8102E"/>
              <path d="M10 24l5.5-10.5 5.5 10.5M11.5 20.5h8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="26" cy="12" r="3" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <div>
            <h1 className={styles.headerTitle}>AA Movie Rater</h1>
            <p className={styles.headerSub}>Inflight entertainment guide · Rotten Tomatoes + IMDb</p>
          </div>
        </div>
      </header>

      <section className={styles.formSection}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="flight" className={styles.label}>Flight number</label>
            <input id="flight" type="text" value={flightNum} onChange={e => setFlightNum(e.target.value)}
              placeholder="e.g. 67 or AA67" className={styles.input} required autoComplete="off" />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="date" className={styles.label}>Departure date</label>
            <input id="date" type="date" value={date} onChange={e => setDate(e.target.value)}
              min={todayISO} className={styles.input} required />
          </div>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Loading…' : 'Get ratings'}
          </button>
        </form>
        {error && <p className={styles.error}>{error}</p>}
      </section>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.plane}>✈</div>
          <p className={styles.loadingText}>Looking up your flight catalog…</p>
          <p className={styles.loadingNote}>Fetching RT & IMDb scores for every film. Takes ~10s.</p>
        </div>
      )}

      {data && (
        <section className={styles.results}>

          <div className={styles.flightBanner}>
            <div className={styles.flightBannerLeft}>
              <div className={styles.flightRoute}>
                <span className={styles.airport}>{data.flight.departure}</span>
                <span className={styles.arrow}>→</span>
                <span className={styles.airport}>{data.flight.arrival}</span>
              </div>
              <div className={styles.flightMeta}>
                {data.flight.number} · {formatDate(data.flight.date)}
              </div>
            </div>
            <div className={styles.statRow}>
              <div className={styles.stat}>
                <span className={styles.statNum}>{data.totalMovies}</span>
                <span className={styles.statLbl}>movies</span>
              </div>
              <div className={`${styles.stat} ${styles.statAccent}`}>
                <span className={styles.statNum}>{strongPicks.length}</span>
                <span className={styles.statLbl}>strong picks</span>
              </div>
            </div>
          </div>

          <div className={styles.sortRow}>
            <span className={styles.sortLabel}>Sort by</span>
            {SORT_OPTIONS.map(o => (
              <button key={o.key} onClick={() => setSortBy(o.key)}
                className={`${styles.sortBtn} ${sortBy === o.key ? styles.sortBtnActive : ''}`}>
                {o.label}
              </button>
            ))}
          </div>

          <div className={styles.colHeaders}>
            <span className={styles.colRt}>RT</span>
            <span className={styles.colImdb}>IMDb</span>
          </div>

          <div className={styles.movieList}>
            {sorted.map((movie, i) => (
              <MovieRow key={movie.title} movie={movie} rank={i + 1} />
            ))}
          </div>

          <p className={styles.footer}>
            RT scores via <a href="https://www.omdbapi.com" target="_blank" rel="noopener noreferrer">OMDB</a> ·
            New releases may not have RT scores yet ·
            Entertainment catalog from <a href="https://entertainment.aa.com" target="_blank" rel="noopener noreferrer">American Airlines</a>
          </p>
        </section>
      )}
    </main>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
