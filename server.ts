import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caché en memoria (TTL) para respuestas GET de los proxies.
// Evita fundir las cuotas gratuitas (football-data: 10 req/min, ESPN: sin documentar).
const cache = new Map<string, { expires: number; status: number; body: string }>();

type ProxyOptions = {
  target: string;               // https://host/base
  apiKey?: string;              // valor de la clave (si falta y requiredKey, 503)
  requiredKeyName?: string;     // nombre de la env var para el mensaje de error
  headers?: Record<string, string>;
  appendQuery?: Record<string, string>; // query extra a añadir (ej. api_token)
  cacheTtlMs?: number;
};

function createProxy(opts: ProxyOptions) {
  return async (req: express.Request, res: express.Response) => {
    try {
      if (opts.requiredKeyName && !opts.apiKey) {
        res.status(503).json({ error: `Missing ${opts.requiredKeyName} env var` });
        return;
      }
      const endpointAndQuery = req.url.replace(/^\/+/, '');
      const [endpoint, qs] = endpointAndQuery.split('?');
      if (!endpoint) {
        res.status(400).json({ error: "Missing API endpoint" });
        return;
      }
      const params = new URLSearchParams(qs || '');
      if (opts.appendQuery) {
        for (const [k, v] of Object.entries(opts.appendQuery)) params.set(k, v);
      }
      const url = `${opts.target}/${endpoint}?${params.toString()}`;
      const cacheKey = `${opts.target}/${endpoint}?${params.toString()}`;

      if (req.method === 'GET' && opts.cacheTtlMs) {
        const hit = cache.get(cacheKey);
        if (hit && hit.expires > Date.now()) {
          res.status(hit.status).type('application/json').send(hit.body);
          return;
        }
      }

      console.log(`Proxying: /${endpoint}`);
      const response = await fetch(url, { headers: opts.headers || {} });
      const body = await response.text();

      if (req.method === 'GET' && opts.cacheTtlMs && response.ok) {
        cache.set(cacheKey, { expires: Date.now() + opts.cacheTtlMs, status: response.status, body });
      }
      res.status(response.status).type('application/json').send(body);
    } catch (error) {
      console.error("Proxy Error:", error);
      res.status(500).json({ error: "Proxy request failed" });
    }
  };
}

async function startServer() {
  const app = express();
  // Render / Railway / Fly asignan el puerto por variable de entorno.
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Healthcheck para el hosting
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // API Proxy para Sportmonks (legado/opcional)
  app.use("/api/proxy/sportmonks", (req, res) => {
    const token = process.env.SPORTMONKS_API_TOKEN || '';
    return createProxy({
      target: "https://api.sportmonks.com/v3/football",
      apiKey: token,
      requiredKeyName: "SPORTMONKS_API_TOKEN",
      appendQuery: { api_token: token },
      cacheTtlMs: 60_000,
    })(req, res);
  });

  // API Proxy para API-Football (100 req/día gratis)
  app.use("/api/proxy/football", (req, res) => {
    const apiKey = process.env.FOOTBALL_API_KEY || '';
    return createProxy({
      target: "https://v3.football.api-sports.io",
      apiKey,
      requiredKeyName: "FOOTBALL_API_KEY",
      headers: { "x-apisports-key": apiKey },
      cacheTtlMs: 60_000,
    })(req, res);
  });

  // API Proxy para football-data.org (gratis: 12 competiciones, 10 req/min)
  app.use("/api/proxy/football-data", (req, res) => {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY || '';
    return createProxy({
      target: "https://api.football-data.org/v4",
      apiKey,
      requiredKeyName: "FOOTBALL_DATA_API_KEY",
      headers: { "X-Auth-Token": apiKey },
      cacheTtlMs: 60_000,
    })(req, res);
  });

  // API Proxy para ESPN (sin clave, no oficial)
  app.use("/api/proxy/espn", createProxy({
    target: "https://site.api.espn.com/apis/site/v2/sports",
    cacheTtlMs: 45_000,
  }));

  // API Proxy para The Odds API (500 req/mes gratis). La clave vive en el servidor.
  app.use("/api/proxy/odds", (req, res) => {
    const apiKey = process.env.ODDS_API_KEY || '';
    return createProxy({
      target: "https://api.the-odds-api.com/v4/sports",
      apiKey,
      requiredKeyName: "ODDS_API_KEY",
      appendQuery: { apiKey },
      cacheTtlMs: 5 * 60_000,
    })(req, res);
  });

  // Envío a Telegram desde el servidor (el token no sale del backend)
  app.post("/api/telegram", async (req, res) => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (!botToken || !chatId) {
        res.status(503).json({ error: "Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars" });
        return;
      }
      const { text, photo } = req.body as { text?: string; photo?: string };
      if (!text && !photo) {
        res.status(400).json({ error: "Missing text or photo" });
        return;
      }
      let tgRes: Response;
      if (photo) {
        const base64Data = photo.includes(',') ? photo.split(',')[1] : photo;
        const buffer = Buffer.from(base64Data, 'base64');
        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('photo', new Blob([buffer], { type: 'image/png' }), 'pick.png');
        if (text) form.append('caption', text.slice(0, 1024));
        tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          body: form,
        });
      } else {
        tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        });
      }
      const data = await tgRes.json().catch(() => ({}));
      res.status(tgRes.status).json(data);
    } catch (error) {
      console.error("Telegram Error:", error);
      res.status(500).json({ error: "Failed to send Telegram message" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // 404 JSON para rutas /api desconocidas (antes del fallback SPA)
    app.use("/api", (_req, res) => {
      res.status(404).json({ error: "Not found" });
    });
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
