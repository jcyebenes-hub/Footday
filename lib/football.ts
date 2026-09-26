
import {
  getEspnMatchesByDate,
  getEspnStandings,
  getEspnEventDetails,
  getEspnTeamMatches,
  espnLeagueByApiId,
  espnLeagueByName,
} from './espn';
import {
  getFootballDataMatchesByDate,
  getFootballDataStandings,
  getFootballDataTeamMatches,
  fdCompetitionByApiId,
  fdCompetitionByName,
} from './footballData';

const BASE_URL = '/api/proxy/football';

export type DataProvider = 'api-football' | 'football-data' | 'espn';

export interface FootballApiMatch {
  id: number | string;
  date: string;
  time: string;
  homeTeam: {
    id: number | string;
    name: string;
    logo: string;
  };
  awayTeam: {
    id: number | string;
    name: string;
    logo: string;
  };
  league: {
    id: number;
    name: string;
    logo: string;
    country: string;
    priority: number;
  };
  status: string;
  statusShort: string;
  score?: {
    home: number;
    away: number;
  };
  // Origen del dato (cascada: api-football -> football-data -> ESPN sin clave)
  provider?: DataProvider;
  providerRef?: string; // slug ESPN o código football-data de la liga
}

// Prioridad de ligas (1 = máxima importancia, 5 = baja)
const LEAGUE_PRIORITY: Record<number, number> = {
  // Tier 1 - Competiciones top
  2: 1,    // Champions League
  3: 1,    // Europa League
  848: 1,  // Conference League
  
  // Tier 2 - Ligas top 5
  140: 2,  // LaLiga
  39: 2,   // Premier League
  135: 2,  // Serie A
  78: 2,   // Bundesliga
  61: 2,   // Ligue 1
  
  // Tier 3 - Ligas secundarias Europa
  94: 3,   // Eredivisie
  144: 3,  // Liga Portugal
  88: 3,   // Championship
  203: 3,  // Süper Lig Turquía
};

const getLeaguePriority = (leagueId: number): number => {
  return LEAGUE_PRIORITY[leagueId] || 4;
};

// Función para ordenar partidos
export const sortMatches = (matches: FootballApiMatch[]): FootballApiMatch[] => {
  return matches.sort((a, b) => {
    // 1º - Partidos no jugados primero
    const aFinished = ['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD'].includes(a.statusShort);
    const bFinished = ['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD'].includes(b.statusShort);
    
    if (!aFinished && bFinished) return -1;
    if (aFinished && !bFinished) return 1;
    
    // 2º - Por prioridad de liga
    const priorityDiff = a.league.priority - b.league.priority;
    if (priorityDiff !== 0) return priorityDiff;
    
    // 3º - Por hora (los más cercanos primero)
    return a.time.localeCompare(b.time);
  });
};

// Los ids con prefijo indican el proveedor: `espn:<slug>:<id>`, `fd:<id>`. Sin prefijo = api-football.
export const parseProviderId = (
  id: number | string
): { provider: DataProvider; ref: string; raw: string } => {
  const s = String(id ?? '');
  if (s.startsWith('espn:')) {
    const [, ref, ...rest] = s.split(':');
    return { provider: 'espn', ref: ref || '', raw: rest.join(':') };
  }
  if (s.startsWith('fd:')) {
    return { provider: 'football-data', ref: '', raw: s.slice(3) };
  }
  return { provider: 'api-football', ref: '', raw: s };
};

