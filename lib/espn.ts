// Proveedor ESPN (API no oficial, sin clave).
// ESPN no ofrece API pública oficial; estos endpoints son los que usa su propia web.
// Se usan como último eslabón de la cascada: api-football -> football-data -> ESPN.
import type { FootballApiMatch } from './football';

const BASE_URL = '/api/proxy/espn';

export interface EspnLeague {
  slug: string;
  name: string;
  country: string;
  apiId: number; // id equivalente en api-football (0 si no se conoce)
  priority: number; // misma escala que lib/football (1 = top)
}

export const ESPN_LEAGUES: EspnLeague[] = [
  { slug: 'uefa.champions', name: 'UEFA Champions League', country: 'World', apiId: 2, priority: 1 },
  { slug: 'uefa.europa', name: 'UEFA Europa League', country: 'World', apiId: 3, priority: 1 },
  { slug: 'esp.1', name: 'LaLiga', country: 'Spain', apiId: 140, priority: 2 },
  { slug: 'eng.1', name: 'Premier League', country: 'England', apiId: 39, priority: 2 },
  { slug: 'ita.1', name: 'Serie A', country: 'Italy', apiId: 135, priority: 2 },
  { slug: 'ger.1', name: 'Bundesliga', country: 'Germany', apiId: 78, priority: 2 },
  { slug: 'fra.1', name: 'Ligue 1', country: 'France', apiId: 61, priority: 2 },
  { slug: 'ned.1', name: 'Eredivisie', country: 'Netherlands', apiId: 94, priority: 3 },
  { slug: 'por.1', name: 'Liga Portugal', country: 'Portugal', apiId: 144, priority: 3 },
  { slug: 'usa.1', name: 'MLS', country: 'USA', apiId: 253, priority: 4 },
  { slug: 'mex.1', name: 'Liga MX', country: 'Mexico', apiId: 262, priority: 4 },
  { slug: 'bra.1', name: 'Brasileirão', country: 'Brazil', apiId: 71, priority: 4 },
];

export const espnLeagueByApiId = (apiId: number): EspnLeague | undefined =>
  ESPN_LEAGUES.find((l) => l.apiId === apiId);

export const espnLeagueByName = (name: string): EspnLeague | undefined => {
  const n = name.toLowerCase();
  return ESPN_LEAGUES.find(
    (l) => l.name.toLowerCase().includes(n) || n.includes(l.name.toLowerCase())
  );
};

export const espnLeagueBySlug = (slug: string): EspnLeague | undefined =>
  ESPN_LEAGUES.find((l) => l.slug === slug);

const toEspnDate = (date: string) => date.replace(/-/g, ''); // YYYY-MM-DD -> YYYYMMDD

type EspnCompetitor = {
  id: string;
  homeAway: 'home' | 'away';
  team: { id: string; displayName: string; shortDisplayName?: string; logo?: string };
  score?: string;
};

const getCompetition = (event: any) => event?.competitions?.[0];

const competitorSide = (event: any, side: 'home' | 'away'): EspnCompetitor | undefined =>
  getCompetition(event)?.competitors?.find((c: any) => c.homeAway === side);

const mapStatus = (event: any): { status: string; statusShort: string } => {
  const type = getCompetition(event)?.status?.type || {};
  const state: string = type.state || '';
  const shortDetail: string = type.shortDetail || type.description || '';
  if (state === 'post') return { status: shortDetail || 'Match Finished', statusShort: 'FT' };
  if (state === 'in') return { status: shortDetail || 'In Progress', statusShort: 'LIVE' };
  return { status: shortDetail || 'Match Scheduled', statusShort: 'NS' };
};

const mapScoreboardEvent = (event: any, league: EspnLeague, leagueLogo: string): FootballApiMatch | null => {
  try {
    const home = competitorSide(event, 'home');
    const away = competitorSide(event, 'away');
    if (!home || !away) return null;
    const { status, statusShort } = mapStatus(event);
    const iso: string = event.date || '';
    const hasScore = home.score !== undefined && away.score !== undefined;

    return {
      id: `espn:${league.slug}:${event.id}`,
      date: iso ? iso.substring(0, 10) : '',
      time: iso && iso.includes('T') ? iso.substring(11, 16) : '',
      homeTeam: { id: `espn:${league.slug}:${home.team.id}`, name: home.team.displayName, logo: home.team.logo || '' },
      awayTeam: { id: `espn:${league.slug}:${away.team.id}`, name: away.team.displayName, logo: away.team.logo || '' },
      league: { id: league.apiId || 0, name: league.name, logo: leagueLogo, country: league.country, priority: league.priority },
      status,
      statusShort,
      score: hasScore ? { home: Number(home.score), away: Number(away.score) } : undefined,
      provider: 'espn',
      providerRef: league.slug,
    };
  } catch {
    return null;
  }
};

