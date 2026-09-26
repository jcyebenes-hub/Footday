
import { Match, Sport } from "../types";

const ODDS_API_KEY = 'ce26d2e3e6fd25a1bcb17bc327a07810';
const BASE_URL = 'https://api.the-odds-api.com/v4/sports';

// Mapeo de ligas comunes de API-Football a The Odds API
const LEAGUE_MAPPING: Record<number, string> = {
  140: 'soccer_spain_la_liga',
  39: 'soccer_epl',
  135: 'soccer_italy_serie_a',
  78: 'soccer_germany_bundesliga',
  61: 'soccer_france_ligue_one',
  2: 'soccer_uefa_champions_league',
  3: 'soccer_uefa_europa_league',
  848: 'soccer_uefa_conference_league',
  // Baloncesto
  12: 'basketball_nba',
  120: 'basketball_euroleague',
};

export const fetchOddsForMatches = async (matches: Match[], sport: Sport): Promise<Match[]> => {
  if (!matches || matches.length === 0) return matches;

  try {
    // Agrupar matches por liga para minimizar llamadas a la API
    const leaguesToFetch = new Set<number>();
    matches.forEach(m => {
      if (m.leagueId && LEAGUE_MAPPING[m.leagueId]) {
        leaguesToFetch.add(m.leagueId);
      }
    });

    if (leaguesToFetch.size === 0) {
      // Si no tenemos mapeo de ligas, intentamos buscar por deporte general si es posible
      // Pero The Odds API requiere un sport key específico.
      // Intentaremos con soccer_spain_la_liga por defecto si es football y no hay liga? No, mejor no.
      return matches;
    }

    const oddsMap: Record<string, any> = {};

    // Fetch odds for each league
    await Promise.all(Array.from(leaguesToFetch).map(async (leagueId) => {
      const sportKey = LEAGUE_MAPPING[leagueId];
      const response = await fetch(`${BASE_URL}/${sportKey}/odds/?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h&oddsFormat=decimal`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        data.forEach(event => {
          const key = `${event.home_team.toLowerCase()}-${event.away_team.toLowerCase()}`;
          oddsMap[key] = event;
        });
      }
    }));

    // Asignar odds a los matches
    return matches.map(match => {
      const key = `${match.homeTeam.toLowerCase()}-${match.awayTeam.toLowerCase()}`;
      const oddsData = oddsMap[key];

      if (oddsData && oddsData.bookmakers && oddsData.bookmakers.length > 0) {
        // Usar el primer bookmaker disponible (generalmente el más relevante)
        const bookmaker = oddsData.bookmakers[0];
        const market = bookmaker.markets.find((m: any) => m.key === 'h2h');
        
        if (market) {
          const homeOutcome = market.outcomes.find((o: any) => o.name === oddsData.home_team);
          const awayOutcome = market.outcomes.find((o: any) => o.name === oddsData.away_team);
          const drawOutcome = market.outcomes.find((o: any) => o.name === 'Draw');

          return {
            ...match,
            odds: {
              home: homeOutcome?.price,
              away: awayOutcome?.price,
              draw: drawOutcome?.price,
              provider: bookmaker.title
            }
          };
        }
      }
      return match;
    });

  } catch (error) {
    console.error("Error fetching odds:", error);
    return matches;
  }
};
