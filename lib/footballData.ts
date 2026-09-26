// Proveedor football-data.org (plan gratuito: 12 competiciones, 10 req/min).
// Segundo eslabón de la cascada: api-football -> football-data -> ESPN.
// Requiere FOOTBALL_DATA_API_KEY (gratis en https://www.football-data.org/client/register).
// Sin clave, el proxy devuelve 503 y estas funciones devuelven vacío/null sin romper nada.
import type { FootballApiMatch } from './football';

const BASE_URL = '/api/proxy/football-data';

export interface FdCompetition {
  code: string;
  name: string;
  country: string;
  apiId: number; // id equivalente en api-football (para compatibilidad)
  priority: number; // misma escala que lib/football (1 = top)
}

export const FD_COMPETITIONS: FdCompetition[] = [
  { code: 'CL', name: 'UEFA Champions League', country: 'World', apiId: 2, priority: 1 },
  { code: 'WC', name: 'FIFA World Cup', country: 'World', apiId: 1, priority: 1 },
  { code: 'EC', name: 'UEFA European Championship', country: 'World', apiId: 4, priority: 1 },
  { code: 'PD', name: 'LaLiga', country: 'Spain', apiId: 140, priority: 2 },
  { code: 'PL', name: 'Premier League', country: 'England', apiId: 39, priority: 2 },
  { code: 'SA', name: 'Serie A', country: 'Italy', apiId: 135, priority: 2 },
  { code: 'BL1', name: 'Bundesliga', country: 'Germany', apiId: 78, priority: 2 },
  { code: 'FL1', name: 'Ligue 1', country: 'France', apiId: 61, priority: 2 },
  { code: 'DED', name: 'Eredivisie', country: 'Netherlands', apiId: 94, priority: 3 },
  { code: 'PPL', name: 'Primeira Liga', country: 'Portugal', apiId: 144, priority: 3 },
  { code: 'ELC', name: 'Championship', country: 'England', apiId: 40, priority: 3 },
  { code: 'BSA', name: 'Campeonato Brasileiro Série A', country: 'Brazil', apiId: 71, priority: 4 },
];

export const fdCompetitionByApiId = (apiId: number): FdCompetition | undefined =>
  FD_COMPETITIONS.find((c) => c.apiId === apiId);

export const fdCompetitionByName = (name: string): FdCompetition | undefined => {
  const n = name.toLowerCase();
  return FD_COMPETITIONS.find(
    (c) => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase())
  );
};

export const fdCompetitionByCode = (code: string): FdCompetition | undefined =>
  FD_COMPETITIONS.find((c) => c.code === code);

const mapStatus = (status: string): { status: string; statusShort: string } => {
  switch (status) {
    case 'IN_PLAY':
      return { status: 'First Half', statusShort: 'LIVE' };
    case 'PAUSED':
      return { status: 'Halftime', statusShort: 'HT' };
    case 'FINISHED':
      return { status: 'Match Finished', statusShort: 'FT' };
    case 'POSTPONED':
      return { status: 'Match Postponed', statusShort: 'PST' };
    case 'SUSPENDED':
      return { status: 'Match Suspended', statusShort: 'SUSP' };
    case 'CANCELLED':
      return { status: 'Match Cancelled', statusShort: 'CANC' };
    case 'TIMED':
    case 'SCHEDULED':
    default:
      return { status: 'Not Started', statusShort: 'NS' };
  }
};

const mapMatch = (m: any): FootballApiMatch | null => {
  try {
    const comp = fdCompetitionByCode(m.competition?.code);
    const { status, statusShort } = mapStatus(m.status);
    const iso: string = m.utcDate || '';
    const ft = m.score?.fullTime || {};
    const hasScore = ft.home !== null && ft.home !== undefined && ft.away !== null && ft.away !== undefined;

    return {
      id: `fd:${m.id}`,
      date: iso ? iso.substring(0, 10) : '',
      time: iso && iso.includes('T') ? iso.substring(11, 16) : '',
      homeTeam: { id: `fd:${m.homeTeam?.id}`, name: m.homeTeam?.name || '', logo: m.homeTeam?.crest || '' },
      awayTeam: { id: `fd:${m.awayTeam?.id}`, name: m.awayTeam?.name || '', logo: m.awayTeam?.crest || '' },
      league: {
        id: comp?.apiId || 0,
        name: m.competition?.name || comp?.name || '',
        logo: m.competition?.emblem || '',
        country: comp?.country || '',
        priority: comp?.priority || 4,
      },
      status,
      statusShort,
      score: hasScore ? { home: ft.home, away: ft.away } : undefined,
      provider: 'football-data',
      providerRef: m.competition?.code || '',
    };
  } catch {
    return null;
  }
};

