
export type Sport = 'football' | 'basketball';
export type Language = 'es' | 'en' | 'ar' | 'fr' | 'it' | 'de' | 'pt' | 'zh';
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: string | number;
  awayTeamId?: string | number;
  homeLogo?: string;
  awayLogo?: string;
  homeForm?: string; // E.g., "WWDLD"
  awayForm?: string; // E.g., "LLWDW"
  date?: string; // 👈 NUEVO
  time: string;
  stadium?: string;
  league: string;
  leagueId?: number;
  leagueLogo?: string;
  country: string;
  sport: Sport;
  status?: string; // 'scheduled', 'live', 'finished'
  statusShort?: string; // 👈 NUEVO
  score?: string; // e.g., '2 - 1'
  briefStatus?: string; // Texto descriptivo adicional
  provider?: 'api-football' | 'football-data' | 'espn' | 'gemini';
  providerRef?: string; // slug ESPN o código football-data de la liga
  odds?: {
    home?: number;
    draw?: number;
    away?: number;
    provider?: string;
  };
}

export interface MatchGroup {
  country: string;
  league: string;
  matches: Match[];
}

export interface MatchResponse {
  groups: MatchGroup[];
  sources: GroundingChunk[];
}

export interface SearchParams {
  date: string;
  sport: Sport;
  lang: Language;
  query?: string; 
}

export interface FavoriteTeam {
  id: string; 
  name: string;
  logo?: string;
  sport: Sport;
}

export interface FavoriteLeague {
  id: string; 
  name: string;
  logo?: string;
  country?: string;
  sport: Sport;
}

export interface FavoriteMatch {
  id: string; 
  match: Match;
  savedAt: number;
}

export interface FavoritesState {
  teams: FavoriteTeam[];
  leagues: FavoriteLeague[];
  matches: FavoriteMatch[];
}

export type ViewState = 'home' | 'results' | 'detail' | 'subscription' | 'profile' | 'explore' | 'savedPicks' | 'videoGen' | 'favorites';

export interface Standing {
  rank: number;
  team: {
    id: number;
    name: string;
    logo: string;
  };
  points: number;
  goalsDiff: number;
  group: string;
  form: string;
  status: string;
  description: string;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: {
      for: number;
      against: number;
    };
  };
}

export interface LeagueStandings {
  leagueId: number;
  leagueName: string;
  standings: Standing[][];
}

export interface SavedPick {
  id: string;
  match: Match;
  type: 'analysis' | 'picks' | 'summary' | 'combined';
  content: string;
  prediction: string; 
  savedAt: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  subscription?: {
    planId: 'daily' | 'weekly' | 'monthly';
    expiresAt: number; // timestamp
  };
}

export interface Plan {
  id: 'daily' | 'weekly' | 'monthly';
  name: string;
  price: number;
  durationDays: number;
  description: string;
  popular?: boolean;
}
