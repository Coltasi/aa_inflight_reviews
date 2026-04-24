'use client';

import { useState } from 'react';
import styles from './page.module.css';

function ScoreBadge({ score, type }) {
  if (score === null || score === undefined) return <span className={styles.scoreNa}>—</span>;
  const strong = score >= 80;
  const low = score < 55;
  const cls = strong ? styles.scoreGreen : low ? styles.scoreRed : styles.scoreMid;
  return <span className={`${styles.score} ${cls}`}>{score}%</span>;
}

function MovieRow({ movie, rank }) {
  const hasScores = movie.criticsScore !== null || movie.audienceScore !== null;
  return (
    <div className={styles.movieRow}>
      <span className={styles.rank}>{rank}</span>
      <div className={styles.movieInfo}>
        <div className={styles.titleRow}>
          {movie.rtUrl ? (
            <a href={movie.rtUrl} target="_blank" rel="noopener noreferrer" className={styles.titleLink}>
              {movie.title}
            </a>
          ) : (
            <span className={styles.titleText}>{movie.title}</span>
          )}
          {movie.certified && (
            <span className={styles.freshBadge}>Certified Fresh</span>
          )}
          {movie.criticsScore !== null && movie.criticsScore >= 80 && !movie.certified && (
            <span className={styles.strongBadge}>Strong pick</span>
          )}
        </div>
        <div className={styles.meta}>
          {[movie.genre, movie.year, movie.rating].filter(Boolean).join(' · ')}
          {!hasScores && !movie.rtFound && (
            <span className={styles.notFound}> · not on RT</span>
          )}
          {!hasScores && movie.rtFound && (
            <span className={styles.notFound}> · insufficient reviews</span>
          )}
        </div>
      </div>
      <div className={styles.scores}>
        <div className={styles.scoreCol}>
          <ScoreBadge score={movie.criticsScore} type="critic" />
          <span className={styles.scoreLabel}>critics</span>
        </div>
        <div className={styles.scoreCol}>
          <ScoreBadge score={movie.audienceScore} type="audience" />
          <span className={styles.scoreLabel}>audience</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [flightNum, setFlightNum] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const todayISO = new Date().toISOString().split('T')[0];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!flightNum.trim() || !date) return;

    setLoading(true);
    setError('');
    setData(null);

    try {
      const params = new URLSearchParams({ flight: flightNum.trim(), date });
      const res = await fetch(`/api/search?${params}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Something went wrong.');
      } else {
        setData(json);
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  const strongPicks = data?.movies.filter(
    (m) => m.criticsScore !== null && m.criticsScore >= 80
  ) || [];
  const certFresh = data?.movies.filter((m) => m.certified) || [];

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <circle cx="14" cy="14" r="14" fill="#C8102E" />
              <path d="M8 18l4-8 4 8M9.5 15.5h5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="20" cy="10" r="2.5" fill="white" opacity="0.85" />
            </svg>
          </div>
          <div>
            <h1 className={styles.title}>AA Movie Rater</h1>
            <p className={styles.subtitle}>Inflight entertainment guide powered by Rotten Tomatoes</p>
          </div>
        </div>
      </header>

      <section className={styles.formSection}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="flight" className={styles.label}>Flight number</label>
            <input
              id="flight"
              type="text"
              value={flightNum}
              onChange={(e) => setFlightNum(e.target.value)}
              placeholder="e.g. 67 or AA67"
              className={styles.input}
              required
              autoComplete="off"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="date" className={styles.label}>Departure date</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={todayISO}
              className={styles.input}
              required
            />
          </div>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Looking up movies…' : 'Get movie ratings'}
          </button>
        </form>
        {error && <p className={styles.error}>{error}</p>}
      </section>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} aria-hidden="true" />
          <p>Fetching entertainment catalog and Rotten Tomatoes scores…</p>
          <p className={styles.loadingNote}>This can take 15–30 seconds while we look up each film in parallel.</p>
        </div>
      )}

      {data && (
        <section className={styles.results}>
          <div className={styles.flightHeader}>
            <div>
              <h2 className={styles.flightTitle}>
                {data.flight.number}
                {data.flight.departure && data.flight.arrival
                  ? ` · ${data.flight.departure} → ${data.flight.arrival}`
                  : ''}
              </h2>
              <p className={styles.flightDate}>{formatDate(data.flight.date)}</p>
            </div>
            <div className={styles.statRow}>
              <StatPill label="Movies" value={data.totalMovies} />
              <StatPill label="Strong picks" value={strongPicks.length} accent />
              <StatPill label="Certified Fresh" value={certFresh.length} accent />
            </div>
          </div>

          <div className={styles.columnLabels}>
            <span className={styles.columnCritic}>Critics</span>
            <span className={styles.columnAudience}>Audience</span>
          </div>

          <div className={styles.movieList}>
            {data.movies.map((movie, i) => (
              <MovieRow key={movie.title} movie={movie} rank={i + 1} />
            ))}
          </div>

          <p className={styles.footer}>
            Scores from{' '}
            <a href="https://www.rottentomatoes.com" target="_blank" rel="noopener noreferrer">
              Rotten Tomatoes
            </a>
            . Entertainment catalog from{' '}
            <a href="https://entertainment.aa.com" target="_blank" rel="noopener noreferrer">
              American Airlines
            </a>
            .
          </p>
        </section>
      )}
    </main>
  );
}

function StatPill({ label, value, accent }) {
  return (
    <div className={`${styles.statPill} ${accent ? styles.statPillAccent : ''}`}>
      <span className={styles.statVal}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
