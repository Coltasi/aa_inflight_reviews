import { NextResponse } from 'next/server';

export const maxDuration = 60;

const OMDB_KEY = '6aea7b62';
const AA_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://entertainment.aa.com',
  Referer: 'https://entertainment.aa.com/en/flight',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

async function getOMDBScores(title, year) {
  // Try with year first, then without if not found
  const queries = year
    ? [{ t: title, y: year }, { t: title }]
    : [{ t: title }];

  for (const params of queries) {
    try {
      const qs = new URLSearchParams({ ...params, apikey: OMDB_KEY });
      const res = await fetch(`https://www.omdbapi.com/?${qs}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      if (data.Response === 'False') continue;

      const rtRating = data.Ratings?.find((r) => r.Source === 'Rotten Tomatoes');
      const rtScore = rtRating ? parseInt(rtRating.Value, 10) : null;

      const imdbRaw = data.imdbRating && data.imdbRating !== 'N/A'
        ? parseFloat(data.imdbRating)
        : null;
      // Convert IMDb x/10 → percentage for display consistency
      const imdbScore = imdbRaw !== null ? Math.round(imdbRaw * 10) : null;

      const genre = data.Genre && data.Genre !== 'N/A'
        ? data.Genre.split(',').slice(0, 2).map((g) => g.trim()).join(' / ')
        : null;

      const rating = data.Rated && data.Rated !== 'N/A' ? data.Rated : null;

      return {
        criticsScore: rtScore,
        imdbScore,
        imdbRating: imdbRaw ? `${imdbRaw}/10` : null,
        genre,
        rating,
        imdbId: data.imdbID,
        found: true,
      };
    } catch {
      // try next query
    }
  }

  return { criticsScore: null, imdbScore: null, imdbRating: null, genre: null, rating: null, imdbId: null, found: false };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const flightNum = searchParams.get('flight')?.trim().replace(/^AA\s*/i, '');
  const date = searchParams.get('date');

  if (!flightNum || !date) {
    return NextResponse.json({ error: 'Missing flight number or date.' }, { status: 400 });
  }

  // 1. Look up the flight
  let flights;
  try {
    const res = await fetch(
      `https://entertainment.aa.com/api/flight?date=${date}&query=${flightNum}`,
      { headers: AA_HEADERS, signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `AA API error ${res.status}: ${body.slice(0, 200) || 'no details'}` },
        { status: 502 }
      );
    }
    const json = await res.json();
    flights = json.data ?? json;
  } catch (e) {
    return NextResponse.json(
      { error: `Could not reach the AA entertainment catalog: ${e.message}` },
      { status: 502 }
    );
  }

  if (!flights?.length) {
    return NextResponse.json(
      { error: `Flight AA${flightNum} on ${date} was not found. Check the flight number and date.` },
      { status: 404 }
    );
  }

  const flight = flights.find((f) => String(f.flight_number) === String(flightNum)) ?? flights[0];

  // 2. Fetch the title catalog
  let allTitles;
  try {
    const res = await fetch(
      `https://entertainment.aa.com/api/titles?flight_id=${encodeURIComponent(flight.id)}`,
      { headers: AA_HEADERS, signal: AbortSignal.timeout(15000) }
    );
    const json = await res.json();
    allTitles = json.data ?? json;
  } catch (e) {
    return NextResponse.json(
      { error: `Could not load the entertainment catalog: ${e.message}` },
      { status: 502 }
    );
  }

  // 3. Filter to movies only
  const movies = (allTitles || []).filter((t) => {
    const type = (t.type || t.contentType || '').toUpperCase();
    return !type.includes('EPISODE') && !type.includes('SERIES') && !type.includes('TV');
  });

  if (!movies.length) {
    return NextResponse.json(
      { error: 'No movies found for this flight.' },
      { status: 404 }
    );
  }

  // 4. Fetch OMDB scores for all movies in parallel
  const results = await Promise.all(
    movies.map(async (movie) => {
      const title = movie.title || movie.name || '';
      const year = movie.year ? String(movie.year) : '';
      const omdb = await getOMDBScores(title, year);
      return {
        title,
        year: movie.year || null,
        rating: omdb.rating || movie.contentRating || movie.rating || null,
        genre: omdb.genre || movie.genre || null,
        criticsScore: omdb.criticsScore,
        imdbScore: omdb.imdbScore,
        imdbRating: omdb.imdbRating,
        imdbId: omdb.imdbId,
        rtFound: omdb.found,
      };
    })
  );

  // 5. Sort by RT score desc, then IMDb score
  results.sort((a, b) => {
    if (a.criticsScore !== null && b.criticsScore !== null) return b.criticsScore - a.criticsScore;
    if (a.criticsScore !== null) return -1;
    if (b.criticsScore !== null) return 1;
    if (a.imdbScore !== null && b.imdbScore !== null) return b.imdbScore - a.imdbScore;
    if (a.imdbScore !== null) return -1;
    if (b.imdbScore !== null) return 1;
    return 0;
  });

  return NextResponse.json({
    flight: {
      number: `AA${flightNum}`,
      id: flight.id,
      departure: flight.dep || flight.departureStation,
      arrival: flight.arv || flight.arrivalStation,
      date,
    },
    totalMovies: results.length,
    movies: results,
  });
}
