// Vercel Serverless Function: proxy para API-Football
// Ruta: /api/proxy/football/*  (ej: /api/proxy/football/fixtures?date=2026-01-01)
//
// Equivalente al endpoint de Express en server.ts, para que el frontend
// funcione igual desplegado en Vercel (serverless) o en Render (Node/Express).
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiKey = process.env.FOOTBALL_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Missing FOOTBALL_API_KEY env var' });
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
    const url = `https://v3.football.api-sports.io/${endpoint}${queryString ? `?${queryString}` : ''}`;

    console.log(`[vercel] Proxying to API-Football: /${endpoint}`);
    const response = await fetch(url, { headers: { 'x-apisports-key': apiKey } });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[vercel] API-Football Proxy Error:', error);
    return res.status(500).json({ error: 'Failed to fetch from API-Football' });
  }
}
