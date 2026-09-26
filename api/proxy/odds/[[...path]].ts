// Vercel Serverless Function: proxy para The Odds API. La clave vive en el servidor.
// Ruta: /api/proxy/odds/*  (ej: /api/proxy/odds/soccer_epl/odds?regions=eu&markets=h2h)
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Missing ODDS_API_KEY env var' });
    }

    const segments = req.query.path;
    const endpoint = Array.isArray(segments) ? segments.join('/') : (segments || '');
    if (!endpoint) {
      return res.status(400).json({ error: 'Missing API endpoint' });
    }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (key === 'path' || value === undefined) continue;
      if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)));
      else params.append(key, String(value));
    }
    params.set('apiKey', apiKey);
    const url = `https://api.the-odds-api.com/v4/sports/${endpoint}?${params.toString()}`;

    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[vercel] Odds Proxy Error:', error);
    return res.status(500).json({ error: 'Failed to fetch odds' });
  }
}