// Partidos de una fecha (una sola llamada para todas las competiciones gratuitas).
export const getFootballDataMatchesByDate = async (date: string): Promise<FootballApiMatch[]> => {
  try {
    const res = await fetch(`${BASE_URL}/matches?dateFrom=${date}&dateTo=${date}`);
    if (!res.ok) return [];
    const data = await res.json();
    const matches: any[] = data?.matches || [];
    return matches.map(mapMatch).filter((m): m is FootballApiMatch => m !== null);
  } catch (error) {
    console.error('Error fetching football-data matches:', error);
    return [];
  }
};

// Clasificación normalizada a la forma de api-football ({ name, logo, season, standings }).
export const getFootballDataStandings = async (code: string): Promise<any | null> => {
  try {
    const comp = fdCompetitionByCode(code);
    const res = await fetch(`${BASE_URL}/competitions/${code}/standings`);
    if (!res.ok) return null;
    const data = await res.json();
    const tables: any[] = data?.standings || [];
    // Preferimos la tabla TOTAL; si hay grupos (ej. Mundial), uno por grupo.
    const groups = tables.length > 1 ? tables : [tables.find((t) => t.type === 'TOTAL') || tables[0]];
    if (!groups[0]) return null;

    const standings = groups
      .map((g: any) =>
        (g.table || []).map((row: any) => ({
          rank: row.position,
          team: { id: row.team?.id, name: row.team?.name, logo: row.team?.crest || '' },
          points: row.points,
          goalsDiff: row.goalDifference,
          group: groups.length > 1 ? g.group || '' : '',
          form: row.form || '',
          status: 'same',
          description: '',
          all: {
            played: row.playedGames,
            win: row.won,
            draw: row.draw,
            lose: row.lost,
            goals: { for: row.goalsFor, against: row.goalsAgainst },
          },
        }))
      )
      .filter((g: any[]) => g.length > 0);

    if (standings.length === 0) return null;
    const seasonYear = data?.season?.startDate
      ? new Date(data.season.startDate).getFullYear()
      : new Date().getFullYear();
    return {
      id: comp?.apiId || code,
      name: data?.competition?.name || comp?.name || code,
      country: comp?.country || '',
      logo: data?.competition?.emblem || '',
      season: seasonYear,
      standings,
    };
  } catch (error) {
    console.error('Error fetching football-data standings:', error);
    return null;
  }
};

// Últimos partidos de un equipo en forma api-football (para la pestaña H2H / forma reciente).
export const getFootballDataTeamMatches = async (
  teamId: string | number,
  limit: number = 5
): Promise<any[] | null> => {
  try {
    const numericId = String(teamId).replace(/^fd:/, '');
    const res = await fetch(`${BASE_URL}/teams/${numericId}/matches?status=FINISHED&limit=${limit}`);
    if (!res.ok) return null;
    const data = await res.json();
    const matches: any[] = data?.matches || [];
    const rows = matches.map((m: any) => ({
      fixture: { id: `fd:${m.id}`, date: m.utcDate },
      league: { name: m.competition?.name || '' },
      teams: {
        home: { id: `fd:${m.homeTeam?.id}`, name: m.homeTeam?.name, logo: m.homeTeam?.crest || '' },
        away: { id: `fd:${m.awayTeam?.id}`, name: m.awayTeam?.name, logo: m.awayTeam?.crest || '' },
      },
      goals: {
        home: m.score?.fullTime?.home ?? null,
        away: m.score?.fullTime?.away ?? null,
      },
    }));
    return rows.length > 0 ? rows : null;
  } catch (error) {
    console.error('Error fetching football-data team matches:', error);
    return null;
  }
};
