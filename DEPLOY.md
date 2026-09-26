# Footday — Despliegue y APIs

## Proveedores de datos (cascada automática)

El fútbol usa cascada: si un proveedor falla o no tiene clave, pasa al siguiente
sin romper la app. Baloncesto: ESPN (NBA/WNBA) y si no, Gemini.

| # | Proveedor | Coste | Clave | Cubre |
|---|-----------|-------|-------|-------|
| 1 | API-Football | 100 req/día gratis | `FOOTBALL_API_KEY` | Partidos, en vivo, eventos, stats, alineaciones, H2H, lesiones, clasificación, predicciones |
| 2 | football-data.org | Gratis (12 competiciones top, 10 req/min) | `FOOTBALL_DATA_API_KEY` | Partidos, clasificación, últimos partidos |
| 3 | ESPN (no oficial) | Gratis sin clave | — | Partidos, en vivo, eventos, stats, clasificación, últimos partidos |

Extras:

| Servicio | Coste | Clave | Notas |
|----------|-------|-------|-------|
| Gemini | Plan con free tier | `GEMINI_API_KEY` (**obligatoria**, se incrusta en el build) | Búsqueda con query, picks, análisis, imágenes |
| The Odds API | 500 req/mes gratis | `ODDS_API_KEY` | Cuotas H2H (vía proxy, la clave no sale al navegador) |
| Telegram | Gratis | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | Envío desde Mis Picks (vía backend) |
| Sportmonks | Gratis inútil (solo 2 ligas menores) | `SPORTMONKS_API_TOKEN` (opcional/legado) | Solo si tienes plan de pago |

Cómo conseguir las claves gratuitas:

- football-data.org: https://www.football-data.org/client/register
- API-Football: https://www.api-football.com (o RapidAPI)
- The Odds API: https://the-odds-api.com
- Telegram: habla con [@BotFather](https://t.me/BotFather) → `/newbot`

## Variables de entorno

| Variable | Dónde se usa | Obligatoria |
|----------|--------------|-------------|
| `GEMINI_API_KEY` | Build (Vite la incrusta) | ✅ Sí |
| `FOOTBALL_API_KEY` | Servidor / serverless | No (hay fallbacks) |
| `FOOTBALL_DATA_API_KEY` | Servidor / serverless | No (hay fallbacks) |
| `SPORTMONKS_API_TOKEN` | Servidor / serverless | No (legado) |
| `ODDS_API_KEY` | Servidor / serverless | No (sin cuotas si falta) |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Servidor / serverless | No (sin envío si faltan) |
| `PORT` | Solo Render/self-host | La pone el hosting |

> ⚠️ Si alguna clave estuvo expuesta en Git, regenérala en su panel y actualiza
> las env vars en Vercel/Render (y redeploy). Ver historial del repo.

## Vercel (recomendado)

1. `vercel.com/new` → Import del repo (framework Vite autodetectado, ver `vercel.json`).
2. Añade las env vars (Production + Preview + Development).
3. Deploy. Los proxies viven en `api/proxy/*` (serverless) y Telegram en `api/telegram`.

## Render (alternativa)

`New +` → `Blueprint` con el `render.yaml` del repo (plan free: ojo al cold start),
o manual: Web Service con Build `npm ci && npm run build` y Start `npm start`.

Local: `cp .env.example .env`, rellena, `npm ci`, `npm run dev`.
