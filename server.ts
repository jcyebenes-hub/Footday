import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Proxy para Sportmonks
  app.use("/api/proxy/sportmonks", async (req, res) => {
    try {
      const endpointAndQuery = req.url.replace(/^\/+/, '');
      const delimiter = endpointAndQuery.includes('?') ? '&' : '?';
      const token = process.env.SPORTMONKS_API_TOKEN || 'uDdbdN6w0iCtQ6XhZDMTmrvcJmdgvxpWUfBT2OU098Tg1yGsCSz5bo3X1DsS';
      const url = `https://api.sportmonks.com/v3/football/${endpointAndQuery}${delimiter}api_token=${token}`;
      
      console.log(`Proxying to Sportmonks: ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Sportmonks Proxy Error:", error);
      res.status(500).json({ error: "Failed to fetch from Sportmonks" });
    }
  });

  // API Proxy para API-Football
  app.use("/api/proxy/football", async (req, res) => {
    try {
      const endpointAndQuery = req.url.replace(/^\/+/, '');
      const apiKey = process.env.FOOTBALL_API_KEY || 'cd480b99c8145e3df4ac74ba4b376ce2';
      const url = `https://v3.football.api-sports.io/${endpointAndQuery}`;
      
      console.log(`Proxying to API-Football: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          "x-apisports-key": apiKey
        }
      });
      const data = await response.json();
      res.json(data);
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
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