// Partidos de fútbol de una fecha (recorre las ligas configuradas).
export const getEspnMatchesByDate = async (date: string): Promise<FootballApiMatch[]> => {
  const espnDate = toEspnDate(date);
  const results = await Promise.allSettled(
    ESPN_LEAGUES.map(async (league) => {
      const res = await fetch(`${BASE_URL}/soccer/${league.slug}/scoreboard?dates=${espnDate}&limit=100`);
      const data = await res.json();
      const events: any[] = data?.events || [];
      const leagueLogo: string = data?.leagues?.[0]?.logos?.[0]?.href || '';
      return events
        .map((e) => mapScoreboardEvent(e, league, leagueLogo))
        .filter((m): m is FootballApiMatch => m !== null);
    })
  );
  const matches: FootballApiMatch[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') matches.push(...r.value);
  }
  return matches;
};

// Baloncesto (NBA + WNBA) de una fecha. Misma forma normalizada; el llamador pone sport='basketball'.
export const getEspnBasketballMatchesByDate = async (date: string): Promise<FootballApiMatch[]> => {
  const espnDate = toEspnDate(date);
  const leagues = [
    { slug: 'nba', name: 'NBA', country: 'USA', apiId: 12, priority: 2 },
    { slug: 'wnba', name: 'WNBA', country: 'USA', apiId: 13, priority: 4 },
  ];
  const results = await Promise.allSettled(
    leagues.map(async (league) => {
      const res = await fetch(`${BASE_URL}/basketball/${league.slug}/scoreboard?dates=${espnDate}&limit=100`);
      const data = await res.json();
      const events: any[] = data?.events || [];
      const leagueLogo: string = data?.leagues?.[0]?.logos?.[0]?.href || '';
      return events
        .map((e) => mapScoreboardEvent(e, league, leagueLogo))
        .filter((m): m is FootballApiMatch => m !== null);
    })
  );
  const matches: FootballApiMatch[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') matches.push(...r.value);
  }
  return matches;
};

// Clasificación normalizada a la forma de api-football ({ name, logo, season, standings }).
export const getEspnStandings = async (slug: string): Promise<any | null> => {
  try {
    const league = espnLeagueBySlug(slug);
    const res = await fetch(`${BASE_URL}/soccer/${slug}/standings`);
    const data = await res.json();
    const children: any[] = data?.children || [];
    if (children.length === 0) return null;

    const leagueName: string =
      league?.name || children[0]?.name || data?.name || slug;
    const leagueLogo: string = data?.logos?.[0]?.href || '';

    const statVal = (stats: any[], name: string): number => {
      const s = stats?.find((x) => x.name === name);
      const v = s?.value ?? parseFloat(s?.displayValue);
      return typeof v === 'number' && !isNaN(v) ? v : 0;
    };

    const standings = children.map((child: any) => {
      const entries: any[] = child?.standings?.entries || [];
      return entries.map((entry: any, idx: number) => {
        const stats: any[] = entry.stats || [];
        const played = statVal(stats, 'gamesPlayed');
        const win = statVal(stats, 'wins');
        const lose = statVal(stats, 'losses');
        const ties = statVal(stats, 'ties');
        const gf = statVal(stats, 'pointsFor');
        const ga = statVal(stats, 'pointsAgainst');
        return {
          rank: statVal(stats, 'rank') || idx + 1,
          team: {
            id: entry.team?.id ?? idx,
            name: entry.team?.displayName || 'Team',
            logo: entry.team?.logos?.[0]?.href || '',
          },
          points: statVal(stats, 'points'),
          goalsDiff: statVal(stats, 'pointDifferential') || gf - ga,
          group: children.length > 1 ? child?.name || '' : '',
          form: '',
          status: 'same',
          description: '',
          all: {
            played,
            win,
            draw: ties || Math.max(0, played - win - lose),
            lose,
            goals: { for: gf, against: ga },
          },
        };
      });
    }).filter((g: any[]) => g.length > 0);

    if (standings.length === 0) return null;
    return {
      id: league?.apiId || slug,
      name: leagueName,
      country: league?.country || '',
      logo: leagueLogo,
      season: new Date().getFullYear(),
      standings,
    };
  } catch (error) {
    console.error('Error fetching ESPN standings:', error);
    return null;
  }
};

