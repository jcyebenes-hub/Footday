// Vercel Serverless Function: proxy para la API (no oficial) de ESPN. Sin clave.
// Ruta: /api/proxy/espn/*  (ej: /api/proxy/espn/soccer/esp.1/scoreboard?dates=20260101)
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
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
    const url = `https://site.api.espn.com/apis/site/v2/sports/${endpoint}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));
    res.setHeader('Cache-Control', 's-maxage=45, stale-while-revalidate=30');
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[vercel] ESPN Proxy Error:', error);
    return res.status(500).json({ error: 'Failed to fetch from ESPN' });
  }
}
