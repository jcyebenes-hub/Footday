// Vercel Serverless Function: proxy para football-data.org (plan gratuito).
// Ruta: /api/proxy/football-data/*  (ej: /api/proxy/football-data/matches?dateFrom=...&dateTo=...)
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Missing FOOTBALL_DATA_API_KEY env var' });
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
    const queryString = params.toString();
    const url = `https://api.football-data.org/v4/${endpoint}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, { headers: { 'X-Auth-Token': apiKey } });
    const data = await response.json().catch(() => ({}));
    // Cache CDN breve para no fundir el límite gratuito (10 req/min)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[vercel] football-data Proxy Error:', error);
    return res.status(500).json({ error: 'Failed to fetch from football-data.org' });
  }
}