// Obtener partidos por fecha (api-football)
const fetchApiFootballByDate = async (date: string): Promise<FootballApiMatch[]> => {
  try {
    const response = await fetch(
      `${BASE_URL}/fixtures?date=${date}`
    );

    if (!response.ok) return [];
    const data = await response.json();

    if (!data.response) return [];

    const matches = data.response.map((item: any) => ({
      id: item.fixture.id,
      date: item.fixture.date ? item.fixture.date.split('T')[0] : '',
      time: item.fixture.date && item.fixture.date.includes('T') ? item.fixture.date.split('T')[1].substring(0, 5) : '00:00',
      homeTeam: {
        id: item.teams.home.id,
        name: item.teams.home.name,
        logo: item.teams.home.logo
      },
      awayTeam: {
        id: item.teams.away.id,
        name: item.teams.away.name,
        logo: item.teams.away.logo
      },
      league: {
        id: item.league.id,
        name: item.league.name,
        logo: item.league.logo || `https://media.api-sports.io/football/leagues/${item.league.id}.png`,
        country: item.league.country,
        priority: getLeaguePriority(item.league.id)
      },
      status: item.fixture.status.long,
      statusShort: item.fixture.status.short,
      score: (item.goals && item.goals.home !== null) ? {
        home: item.goals.home,
        away: item.goals.away
      } : undefined,
      provider: 'api-football' as DataProvider,
    }));

    return sortMatches(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
};

// Obtener partidos por fecha con cascada de proveedores gratuitos:
// 1) api-football (si hay clave), 2) football-data.org (si hay clave), 3) ESPN (sin clave).
export const getMatchesByDate = async (date: string): Promise<FootballApiMatch[]> => {
  const primary = await fetchApiFootballByDate(date);
  if (primary.length > 0) return primary;

  console.log('API-Football sin datos: probando football-data.org…');
  const fd = await getFootballDataMatchesByDate(date).catch(() => []);
  if (fd.length > 0) return sortMatches(fd);

  console.log('football-data sin datos: probando ESPN…');
  const espn = await getEspnMatchesByDate(date).catch(() => [] as FootballApiMatch[]);
  return sortMatches(espn);
};

// Agrupar partidos por liga
export const groupMatchesByLeague = (matches: FootballApiMatch[]) => {
  const grouped: Record<string, FootballApiMatch[]> = {};
  
  matches.forEach(match => {
    const key = `${match.league.id}-${match.league.name}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(match);
  });
  
  return grouped;
};

// Obtener partidos por liga
export const getMatchesByLeague = async (leagueId: number, season: number = 2024): Promise<FootballApiMatch[]> => {
  try {
    const response = await fetch(
      `${BASE_URL}/fixtures?league=${leagueId}&season=${season}`
    );
    
    const data = await response.json();
    
    if (!data.response) return [];

    const matches = data.response.map((item: any) => ({
      id: item.fixture.id,
      date: item.fixture.date ? item.fixture.date.split('T')[0] : '',
      time: item.fixture.date && item.fixture.date.includes('T') ? item.fixture.date.split('T')[1].substring(0, 5) : '00:00',
      homeTeam: {
        id: item.teams.home.id,
        name: item.teams.home.name,
        logo: item.teams.home.logo
      },
      awayTeam: {
        id: item.teams.away.id,
        name: item.teams.away.name,
        logo: item.teams.away.logo
      },
      league: {
        id: item.league.id,
        name: item.league.name,
        logo: item.league.logo || `https://media.api-sports.io/football/leagues/${item.league.id}.png`,
        country: item.league.country,
        priority: getLeaguePriority(item.league.id)
      },
      status: item.fixture.status.long,
      statusShort: item.fixture.status.short,
      score: (item.goals && item.goals.home !== null) ? {
        home: item.goals.home,
        away: item.goals.away
      } : undefined
    }));

    return sortMatches(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
};

// Obtener predicciones para un partido (solo api-football)
export const getMatchPredictions = async (fixtureId: number | string): Promise<any | null> => {
  if (parseProviderId(fixtureId).provider !== 'api-football') return null;
  try {
    const response = await fetch(
      `${BASE_URL}/predictions?fixture=${fixtureId}`
    );
    
    const data = await response.json();
    
    if (!data.response || data.response.length === 0) return null;

    const prediction = data.response[0];
    
    return {
      advice: prediction.predictions.advice,
      winner: prediction.predictions.winner.name,
      winOrDraw: prediction.predictions.win_or_draw,
      underOver: prediction.predictions.under_over,
      probabilities: {
        home: prediction.predictions.percent.home,
        draw: prediction.predictions.percent.draw,
        away: prediction.predictions.percent.away
      },
      comparison: prediction.comparison,
      h2h: prediction.h2h?.slice(0, 5).map((item: any) => ({
        date: item.fixture.date.split('T')[0],
        home: item.teams.home.name,
        away: item.teams.away.name,
        score: `${item.goals.home}-${item.goals.away}`
      }))
    };
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return null;
  }
};

// Obtener enfrentamientos directos (H2H) (solo api-football)
export const getH2HMatches = async (h2h: string, limit: number = 10): Promise<any[] | null> => {
  if (h2h.includes('espn:') || h2h.includes('fd:')) return null;
  try {
    const response = await fetch(
      `${BASE_URL}/fixtures/headtohead?h2h=${h2h}&last=${limit}`
    );
    const data = await response.json();
    return data.response || null;
  } catch (error) {
    console.error('Error fetching H2H matches:', error);
    return null;
  }
};

// Obtener últimos partidos de un equipo (todos los proveedores)
export const getTeamLastMatches = async (teamId: number | string, limit: number = 5): Promise<any[] | null> => {
  const parsed = parseProviderId(teamId);
  if (parsed.provider === 'espn' && parsed.ref && parsed.raw) {
    return getEspnTeamMatches(parsed.ref, parsed.raw, limit);
  }
  if (parsed.provider === 'football-data' && parsed.raw) {
    return getFootballDataTeamMatches(parsed.raw, limit);
  }
  if (parsed.provider !== 'api-football' || parsed.raw === 'NaN' || parsed.raw === '') return null;
  try {
    const response = await fetch(
      `${BASE_URL}/fixtures?team=${teamId}&last=${limit}`
    );
    const data = await response.json();
    return data.response || null;
  } catch (error) {
    console.error('Error fetching team last matches:', error);
    return null;
  }
};

// Obtener lesiones y bajas de un partido (solo api-football)
export const getMatchInjuries = async (fixtureId: number | string): Promise<any[] | null> => {
  if (parseProviderId(fixtureId).provider !== 'api-football') return null;
  try {
    const response = await fetch(
      `${BASE_URL}/fixtures/injuries?fixture=${fixtureId}`
    );
    const data = await response.json();
    return data.response || null;
  } catch (error) {
    console.error('Error fetching injuries:', error);
    return null;
  }
};

// Obtener detalles de un fixture (incluye árbitro) (solo api-football)
export const getFixtureDetails = async (fixtureId: number | string): Promise<any | null> => {
  if (parseProviderId(fixtureId).provider !== 'api-football') return null;
  try {
    const response = await fetch(
      `${BASE_URL}/fixtures?id=${fixtureId}`
    );
    const data = await response.json();
    return data.response?.[0] || null;
  } catch (error) {
    console.error('Error fetching fixture details:', error);
    return null;
  }
};

// Obtener alineaciones de un partido (solo api-football; ninguna API gratuita las ofrece)
export const getMatchLineups = async (fixtureId: number | string): Promise<any[] | null> => {
  if (parseProviderId(fixtureId).provider !== 'api-football') return null;
  try {
    const response = await fetch(
      `${BASE_URL}/fixtures/lineups?fixture=${fixtureId}`
    );
    const data = await response.json();
    return data.response || null;
  } catch (error) {
    console.error('Error fetching lineups:', error);
    return null;
  }
};

// Obtener eventos (goles, tarjetas, cambios) de un partido (api-football + ESPN)
export const getMatchEvents = async (fixtureId: number | string): Promise<any[] | null> => {
  const parsedEv = parseProviderId(fixtureId);
  if (parsedEv.provider === 'espn' && parsedEv.ref && parsedEv.raw) {
    const detailsEv = await getEspnEventDetails(parsedEv.ref, parsedEv.raw).catch(() => null);
    return detailsEv?.events?.length ? detailsEv.events : null;
  }
  if (parsedEv.provider !== 'api-football') return null;
  try {
    const response = await fetch(
      `${BASE_URL}/fixtures/events?fixture=${fixtureId}`
    );
    const data = await response.json();
    return data.response || null;
  } catch (error) {
    console.error('Error fetching events:', error);
    return null;
  }
};

// Obtener estadísticas de un partido (api-football + ESPN)
export const getMatchStatistics = async (fixtureId: number | string): Promise<any[] | null> => {
  const parsedSt = parseProviderId(fixtureId);
  if (parsedSt.provider === 'espn' && parsedSt.ref && parsedSt.raw) {
    const detailsSt = await getEspnEventDetails(parsedSt.ref, parsedSt.raw).catch(() => null);
    return detailsSt?.stats?.length ? detailsSt.stats : null;
  }
  if (parsedSt.provider !== 'api-football') return null;
  try {
    const response = await fetch(
      `${BASE_URL}/fixtures/statistics?fixture=${fixtureId}`
    );
    const data = await response.json();
    return data.response || null;
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return null;
  }
};

// Obtener ID de liga por nombre
export const getLeagueIdByName = async (name: string, country?: string): Promise<number | null> => {
  try {
    // Limpiar el nombre de la liga para la búsqueda
    const cleanName = name.replace(/EA Sports|Santander|Uber Eats|BKT|Sky Bet/gi, '').trim();
    let url = `${BASE_URL}/leagues?name=${encodeURIComponent(cleanName)}`;
    if (country) url += `&country=${encodeURIComponent(country)}`;
    
    const response = await fetch(url);
    
    const data = await response.json();
    
    // Si no hay resultados con 'name', intentar con 'search'
    if (!data.response || data.response.length === 0) {
      const searchUrl = `${BASE_URL}/leagues?search=${encodeURIComponent(cleanName)}`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      if (searchData.response && searchData.response.length > 0) {
        return searchData.response[0].league.id;
      }
      return null;
    }

    return data.response[0].league.id;
  } catch (error) {
    console.error('Error searching league ID:', error);
    return null;
  }
};

// Intento de clasificación solo con api-football (devuelve null si no hay datos)
const fetchApiFootballStandings = async (
  leagueId: number | string,
  date?: string,
  season?: number
): Promise<any | null> => {
  try {
    let id: number;

    // Si es un número o un string que representa un número, lo usamos como ID directamente
    if (!isNaN(Number(leagueId))) {
      id = Number(leagueId);
    } else {
      // Si es un string (nombre de la liga), buscamos su ID
      const searchedId = await getLeagueIdByName(String(leagueId));
      if (!searchedId) return null;
      id = searchedId;
    }

    // Determinar la temporada basada en la fecha del partido
    let targetSeason = season;
    if (!targetSeason) {
      const matchDate = date ? new Date(date) : new Date();
      const year = matchDate.getFullYear();
      const month = matchDate.getMonth(); // 0-11
      // Para ligas europeas (agosto-mayo), si estamos en marzo 2026, la temporada es 2025
      // Para ligas americanas (marzo-noviembre), si estamos en marzo 2026, la temporada es 2026
      targetSeason = month < 6 ? year - 1 : year;
    }

    const response = await fetch(
      `${BASE_URL}/standings?league=${id}&season=${targetSeason}`
    );

    if (!response.ok) return null;
    const data = await response.json();

    // Si no hay respuesta para la temporada calculada, intentar con la anterior o la siguiente como fallback
    if ((!data.response || data.response.length === 0) && !season) {
      // Intentar con la temporada anterior
      const prevSeasonData = await fetchApiFootballStandings(id, undefined, targetSeason - 1);
      if (prevSeasonData) return prevSeasonData;

      // Intentar con la temporada actual del año
      const currentYearSeason = await fetchApiFootballStandings(id, undefined, new Date().getFullYear());
      if (currentYearSeason) return currentYearSeason;
    }

    if (!data.response || data.response.length === 0) return null;

    return data.response[0].league;
  } catch (error) {
    console.error('Error fetching standings:', error);
    return null;
  }
};

// Obtener clasificación de una liga con cascada: api-football -> football-data -> ESPN.
export const getStandings = async (leagueId: number | string, date?: string, season?: number): Promise<any | null> => {
  const primary = await fetchApiFootballStandings(leagueId, date, season);
  if (primary) return primary;

  const isNumeric = !isNaN(Number(leagueId));

  // football-data.org (gratis, 12 competiciones top)
  const fdComp = isNumeric
    ? fdCompetitionByApiId(Number(leagueId))
    : fdCompetitionByName(String(leagueId));
  if (fdComp) {
    const fd = await getFootballDataStandings(fdComp.code).catch(() => null);
    if (fd) return fd;
  }

  // ESPN (sin clave)
  const espnLeague = isNumeric
    ? espnLeagueByApiId(Number(leagueId))
    : espnLeagueByName(String(leagueId));
  if (espnLeague) {
    const espn = await getEspnStandings(espnLeague.slug).catch(() => null);
    if (espn) return espn;
  }

  return null;
};

// IDs de las ligas principales
export const LEAGUES = {
  LA_LIGA: 140,
  PREMIER_LEAGUE: 39,
  SERIE_A: 135,
  BUNDESLIGA: 78,
  LIGUE_1: 61,
  CHAMPIONS_LEAGUE: 2,
  EUROPA_LEAGUE: 3,
};
