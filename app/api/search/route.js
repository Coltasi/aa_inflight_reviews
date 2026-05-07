import { NextResponse } from 'next/server';

export const maxDuration = 60;

const OMDB_KEY = '87e77447';
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

// Returns YYYY-MM-DD for today + offsetDays
function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function parseOMDB(data) {
  const rtRating = data.Ratings?.find((r) => r.Source === 'Rotten Tomatoes');
  const rtScore  = rtRating ? parseInt(rtRating.Value, 10) : null;
  const imdbRaw  = data.imdbRating && data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : null;
  const genre    = data.Genre && data.Genre !== 'N/A'
    ? data.Genre.split(',').slice(0, 2).map((g) => g.trim()).join(' / ') : null;
  const rating   = data.Rated && data.Rated !== 'N/A' ? data.Rated : null;
  const yearStr  = data.Year && data.Year !== 'N/A' ? data.Year.slice(0, 4) : null;
  const year     = yearStr ? parseInt(yearStr, 10) : null;
  return {
    criticsScore: rtScore,
    imdbScore:    imdbRaw !== null ? Math.round(imdbRaw * 10) : null,
    imdbRating:   imdbRaw ? `${imdbRaw}/10` : null,
    genre,
    rating,
    year,
    imdbId: data.imdbID ?? null,
    found: true,
  };
}

async function omdbFetch(params) {
  try {
    const qs  = new URLSearchParams({ ...params, apikey: OMDB_KEY });
    const res = await fetch(`https://www.omdbapi.com/?${qs}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.Response === 'False' ? null : data;
  } catch { return null; }
}

async function getOMDBScores(title, year) {
  const queries = year ? [{ t: title, y: year }, { t: title }] : [{ t: title }];
  let data = null;
  for (const params of queries) {
    data = await omdbFetch(params);
    if (data) break;
  }

  if (!data) return { criticsScore: null, imdbScore: null, imdbRating: null, genre: null, rating: null, imdbId: null, found: false };

  const parsed = parseOMDB(data);

  if (!parsed.imdbRating && parsed.imdbId) {
    const byId = await omdbFetch({ i: parsed.imdbId });
    if (byId) {
      const retry = parseOMDB(byId);
      return {
        criticsScore: parsed.criticsScore ?? retry.criticsScore,
        imdbScore:    parsed.imdbScore    ?? retry.imdbScore,
        imdbRating:   parsed.imdbRating   ?? retry.imdbRating,
        genre:        parsed.genre        ?? retry.genre,
        rating:       parsed.rating       ?? retry.rating,
        imdbId:       parsed.imdbId,
        found: true,
      };
    }
  }

  return parsed;
}

// Try fetching the AA flight for a given date; returns { flights, date } or null
async function tryFlightDate(flightNum, date) {
  try {
    const res = await fetch(
      `https://entertainment.aa.com/api/flight?date=${date}&query=${flightNum}`,
      { headers: AA_HEADERS, signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const flights = json.data ?? json;
    if (!flights?.length) return null;
    return { flights, date };
  } catch { return null; }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const flightNum = searchParams.get('flight')?.trim().replace(/^AA\s*/i, '');

  if (!flightNum) {
    return NextResponse.json({ error: 'Missing flight number.' }, { status: 400 });
  }

  // Try today, tomorrow, then day after — AA only loads catalogs ~1-3 days ahead
  const datesToTry = [isoDate(0), isoDate(1), isoDate(2)];
  let found = null;
  for (const date of datesToTry) {
    found = await tryFlightDate(flightNum, date);
    if (found) break;
  }

  if (!found) {
    return NextResponse.json(
      { error: `Flight AA${flightNum} wasn't found for today or the next two days. AA may not have loaded the entertainment catalog yet — try again closer to your departure.` },
      { status: 404 }
    );
  }

  const { flights, date } = found;
  const flight = flights.find((f) => String(f.flight_number) === String(flightNum)) ?? flights[0];

  // Fetch the title catalog
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

  // Filter to movies only and deduplicate by title
  const seen = new Set();
  const movies = (allTitles || []).filter((t) => {
    const type = (t.type || t.contentType || '').toUpperCase();
    if (type.includes('EPISODE') || type.includes('SERIES') || type.includes('TV')) return false;
    const key = (t.title || t.name || '').toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!movies.length) {
    return NextResponse.json(
      { error: 'No movies found for this flight.' },
      { status: 404 }
    );
  }

  // Fetch OMDB scores for all movies in parallel
  const results = await Promise.all(
    movies.map(async (movie) => {
      const title = movie.title || movie.name || '';
      const aaYear = movie.year ? String(movie.year) : '';
      const omdb = await getOMDBScores(title, aaYear);
      return {
        title,
        year: omdb.year || movie.year || null,
        rating: omdb.rating || movie.contentRating || movie.rating || null,
        genre: omdb.genre || movie.genre || null,
        criticsScore: omdb.criticsScore,
        imdbScore: omdb.imdbScore,
        imdbRating: omdb.imdbRating ? omdb.imdbRating.replace('/10','') + '/10' : null,
        imdbId: omdb.imdbId,
        rtFound: omdb.found,
      };
    })
  );

  // Sort by RT score desc, then IMDb score
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
      aircraft: flight.equipment || flight.equipmentCode || flight.aircraftType || flight.equipment_type || null,
    },
    totalMovies: results.length,
    movies: results,
  });
}
