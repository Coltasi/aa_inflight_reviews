'use client';

import { useState, useMemo } from 'react';
import s from './page.module.css';

const KIDS_GENRES = ['Animation', 'Family'];

function nullLast(a, b, desc = true) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return desc ? b - a : a - b;
}

const SORT_OPTIONS = [
  { key: 'rt-desc', label: 'Best RT' },
  { key: 'rt-asc',  label: 'Worst RT' },
  { key: 'imdb',    label: 'Best IMDb' },
  { key: 'newest',  label: 'Newest' },
  { key: 'oldest',  label: 'Oldest' },
  { key: 'az',      label: 'A–Z' },
];

function RTBadge({ score }) {
  const na  = score === null || score === undefined;
  const cls = na ? s.scoreNa : score >= 80 ? s.scoreHigh : score >= 60 ? s.scoreMid : s.scoreLow;
  return (
    <div className={`${s.badge} ${cls}`}>
      <span className={s.badgeNum}>{na ? '—' : `${score}%`}</span>
      <span className={s.badgeLbl}>RT</span>
    </div>
  );
}

function ImdbBadge({ rating }) {
  return (
    <div className={`${s.badge} ${rating ? s.scoreImdb : s.scoreNa}`}>
      <span className={s.badgeNum}>{rating || '—'}</span>
      <span className={s.badgeLbl}>IMDb</span>
    </div>
  );
}

function MovieRow({ movie, rank }) {
  const imdbUrl  = movie.imdbId ? `https://www.imdb.com/title/${movie.imdbId}/` : null;
  const isStrong = movie.criticsScore !== null && movie.criticsScore >= 80;
  return (
    <div className={`${s.row} ${isStrong ? s.rowStrong : ''}`}>
      <span className={s.rank}>{rank}</span>
      <div className={s.info}>
        <div className={s.titleRow}>
          {imdbUrl
            ? <a href={imdbUrl} target="_blank" rel="noopener noreferrer" className={s.title}>{movie.title}</a>
            : <span className={s.title}>{movie.title}</span>}
          {isStrong && <span className={s.pill}>Strong pick</span>}
        </div>
        <div className={s.meta}>
          {[movie.genre, movie.year, movie.rating].filter(Boolean).join(' · ')}
          {!movie.rtFound && <span className={s.miss}> · not in database</span>}
          {movie.rtFound && movie.criticsScore === null && <span className={s.miss}> · no RT score yet</span>}
        </div>
      </div>
      <div className={s.scores}>
        <RTBadge  score={movie.criticsScore} />
        <ImdbBadge rating={movie.imdbRating} />
      </div>
    </div>
  );
}

