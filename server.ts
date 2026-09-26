import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // Render / Railway / Fly asignan el puerto por variable de entorno.
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());

  // Healthcheck para el hosting
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // API Proxy para Sportmonks
  app.use("/api/proxy/sportmonks", async (req, res) => {
    try {
      const token = process.env.SPORTMONKS_API_TOKEN;
      if (!token) {
        res.status(503).json({ error: "Missing SPORTMONKS_API_TOKEN env var" });
        return;
      }
      const endpointAndQuery = req.url.replace(/^\/+/, '');
      const delimiter = endpointAndQuery.includes('?') ? '&' : '?';
      const url = `https://api.sportmonks.com/v3/football/${endpointAndQuery}${delimiter}api_token=${token}`;

      console.log(`Proxying to Sportmonks: /${endpointAndQuery.split('?')[0]}`);

      const response = await fetch(url);
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error("Sportmonks Proxy Error:", error);
      res.status(500).json({ error: "Failed to fetch from Sportmonks" });
    }
  });

  // API Proxy para API-Football
  app.use("/api/proxy/football", async (req, res) => {
    try {
      const apiKey = process.env.FOOTBALL_API_KEY;
      if (!apiKey) {
        res.status(503).json({ error: "Missing FOOTBALL_API_KEY env var" });
        return;
      }
      const endpointAndQuery = req.url.replace(/^\/+/, '');
      const url = `https://v3.football.api-sports.io/${endpointAndQuery}`;

      console.log(`Proxying to API-Football: /${endpointAndQuery.split('?')[0]}`);

      const response = await fetch(url, {
        headers: {
          "x-apisports-key": apiKey
        }
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error("API-Football Proxy Error:", error);
      res.status(500).json({ error: "Failed to fetch from API-Football" });
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
