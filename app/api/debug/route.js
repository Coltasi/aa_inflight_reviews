import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const flight = searchParams.get('flight') || '67';
  const date = searchParams.get('date') || '2026-04-28';

  const results = {};

  // Test 1: flight lookup
  try {
    const url = `https://entertainment.aa.com/api/flight?date=${date}&query=${flight}`;
    results.flightUrl = url;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        Origin: 'https://entertainment.aa.com',
        Referer: 'https://entertainment.aa.com/en/flight',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      signal: AbortSignal.timeout(15000),
    });
    const body = await res.text();
    results.flightStatus = res.status;
    results.flightHeaders = Object.fromEntries(res.headers.entries());
    results.flightBody = body.slice(0, 500);

    // If we got a valid response, also test titles
    if (res.status === 200) {
      try {
        const flights = JSON.parse(body);
        if (flights && flights[0]) {
          results.flightId = flights[0].id;
          const titlesUrl = `https://entertainment.aa.com/api/titles?flight_id=${encodeURIComponent(flights[0].id)}`;
          results.titlesUrl = titlesUrl;
          const titlesRes = await fetch(titlesUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              Accept: 'application/json, text/plain, */*',
              Origin: 'https://entertainment.aa.com',
              Referer: 'https://entertainment.aa.com/en/flight',
              'Accept-Language': 'en-US,en;q=0.9',
              'Sec-Fetch-Dest': 'empty',
              'Sec-Fetch-Mode': 'cors',
              'Sec-Fetch-Site': 'same-origin',
            },
            signal: AbortSignal.timeout(15000),
          });
          const titlesBody = await titlesRes.text();
          results.titlesStatus = titlesRes.status;
          results.titlesBody = titlesBody.slice(0, 1000);
          // Show first movie object in full
          try {
            const parsed = JSON.parse(titlesBody);
            const arr = parsed.data ?? parsed;
            results.firstMovie = arr[0];
            results.totalTitles = arr.length;
          } catch(e) {
            results.titlesParseError = e.message;
          }
        }
      } catch (e) {
        results.parseError = e.message;
      }
    }
  } catch (e) {
    results.flightError = e.message;
  }

  return NextResponse.json(results, {
    headers: { 'Content-Type': 'application/json' },
  });
}