export default function Home() {
  const [flightNum, setFlightNum] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [data, setData]           = useState(null);
  const [sortBy, setSortBy]       = useState('rt-desc');
  const [genreFilter, setGenreFilter] = useState('All');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!flightNum.trim()) return;
    setLoading(true); setError(''); setData(null);
    try {
      const res  = await fetch(`/api/search?${new URLSearchParams({ flight: flightNum.trim() })}`);
      const json = await res.json();
      if (!res.ok) setError(json.error || 'Something went wrong.');
      else { setData(json); setSortBy('rt-desc'); setGenreFilter('All'); }
    } catch { setError('Network error — please try again.'); }
    finally  { setLoading(false); }
  }

  const sorted = useMemo(() => {
    if (!data?.movies) return [];
    const mv = [...data.movies];
    switch (sortBy) {
      case 'rt-desc': return mv.sort((a,b) => nullLast(a.criticsScore, b.criticsScore, true));
      case 'rt-asc':  return mv.sort((a,b) => nullLast(a.criticsScore, b.criticsScore, false));
      case 'imdb':    return mv.sort((a,b) => nullLast(a.imdbScore,    b.imdbScore,    true));
      case 'newest':  return mv.sort((a,b) => nullLast(a.year,         b.year,         true));
      case 'oldest':  return mv.sort((a,b) => nullLast(a.year,         b.year,         false));
      case 'az':      return mv.sort((a,b) => a.title.localeCompare(b.title));
      default:        return mv;
    }
  }, [data, sortBy]);

  // Extract unique individual genres from all movies
  const genres = useMemo(() => {
    if (!data?.movies) return [];
    const set = new Set();
    data.movies.forEach(m => {
      if (m.genre) {
        m.genre.split(' / ').forEach(g => set.add(g.trim()));
      }
    });
    return Array.from(set).sort();
  }, [data]);

  // Has any kids-friendly content?
  const hasKids = useMemo(() =>
    genres.some(g => KIDS_GENRES.includes(g)), [genres]);

  // Apply genre filter on top of sort
  const filtered = useMemo(() => {
    if (genreFilter === 'All') return sorted;
    if (genreFilter === 'Kids') {
      return sorted.filter(m => m.genre && KIDS_GENRES.some(kg => m.genre.includes(kg)));
    }
    return sorted.filter(m => m.genre && m.genre.includes(genreFilter));
  }, [sorted, genreFilter]);

  const strongCount = data?.movies.filter(m => m.criticsScore >= 80).length ?? 0;

  return (
    <div className={s.page}>

      {/* ── Header ── */}
      <header className={s.header}>
        <div className={s.filmStrip} aria-hidden="true">
          {Array.from({length: 20}).map((_,i) => <span key={i} className={s.filmHole}/>)}
        </div>
        <div className={s.headerBody}>
          <div className={s.logoRow}>
            <span className={s.logoIcon} aria-hidden="true">🎬</span>
            <div>
              <h1 className={s.siteName}>The Cabin Critic</h1>
              <p className={s.tagline}>Know what to watch before you board ✈️</p>
            </div>
            <span className={s.popcorn} aria-hidden="true">🍿</span>
          </div>
        </div>
        <div className={s.filmStrip} aria-hidden="true">
          {Array.from({length: 20}).map((_,i) => <span key={i} className={s.filmHole}/>)}
        </div>
      </header>

      <main className={s.main}>

        {/* ── Search form ── */}
        <section className={s.card}>
          <p className={s.cardLabel}>Enter your flight</p>
          <form onSubmit={handleSubmit} className={s.form}>
            <div className={s.field}>
              <label htmlFor="flight" className={s.label}>Flight number</label>
              <input id="flight" type="text" value={flightNum}
                onChange={e => setFlightNum(e.target.value)}
                placeholder="e.g. 67 or AA67"
                className={s.input} required autoComplete="off" />
            </div>
            <button type="submit" className={s.btn} disabled={loading}>
              {loading ? 'Loading…' : 'Get ratings ✈'}
            </button>
          </form>
          {error && <p className={s.error}>{error}</p>}
        </section>

        {/* ── Loading ── */}
        {loading && (
          <div className={s.loading}>
            <div className={s.runway}>
              <div className={s.planeWrap}>
                <span className={s.planeTakeoff} aria-hidden="true">✈️</span>
              </div>
              <div className={s.runwayLine}/>
            </div>
            <p className={s.loadingTitle}>Checking your flight catalog…</p>
            <p className={s.loadingNote}>Looking up RT & IMDb scores for every film</p>
          </div>
        )}

        {/* ── Results ── */}
        {data && (
          <section className={s.results}>

            <div className={s.flightCard}>
              <div className={s.flightLeft}>
                <div className={s.routeRow}>
                  <span className={s.iata}>{data.flight.departure}</span>
                  <span className={s.routePlane}>✈</span>
                  <span className={s.iata}>{data.flight.arrival}</span>
                </div>
                <p className={s.flightSub}>
                  {data.flight.number} · {formatDate(data.flight.date)}
                  {data.flight.aircraft && <span> · {data.flight.aircraft}</span>}
                </p>
                <p className={s.catalogId} title="Unique catalog ID fetched directly from AA's entertainment system">
                  ✓ Live catalog · ID {data.flight.id}
                </p>
              </div>
              <div className={s.stats}>
                <div className={s.stat}>
                  <span className={s.statN}>{data.totalMovies}</span>
                  <span className={s.statL}>movies</span>
                </div>
                <div className={`${s.stat} ${s.statRed}`}>
                  <span className={s.statN}>{strongCount}</span>
                  <span className={s.statL}>strong picks</span>
                </div>
              </div>
            </div>

            <div className={s.sortBar}>
              <span className={s.sortLbl}>Sort</span>
              {SORT_OPTIONS.map(o => (
                <button key={o.key} onClick={() => setSortBy(o.key)}
                  className={`${s.sortBtn} ${sortBy === o.key ? s.sortActive : ''}`}>
                  {o.label}
                </button>
              ))}
            </div>

            {/* ── Genre filter ── */}
            {genres.length > 0 && (
              <div className={s.genreBar}>
                <span className={s.sortLbl}>Genre</span>
                <select
                  value={genreFilter}
                  onChange={e => setGenreFilter(e.target.value)}
                  className={s.genreSelect}>
                  <option value="All">All genres</option>
                  {hasKids && <option value="Kids">👶 Kids</option>}
                  {genres
                    .filter(g => !KIDS_GENRES.includes(g))
                    .map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            )}

            <div className={s.colHdr}>
              <span className={s.colRt}>RT</span>
              <span className={s.colImdb}>IMDb</span>
            </div>

            <div className={s.list}>
              {filtered.length > 0
                ? filtered.map((movie, i) => (
                    <MovieRow key={`${movie.title}-${i}`} movie={movie} rank={i + 1} />
                  ))
                : <p className={s.emptyGenre}>No {genreFilter} movies on this flight.</p>
              }
            </div>

            <p className={s.footer}>
              Scores via <a href="https://www.omdbapi.com" target="_blank" rel="noopener noreferrer">OMDB</a> &amp; <a href="https://www.rottentomatoes.com" target="_blank" rel="noopener noreferrer">Rotten Tomatoes</a> ·
              Catalog from <a href="https://entertainment.aa.com" target="_blank" rel="noopener noreferrer">American Airlines</a>
            </p>
          </section>
        )}

        <footer className={s.siteFooter}>
          <span>© {new Date().getFullYear()} The Cabin Critic</span>
          <span className={s.footerDot}>·</span>
          <a href="/about" className={s.footerLink}>About</a>
          <span className={s.footerDot}>·</span>
          <a href="/privacy" className={s.footerLink}>Privacy Policy</a>
        </footer>
      </main>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return new Date(Number(y), Number(m)-1, Number(d))
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
