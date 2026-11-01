// Vercel Serverless Function: proxy para Sportmonks
// Ruta: /api/proxy/sportmonks/*  (ej: /api/proxy/sportmonks/fixtures/date/2026-01-01?include=...)
// Equivalente al endpoint de Express en server.ts.
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const token = process.env.SPORTMONKS_API_TOKEN;
    if (!token) {
      return res.status(503).json({ error: 'Missing SPORTMONKS_API_TOKEN env var' });
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
    params.append('api_token', token);
    const url = `https://api.sportmonks.com/v3/football/${endpoint}?${params.toString()}`;

    console.log(`[vercel] Proxying to Sportmonks: /${endpoint}`);
    const response = await fetch(url);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[vercel] Sportmonks Proxy Error:', error);
    return res.status(500).json({ error: 'Failed to fetch from Sportmonks' });
  }
}
