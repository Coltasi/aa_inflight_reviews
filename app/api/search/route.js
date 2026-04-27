import { NextResponse } from 'next/server';

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
};

function makeSlug(title) {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_|_$/g, '');
}

async function getRTScores(title, year) {
  const baseSlug = makeSlug(title);
  const slugsToTry = [
    baseSlug,
    `${baseSlug}_${year}`,
    `${baseSlug}_${String(year).slice(2)}`,
  ];

  for (const slug of slugsToTry) {
    try {
      const url = `https://www.rottentomatoes.com/m/${slug}`;
      const res = await fetch(url, {
        headers: BROWSER_HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });

      if (res.status === 200 && res.url.includes('/m/')) {
        const text = await res.text();

        const criticMatch = text.match(
          /"criticsScore":\{"averageRating":"[^"]*","certified":(true|false)[^}]*?"score":"(\d+)"/
        );
        const audienceMatch = text.match(
          /"audienceScore":\{[^}]*?"score":"(\d+)"/
        );
        const genreMatch = text.match(/"metadataGenres":\[([^\]]+)\]/);

        const genres = genreMatch
          ? genreMatch[1]
              .replace(/"/g, '')
              .split(',')
              .map((g) => g.trim())
              .filter(Boolean)
              .slice(0, 2)
              .join(' / ')
          : null;

        return {
          criticsScore: criticMatch ? parseInt(criticMatch[2], 10) : null,
          audienceScore: audienceMatch ? parseInt(audienceMatch[1], 10) : null,
          certified: criticMatch ? criticMatch[1] === 'true' : false,
          genre: genres,
          rtUrl: res.url,
          found: true,
        };
      }
    } catch {
      // try next slug
    }
  }

  return { criticsScore: null, audienceScore: null, certified: false, genre: null, rtUrl: null, found: false };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const flightNum = searchParams.get('flight')?.trim().toUpperCase().replace(/^AA\s*/i, '');
  const date = searchParams.get('date'); // YYYY-MM-DD

  if (!flightNum || !date) {
    return NextResponse.json({ error: 'Missing flight number or date.' }, { status: 400 });
  }

  // 1. Look up the flight
  let flights;
  try {
    const flightRes = await fetch(
      `https://entertainment.aa.com/api/flight?date=${date}&query=${flightNum}`,
      {
        headers: {
          ...BROWSER_HEADERS,
          Accept: 'application/json, text/plain, */*',
          Origin: 'https://entertainment.aa.com',
          Referer: 'https://entertainment.aa.com/en/flight',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
        },
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!flightRes.ok) {
      const body = await flightRes.text().catch(() => '');
      return NextResponse.json(
        { error: `AA API error ${flightRes.status}: ${body.slice(0, 200) || 'no details'}` },
        { status: 502 }
      );
    }
    const flightJson = await flightRes.json();
    // API returns { error: null, data: [...] } wrapper
    flights = flightJson.data ?? flightJson;
  } catch (e) {
    return NextResponse.json(
      { error: `Could not reach the AA entertainment catalog: ${e.message}` },
      { status: 502 }
    );
  }

  if (!flights || flights.length === 0) {
    return NextResponse.json(
      { error: `Flight AA${flightNum} on ${date} was not found in the entertainment catalog. Check the flight number and date.` },
      { status: 404 }
    );
  }

  // Pick the flight that matches the requested number exactly
  const flight = flights.find(f => String(f.flight_number) === String(flightNum)) ?? flights[0];

  // 2. Fetch the title catalog for this flight
  let allTitles;
  try {
    const titlesRes = await fetch(
      `https://entertainment.aa.com/api/titles?flight_id=${encodeURIComponent(flight.id)}`,
      {
        headers: {
          ...BROWSER_HEADERS,
          Accept: 'application/json, text/plain, */*',
          Origin: 'https://entertainment.aa.com',
          Referer: 'https://entertainment.aa.com/en/flight',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
        },
        signal: AbortSignal.timeout(20000),
      }
    );
    const titlesJson = await titlesRes.json();
    // API may return { error: null, data: [...] } wrapper
    allTitles = titlesJson.data ?? titlesJson;
  } catch (e) {
    return NextResponse.json(
      { error: `Could not load the entertainment catalog: ${e.message}` },
      { status: 502 }
    );
  }

  // 3. Filter to movies only (skip episodes/TV series)
  const movies = (allTitles || []).filter((t) => {
    const type = (t.type || t.contentType || '').toUpperCase();
    // keep items that are movies or have no type — exclude TV episodes/series
    return !type.includes('EPISODE') && !type.includes('SERIES') && !type.includes('TV');
  });

  if (movies.length === 0) {
    return NextResponse.json(
      { error: 'No movies found for this flight. The catalog may only contain TV content.' },
      { status: 404 }
    );
  }

  // 4. Fetch RT scores in parallel (8 at a time to avoid rate limiting)
  const CHUNK = 8;
  const results = [];
  for (let i = 0; i < movies.length; i += CHUNK) {
    const chunk = movies.slice(i, i + CHUNK);
    const chunkResults = await Promise.all(
      chunk.map(async (movie) => {
        const title = movie.title || movie.name || '';
        const year = movie.year ? String(movie.year) : '';
        const rt = await getRTScores(title, year);
        return {
          title,
          year: movie.year || null,
          rating: movie.contentRating || movie.rating || null,
          genre: rt.genre || movie.genre || null,
          criticsScore: rt.criticsScore,
          audienceScore: rt.audienceScore,
          certified: rt.certified,
          rtUrl: rt.rtUrl,
          rtFound: rt.found,
        };
      })
    );
    results.push(...chunkResults);
  }

  // 5. Sort: rated by critic score desc, then unrated
  results.sort((a, b) => {
    if (a.criticsScore !== null && b.criticsScore !== null)
      return b.criticsScore - a.criticsScore;
    if (a.criticsScore !== null) return -1;
    if (b.criticsScore !== null) return 1;
    // both null — audience score as tiebreaker
    if (a.audienceScore !== null && b.audienceScore !== null)
      return b.audienceScore - a.audienceScore;
    if (a.audienceScore !== null) return -1;
    if (b.audienceScore !== null) return 1;
    return 0;
  });

  return NextResponse.json({
    flight: {
      number: `AA${flightNum}`,
      id: flight.id,
      departure: flight.departureStation || flight.origin,
      arrival: flight.arrivalStation || flight.destination,
      date,
    },
    totalMovies: results.length,
    movies: results,
  });
}