// Eventos y estadísticas de un partido (summary) en forma api-football.
export const getEspnEventDetails = async (
  slug: string,
  eventId: string
): Promise<{ events: any[]; stats: any[] } | null> => {
  try {
    const res = await fetch(`${BASE_URL}/soccer/${slug}/summary?event=${eventId}`);
    const data = await res.json();

    const competitors: any[] = data?.header?.competitions?.[0]?.competitors || [];
    const home = competitors.find((c) => c.homeAway === 'home');
    const away = competitors.find((c) => c.homeAway === 'away');
    const nameById = new Map<string, string>();
    const logoById = new Map<string, string>();
    for (const c of competitors) {
      nameById.set(String(c.team?.id), c.team?.displayName || '');
      logoById.set(String(c.team?.id), c.team?.logo || '');
    }

    // --- Eventos (goles, tarjetas, cambios) ---
    const details: any[] = data?.details || [];
    const events = details
      .map((d: any) => {
        const text: string = d?.type?.text || '';
        let type = '';
        let detail = text;
        if (/goal/i.test(text)) { type = 'Goal'; detail = 'Normal Goal'; }
        else if (/yellow/i.test(text)) { type = 'Card'; detail = 'Yellow Card'; }
        else if (/\bred\b/i.test(text)) { type = 'Card'; detail = 'Red Card'; }
        else if (/substitution/i.test(text)) { type = 'subst'; detail = 'Substitution'; }
        else return null;
        const elapsed = parseInt(String(d?.clock?.displayValue || ''), 10);
        const teamId = String(d?.team?.id || '');
        const playerName = d?.athletesInvolved?.[0]?.displayName || '';
        return {
          time: { elapsed: isNaN(elapsed) ? 0 : elapsed, extra: null },
          team: { id: teamId, name: nameById.get(teamId) || '', logo: logoById.get(teamId) || '' },
          player: { id: null, name: playerName },
          assist: { id: null, name: null },
          type,
          detail,
          comments: null,
        };
      })
      .filter(Boolean);

    // --- Estadísticas ---
    const STAT_MAP: Array<[string, string]> = [
      ['possessionPct', 'Ball Possession'],
      ['totalShots', 'Total Shots'],
      ['shotsOnTarget', 'Shots on Goal'],
      ['shotsOffTarget', 'Shots off Goal'],
      ['blockedShots', 'Blocked Shots'],
      ['wonCorners', 'Corner Kicks'],
      ['cornersWon', 'Corner Kicks'],
      ['offsides', 'Offsides'],
      ['fouls', 'Fouls'],
      ['foulsCommitted', 'Fouls'],
      ['yellowCards', 'Yellow Cards'],
      ['redCards', 'Red Cards'],
      ['saves', 'Goalkeeper Saves'],
      ['totalPasses', 'Total passes'],
      ['accuratePasses', 'Passes accurate'],
    ];
    const boxTeams: any[] = data?.boxscore?.teams || [];
    const statsByTeam = new Map<string, Map<string, string>>();
    for (const bt of boxTeams) {
      const m = new Map<string, string>();
      for (const s of bt.statistics || []) m.set(s.name, s.displayValue ?? String(s.value ?? ''));
      statsByTeam.set(String(bt.team?.id), m);
    }
    const homeId = String(home?.team?.id || '');
    const awayId = String(away?.team?.id || '');
    const homeStats = statsByTeam.get(homeId) || new Map();
    const awayStats = statsByTeam.get(awayId) || new Map();

    const statistics: any[] = [];
    for (const [espnName, label] of STAT_MAP) {
      if (statistics.some((s) => s.type === label)) continue;
      if (!homeStats.has(espnName) && !awayStats.has(espnName)) continue;
      const clean = (v?: string) => (v || '').replace('%', '');
      statistics.push({
        type: label,
        home: clean(homeStats.get(espnName)),
        away: clean(awayStats.get(espnName)),
      });
    }
    // Forma api-football: [{ team, statistics: [{type, value}] }, {...}]
    const stats =
      home && away && statistics.length > 0
        ? [
            {
              team: { id: homeId, name: nameById.get(homeId), logo: logoById.get(homeId) },
              statistics: statistics.map((s) => ({ type: s.type, value: s.home })),
            },
            {
              team: { id: awayId, name: nameById.get(awayId), logo: logoById.get(awayId) },
              statistics: statistics.map((s) => ({ type: s.type, value: s.away })),
            },
          ]
        : [];

    return { events, stats };
  } catch (error) {
    console.error('Error fetching ESPN event details:', error);
    return null;
  }
};

// Últimos partidos de un equipo (para la pestaña H2H / forma reciente).
export const getEspnTeamMatches = async (
  slug: string,
  teamId: string,
  limit: number = 5
): Promise<any[] | null> => {
  try {
    const league = espnLeagueBySlug(slug);
    const res = await fetch(`${BASE_URL}/soccer/${slug}/teams/${teamId}/schedule`);
    const data = await res.json();
    const events: any[] = data?.events || [];
    const rows = events
      .map((e: any) => {
        const comp = e?.competitions?.[0];
        const state = comp?.status?.type?.state;
        if (state !== 'post') return null;
        const h = comp?.competitors?.find((c: any) => c.homeAway === 'home');
        const a = comp?.competitors?.find((c: any) => c.homeAway === 'away');
        if (!h || !a) return null;
        return {
          fixture: { id: `espn:${slug}:${e.id}`, date: e.date },
          league: { name: league?.name || data?.team?.displayName || '' },
          teams: {
            home: { id: `espn:${slug}:${h.team?.id}`, name: h.team?.displayName, logo: h.team?.logo || '' },
            away: { id: `espn:${slug}:${a.team?.id}`, name: a.team?.displayName, logo: a.team?.logo || '' },
          },
          goals: {
            home: h.score !== undefined ? Number(h.score) : null,
            away: a.score !== undefined ? Number(a.score) : null,
          },
        };
      })
      .filter(Boolean)
      .slice(-limit);
    return rows.length > 0 ? rows : null;
  } catch (error) {
    console.error('Error fetching ESPN team matches:', error);
    return null;
  }
};
