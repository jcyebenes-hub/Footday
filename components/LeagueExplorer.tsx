
import React, { useState, useMemo, useEffect } from 'react';
import { Language, Sport, FavoriteLeague } from '../types';
import { translations } from '../utils/translations';
import { fetchLeagueMatchCounts } from '../services/geminiService';

interface Cup {
  name: string;
  tag: string;
  isStat?: boolean;
}

interface League {
  name: string;
  tag: string;
  cups?: Cup[];
  type?: 'male' | 'female' | 'youth';
}

interface Country {
  name: string;
  flag: string; // Ahora contiene el código ISO para la bandera
  leagues: League[];
}

interface Continent {
  id: string;
  name: string;
  icon: string;
  countries: Country[];
}

interface LeagueExplorerProps {
  onBack: () => void;
  onSelectLeague: (league: string) => void;
  lang: Language;
  sport: Sport;
  date: string;
  favorites?: FavoriteLeague[];
  onToggleFavoriteLeague?: (league: FavoriteLeague) => void;
}

const STATS_CANNED: Cup[] = [
  { name: 'Temporada 2024/25', tag: '📊 Stats', isStat: true },
  { name: 'Clasificación en vivo', tag: '📊 Posiciones', isStat: true },
  { name: 'Próximos partidos', tag: '📅 Calendario', isStat: true },
  { name: 'Máximos anotadores', tag: '🎯 Goleo/Puntos', isStat: true },
  { name: 'Playoffs / Cuadro', tag: '🔥 Fase Final', isStat: true },
];

const BASKETBALL_DATA: Continent[] = [
  {
    id: 'intl-selecciones-bball',
    name: '🏆 INTERNACIONAL (SELECCIONES)',
    icon: 'fas fa-globe',
    countries: [
      {
        name: 'Mundial y Global',
        flag: 'un',
        leagues: [
          { name: 'Copa del Mundo FIBA', tag: 'Mundial', cups: STATS_CANNED },
          { name: 'Juegos Olímpicos (Basket)', tag: 'Global', cups: STATS_CANNED },
          { name: 'Clasificatorios Mundial', tag: 'FIBA', cups: STATS_CANNED }
        ]
      },
      {
        name: 'Competiciones Continentales',
        flag: 'eu',
        leagues: [
          { name: 'EuroBasket', tag: 'Europa', cups: STATS_CANNED },
          { name: 'AmeriCup', tag: 'América', cups: STATS_CANNED },
          { name: 'AfroBasket', tag: 'África', cups: STATS_CANNED },
          { name: 'Asia Cup', tag: 'Asia', cups: STATS_CANNED }
        ]
      }
    ]
  },
  {
    id: 'europe-bball',
    name: '🌍 Europa',
    icon: 'fas fa-euro-sign',
    countries: [
      {
        name: 'Clubes Internacionales',
        flag: 'eu',
        leagues: [
          { name: 'Euroliga (EuroLeague)', tag: '🏆 Elite', cups: STATS_CANNED },
          { name: 'EuroCup', tag: 'Continental', cups: STATS_CANNED },
          { name: 'Basketball Champions League', tag: 'FIBA', cups: STATS_CANNED }
        ]
      },
      {
        name: 'España',
        flag: 'es',
        leagues: [
          { name: 'Liga Endesa (ACB)', tag: '🏆 1ª Div', cups: STATS_CANNED },
          { name: 'Primera FEB (LEB Oro)', tag: '2ª División', cups: STATS_CANNED }
        ]
      },
      {
        name: 'Italia',
        flag: 'it',
        leagues: [{ name: 'Lega Basket Serie A', tag: '1ª División', cups: STATS_CANNED }]
      },
      {
        name: 'Turquía',
        flag: 'tr',
        leagues: [{ name: 'Basketbol Süper Ligi', tag: '1ª División', cups: STATS_CANNED }]
      }
    ]
  },
  {
    id: 'north-america-bball',
    name: '🌍 América del Norte',
    icon: 'fas fa-flag-usa',
    countries: [
      {
        name: 'Estados Unidos',
        flag: 'us',
        leagues: [
          { name: 'NBA', tag: '🏆 Elite', cups: STATS_CANNED },
          { name: 'WNBA', tag: 'Femenino', cups: STATS_CANNED },
          { name: 'NCAA Basketball', tag: 'Universitario', cups: STATS_CANNED }
        ]
      },
      {
        name: 'México',
        flag: 'mx',
        leagues: [{ name: 'LNBP', tag: '1ª División', cups: STATS_CANNED }]
      }
    ]
  },
  {
    id: 'south-america-bball',
    name: '🌍 América del Sur',
    icon: 'fas fa-globe-americas',
    countries: [
      {
        name: 'Brasil',
        flag: 'br',
        leagues: [{ name: 'NBB', tag: '1ª División', cups: STATS_CANNED }]
      },
      {
        name: 'Argentina',
        flag: 'ar',
        leagues: [{ name: 'Liga Nacional de Básquet', tag: '1ª División', cups: STATS_CANNED }]
      }
    ]
  },
  {
    id: 'asia-bball',
    name: '🌍 Asia',
    icon: 'fas fa-globe-asia',
    countries: [
      {
        name: 'China',
        flag: 'cn',
        leagues: [{ name: 'CBA', tag: 'Elite Asia', cups: STATS_CANNED }]
      },
      {
        name: 'Filipinas',
        flag: 'ph',
        leagues: [{ name: 'PBA', tag: 'Liga Nacional', cups: STATS_CANNED }]
      }
    ]
  },
  {
    id: 'africa-bball',
    name: '🌍 África',
    icon: 'fas fa-earth-africa',
    countries: [
      {
        name: 'Internacional',
        flag: 'un',
        leagues: [{ name: 'Basketball Africa League (BAL)', tag: 'Champions', cups: STATS_CANNED }]
      },
      {
        name: 'Angola',
        flag: 'ao',
        leagues: [{ name: 'Unitel Basket', tag: '1ª División', cups: STATS_CANNED }]
      }
    ]
  },
  {
    id: 'oceania-bball',
    name: '🌍 Oceanía',
    icon: 'fas fa-anchor',
    countries: [
      {
        name: 'Australia',
        flag: 'au',
        leagues: [{ name: 'NBL', tag: 'Elite Oceanía', cups: STATS_CANNED }]
      }
    ]
  },
  {
    id: 'antarctica-bball',
    name: '🌍 Antártida',
    icon: 'fas fa-snowflake',
    countries: [
      {
        name: 'Estación McMurdo',
        flag: 'aq',
        leagues: [{ name: 'McMurdo Hoop League', tag: 'Torneo Amateur', cups: [{ name: 'Copa del Hielo', tag: 'Invierno' }] }]
      }
    ]
  }
];

const FOOTBALL_DATA: Continent[] = [
  {
    id: 'intl-selecciones-foot',
    name: '🏆 INTERNACIONAL (SELECCIONES)',
    icon: 'fas fa-flag',
    countries: [
      {
        name: 'Mundiales (FIFA)',
        flag: 'un',
        leagues: [
          { name: 'Copa Mundial FIFA', tag: 'Mundial' },
          { name: 'Copa Mundial FIFA Femenina', tag: 'Mundial Femenino' },
          { name: 'Copa Mundial Sub-20', tag: 'Mundial U20' },
          { name: 'Copa Mundial Sub-17', tag: 'Mundial U17' },
          { name: 'Copa Mundial Sub-20 Femenina', tag: 'Mundial U20 F' },
          { name: 'Copa Mundial Sub-17 Femenina', tag: 'Mundial U17 F' }
        ]
      },
      {
        name: 'África (CAF)',
        flag: 'un',
        leagues: [
          { name: 'Copa Africana de Naciones (AFCON)', tag: 'Selecciones' },
          { name: 'Copa Africana de Naciones Femenina', tag: 'Femenino' },
          { name: 'Campeonato Africano de Naciones (CHAN)', tag: 'Selecciones' }
        ]
      },
      {
        name: 'Europa (UEFA)',
        flag: 'eu',
        leagues: [
          { name: 'Eurocopa', tag: 'Selecciones' },
          { name: 'Eurocopa Femenina', tag: 'Femenino' },
          { name: 'UEFA Nations League', tag: 'Nations League' },
          { name: 'UEFA Nations League Femenina', tag: 'Nations League F' },
          { name: 'Europeo Sub-21', tag: 'Juvenil U21' },
          { name: 'Europeo Sub-19', tag: 'Juvenil U19' },
          { name: 'Europeo Sub-17', tag: 'Juvenil U17' }
        ]
      },
      {
        name: 'América del Sur (CONMEBOL)',
        flag: 'un',
        leagues: [
          { name: 'Copa América', tag: 'Selecciones' },
          { name: 'Copa América Femenina', tag: 'Femenino' },
          { name: 'Sudamericano Sub-20', tag: 'Juvenil U20' },
          { name: 'Sudamericano Sub-17', tag: 'Juvenil U17' }
        ]
      },
      {
        name: 'Norte y Centroamérica (CONCACAF)',
        flag: 'un',
        leagues: [
          { name: 'Copa Oro', tag: 'Selecciones' },
          { name: 'Copa Oro Femenina', tag: 'Femenino' },
          { name: 'CONCACAF Nations League', tag: 'Nations League' }
        ]
      },
      {
        name: 'Asia (AFC)',
        flag: 'un',
        leagues: [
          { name: 'Copa Asiática', tag: 'Selecciones' },
          { name: 'Copa Asiática Femenina', tag: 'Femenino' },
          { name: 'Campeonato Asiático Sub-23', tag: 'Juvenil U23' }
        ]
      },
      {
        name: 'Oceanía (OFC)',
        flag: 'un',
        leagues: [
          { name: 'Copa de las Naciones de la OFC', tag: 'Selecciones' }
        ]
      },
      {
        name: 'Intercontinentales',
        flag: 'un',
        leagues: [
          { name: 'Copa Confederaciones', tag: 'FIFA' },
          { name: 'Juegos Olímpicos – Torneo Masculino', tag: 'Olímpico' },
          { name: 'Juegos Olímpicos – Torneo Femenino', tag: 'Olímpico F' }
        ]
      }
    ]
  },
  {
    id: 'europe-football',
    name: '🌍 Europa (UEFA)',
    icon: 'fas fa-euro-sign',
    countries: [
      {
        name: 'Internacional / UEFA',
        flag: 'eu',
        leagues: [
          { name: 'Champions League', tag: '🏆 Elite UEFA' },
          { name: 'Europa League', tag: 'UEFA' },
          { name: 'Conference League', tag: 'UEFA' }
        ]
      },
      {
        name: 'España',
        flag: 'es',
        leagues: [
          { name: 'LaLiga EA Sports', tag: '1ª División' },
          { name: 'LaLiga Hypermotion', tag: '2ª División' },
          { name: 'Primera Federación', tag: '3ª División' },
          { name: 'Primera Federación – Grupo 1', tag: '3ª División' },
          { name: 'Primera Federación – Grupo 2', tag: '3ª División' },
          { name: 'Segunda Federación', tag: '4ª División' },
          { name: 'Segunda Federación – Grupo 1', tag: '4ª División' },
          { name: 'Segunda Federación – Grupo 2', tag: '4ª División' },
          { name: 'Segunda Federación – Grupo 3', tag: '4ª División' },
          { name: 'Segunda Federación – Grupo 4', tag: '4ª División' },
          { name: 'Segunda Federación – Grupo 5', tag: '4ª División' },
          { name: 'Tercera Federación', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 1', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 2', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 3', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 4', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 5', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 6', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 7', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 8', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 9', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 10', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 11', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 12', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 13', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 14', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 15', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 16', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 17', tag: '5ª División' },
          { name: 'Tercera Federación – Grupo 18', tag: '5ª División' },
          { name: 'Copa del Rey', tag: 'Copa Nacional' },
          { name: 'Copa Federación', tag: 'Copa' },
          { name: 'Supercopa de España', tag: 'Supercopa' },
          { name: 'Liga F', tag: 'Femenino' },
          { name: 'Primera Federación Femenina', tag: 'Femenino 2ª' },
          { name: 'Copa de la Reina', tag: 'Copa Femenina' },
          { name: 'Supercopa Femenina', tag: 'Supercopa Femenina' }
        ]
      },
      {
        name: 'Inglaterra',
        flag: 'gb-eng',
        leagues: [
          { name: 'Premier League', tag: '1ª División' }, 
          { name: 'Championship', tag: '2ª División' },
          { name: 'League One', tag: '3ª División' },
          { name: 'League Two', tag: '4ª División' },
          { name: 'National League', tag: '5ª División' },
          { name: 'National League North', tag: '6ª División' },
          { name: 'National League South', tag: '6ª División' },
          { name: 'National League Cup', tag: 'Copa' },
          { name: 'NPL Premier Division', tag: '7ª División' },
          { name: 'Southern League Premier Central', tag: '7ª División' },
          { name: 'Southern League Premier South', tag: '7ª División' },
          { name: 'Isthmian League Premier Division', tag: '7ª División' },
          { name: 'FA Cup', tag: 'Copa Nacional' },
          { name: 'EFL Cup', tag: 'Copa de la Liga' },
          { name: 'FA Community Shield', tag: 'Supercopa' },
          { name: 'EFL Trophy', tag: 'Trofeo' },
          { name: 'FA Trophy', tag: 'Trofeo' },
          { name: 'Premier League 2', tag: 'U23' },
          { name: 'Professional Development League', tag: 'Juvenil' },
          { name: 'Premier League Cup', tag: 'Copa Juvenil' },
          { name: 'Premier League U18', tag: 'Sub-18' },
          { name: 'FA Youth Cup', tag: 'Copa Juvenil' },
          { name: 'WSL', tag: 'Femenino' },
          { name: 'WSL 2', tag: 'Femenino 2ª' },
          { name: 'Women\'s National League North', tag: 'Femenino 3ª' },
          { name: 'Women\'s National League South', tag: 'Femenino 3ª' },
          { name: 'FA Cup Femenina', tag: 'Copa Femenina' },
          { name: 'Women\'s League', tag: 'Copa de la Liga F' }
        ]
      },
      {
        name: 'Albania',
        flag: 'al',
        leagues: [
          { name: 'Superliga', tag: '1ª División' },
          { name: 'Kategoria e Parë', tag: '2ª División' },
          { name: 'Copa de Albania', tag: 'Copa' },
          { name: 'Supercopa de Albania', tag: 'Supercopa' }
        ]
      },
      {
        name: 'Italia',
        flag: 'it',
        leagues: [
          { name: 'Serie A', tag: '1ª División' },
          { name: 'Serie B', tag: '2ª División' },
          { name: 'Serie C - Grupo A', tag: '3ª División' },
          { name: 'Serie C - Grupo B', tag: '3ª División' },
          { name: 'Serie C - Grupo C', tag: '3ª División' },
          { name: 'Serie C - Ascenso - Playoffs', tag: 'Promoción' },
          { name: 'Serie C - Play Out', tag: 'Descenso' },
          { name: 'Serie D - Grupo A', tag: '4ª División' },
          { name: 'Serie D - Grupo B', tag: '4ª División' },
          { name: 'Serie D - Grupo C', tag: '4ª División' },
          { name: 'Serie D - Grupo D', tag: '4ª División' },
          { name: 'Serie D - Grupo E', tag: '4ª División' },
          { name: 'Serie D - Grupo F', tag: '4ª División' },
          { name: 'Serie D - Grupo G', tag: '4ª División' },
          { name: 'Serie D - Grupo H', tag: '4ª División' },
          { name: 'Serie D - Grupo I', tag: '4ª División' },
          { name: 'Serie D - Fase de ganadores', tag: 'Fase Final' },
          { name: 'Copa Italia', tag: 'Copa Nacional' },
          { name: 'Copa Italia Serie C', tag: 'Copa' },
          { name: 'Copa Italia Serie D', tag: 'Copa' },
          { name: 'Supercopa', tag: 'Supercopa' },
          { name: 'Supercopa (Serie C)', tag: 'Supercopa' },
          { name: 'Primavera 1', tag: 'Juvenil' },
          { name: 'Primavera 2', tag: 'Juvenil' },
          { name: 'Copa Italia Primavera', tag: 'Copa Juvenil' },
          { name: 'Supercoppa Primavera', tag: 'Supercopa Juvenil' },
          { name: 'Serie A Femenina', tag: 'Femenino' },
          { name: 'Serie B Femenina', tag: 'Femenino 2ª' },
          { name: 'Coppa Italia Femenina', tag: 'Copa Femenina' },
          { name: 'Serie A Cup Women', tag: 'Copa Femenina' },
          { name: 'Supercopa Femenina', tag: 'Supercopa Femenina' }
        ]
      },
      {
        name: 'Alemania',
        flag: 'de',
        leagues: [
          { name: 'Bundesliga', tag: '1ª División' },
          { name: '2. Bundesliga', tag: '2ª División' },
          { name: '3. Liga', tag: '3ª División' },
          { name: 'Regionalliga Nord', tag: '4ª División' },
          { name: 'Regionalliga Nordost', tag: '4ª División' },
          { name: 'Regionalliga West', tag: '4ª División' },
          { name: 'Regionalliga Südwest', tag: '4ª División' },
          { name: 'Regionalliga Bayern', tag: '4ª División' },
          { name: 'Regionalliga Playoffs', tag: 'Promoción' },
          { name: 'Oberliga NOFV-Nord', tag: '5ª División' },
          { name: 'Oberliga NOFV-Süd', tag: '5ª División' },
          { name: 'Oberliga Schleswig-Holstein', tag: '5ª División' },
          { name: 'Oberliga Hamburg', tag: '5ª División' },
          { name: 'Oberliga Bremen', tag: '5ª División' },
          { name: 'Oberliga Niedersachsen', tag: '5ª División' },
          { name: 'Oberliga Westfalen', tag: '5ª División' },
          { name: 'Oberliga Hessen', tag: '5ª División' },
          { name: 'Oberliga Rheinland-Pfalz/Saar', tag: '5ª División' },
          { name: 'Oberliga Bayern Nord', tag: '5ª División' },
          { name: 'Oberliga Bayern Süd', tag: '5ª División' },
          { name: 'Oberliga Baden-Württemberg', tag: '5ª División' },
          { name: 'Oberliga Mittelrhein', tag: '5ª División' },
          { name: 'Oberliga Niederrhein', tag: '5ª División' },
          { name: 'DFB-Pokal', tag: 'Copa Nacional' },
          { name: 'Supercup', tag: 'Supercopa' },
          { name: 'DFB Youth League', tag: 'Juvenil' },
          { name: 'DFB Junioren Pokal', tag: 'Copa Juvenil' },
          { name: 'Frauen-Bundesliga', tag: 'Femenino' },
          { name: '2. Frauen-Bundesliga', tag: 'Femenino 2ª' },
          { name: 'DFB-Pokal Frauen', tag: 'Copa Femenina' },
          { name: 'Super Cup Women', tag: 'Supercopa Femenina' }
        ]
      },
      {
        name: 'Francia',
        flag: 'fr',
        leagues: [
          { name: 'Ligue 1', tag: '1ª División' },
          { name: 'Ligue 2', tag: '2ª División' },
          { name: 'National', tag: '3ª División' },
          { name: 'National 2 - Grupo A', tag: '4ª División' },
          { name: 'National 2 - Grupo B', tag: '4ª División' },
          { name: 'National 2 - Grupo C', tag: '4ª División' },
          { name: 'Copa de Francia', tag: 'Copa Nacional' },
          { name: 'Supercopa', tag: 'Supercopa' },
          { name: 'Premiere Ligue Femenina', tag: 'Femenino' },
          { name: 'Seconde Ligue Femenina', tag: 'Femenino 2ª' },
          { name: 'Coupe de France Femenina', tag: 'Copa Femenina' },
          { name: 'Coupe de la Ligue Femenina', tag: 'Copa Femenina' },
          { name: 'Supercopa Femenina', tag: 'Supercopa Femenina' }
        ]
      },
      {
        name: 'Portugal',
        flag: 'pt',
        leagues: [
          { name: 'Liga Portugal', tag: '1ª División' },
          { name: 'Liga Portugal 2', tag: '2ª División' },
          { name: 'Liga 3', tag: '3ª División' },
          { name: 'Campeonato de Portugal – Group A', tag: '4ª División' },
          { name: 'Campeonato de Portugal – Group B', tag: '4ª División' },
          { name: 'Campeonato de Portugal – Group C', tag: '4ª División' },
          { name: 'Campeonato de Portugal – Group D', tag: '4ª División' },
          { name: 'Campeonato de Portugal – Play-Offs', tag: 'Promoción' },
          { name: 'Campeonato de Portugal – Promotion', tag: 'Promoción' },
          { name: 'Taça de Portugal', tag: 'Copa Nacional' },
          { name: 'Taça da Liga', tag: 'Copa de la Liga' },
          { name: 'Supercopa', tag: 'Supercopa' },
          { name: 'Liga Revelacao Sub-23', tag: 'Juvenil U23' },
          { name: 'Taca Revelacao U23', tag: 'Copa Juvenil' },
          { name: 'Campeonato Nacional', tag: 'Torneo Nacional' },
          { name: 'Liga BPI Femenina', tag: 'Femenino' },
          { name: 'Taça de Portugal Feminina', tag: 'Copa Femenina' },
          { name: 'Taça da Liga Feminina', tag: 'Copa Femenina' },
          { name: 'Supercopa Femenina', tag: 'Supercopa Femenina' }
        ]
      },
      {
        name: 'Países Bajos',
        flag: 'nl',
        leagues: [
          { name: 'Eredivisie', tag: '1ª División' },
          { name: 'Keuken Kampioen Divisie', tag: '2ª División' },
          { name: 'Tweede Divisie', tag: '3ª División' },
          { name: 'Derde Divisie', tag: '4ª División' },
          { name: 'KNVB Beker', tag: 'Copa Nacional' },
          { name: 'Johan Cruyff Shield', tag: 'Supercopa' },
          { name: 'Divisie 1 U21', tag: 'Juvenil U21' },
          { name: 'Divisie 1 U19', tag: 'Juvenil U19' },
          { name: 'Eredivisie Femenina', tag: 'Femenino' },
          { name: 'KNVB Beker Femenina', tag: 'Copa Femenina' },
          { name: 'Eredivisie Cup Femenina', tag: 'Copa Femenina' },
          { name: 'Super Cup Women', tag: 'Supercopa Femenina' }
        ]
      },
      {
        name: 'Bélgica',
        flag: 'be',
        leagues: [{ name: 'Pro League', tag: '1ª División' }]
      },
      {
        name: 'Turquía',
        flag: 'tr',
        leagues: [{ name: 'Süper Lig', tag: '1ª División' }, { name: 'Türkiye Kupası', tag: 'Copa' }]
      },
      {
        name: 'Grecia',
        flag: 'gr',
        leagues: [{ name: 'Super League 1', tag: '1ª División' }]
      },
      {
        name: 'Escocia',
        flag: 'gb-sct',
        leagues: [{ name: 'Premiership', tag: '1ª División' }, { name: 'Scottish Cup', tag: 'Copa' }]
      },
      {
        name: 'Austria',
        flag: 'at',
        leagues: [{ name: 'Bundesliga Austria', tag: '1ª División' }]
      },
      {
        name: 'Suiza',
        flag: 'ch',
        leagues: [{ name: 'Super League Suiza', tag: '1ª División' }]
      },
      {
        name: 'Dinamarca',
        flag: 'dk',
        leagues: [{ name: 'Superliga Dinamarca', tag: '1ª División' }]
      },
      {
        name: 'Noruega',
        flag: 'no',
        leagues: [{ name: 'Eliteserien', tag: '1ª División' }]
      },
      {
        name: 'Suecia',
        flag: 'se',
        leagues: [{ name: 'Allsvenskan', tag: '1ª División' }]
      },
      {
        name: 'Polonia',
        flag: 'pl',
        leagues: [{ name: 'Ekstraklasa', tag: '1ª División' }]
      },
      {
        name: 'Croacia',
        flag: 'hr',
        leagues: [{ name: 'HNL', tag: '1ª División' }]
      },
      {
        name: 'República Checa',
        flag: 'cz',
        leagues: [{ name: 'First League', tag: '1ª División' }]
      },
      {
        name: 'Rusia',
        flag: 'ru',
        leagues: [{ name: 'Premier League Rusa', tag: '1ª División' }]
      },
      {
        name: 'Ucrania',
        flag: 'ua',
        leagues: [{ name: 'Premier League Ucraniana', tag: '1ª División' }]
      }
    ]
  },
  {
    id: 'south-america-football',
    name: '🌍 América del Sur',
    icon: 'fas fa-globe-americas',
    countries: [
      {
        name: 'Brasil',
        flag: 'br',
        leagues: [{ name: 'Brasileirão Série A', tag: '1ª División' }, { name: 'Copa do Brasil', tag: 'Copa' }]
      },
      {
        name: 'Argentina',
        flag: 'ar',
        leagues: [{ name: 'Liga Profesional', tag: '1ª División' }, { name: 'Copa de la Liga', tag: 'Torneo' }]
      },
      {
        name: 'Internacional',
        flag: 'un',
        leagues: [{ name: 'Copa Libertadores', tag: 'Elite CONMEBOL' }, { name: 'Copa Sudamericana', tag: 'CONMEBOL' }]
      }
    ]
  },
  {
    id: 'north-america-football',
    name: '🌍 América del Norte',
    icon: 'fas fa-flag-usa',
    countries: [
      {
        name: 'México',
        flag: 'mx',
        leagues: [{ name: 'Liga MX', tag: '1ª División' }, { name: 'Liga de Expansión', tag: '2ª División' }]
      },
      {
        name: 'Estados Unidos',
        flag: 'us',
        leagues: [{ name: 'MLS', tag: 'Elite' }, { name: 'USL Championship', tag: '2ª División' }]
      }
    ]
  },
  {
    id: 'asia-football',
    name: '🌍 Asia (AFC)',
    icon: 'fas fa-globe-asia',
    countries: [
      {
        name: 'Arabia Saudí',
        flag: 'sa',
        leagues: [{ name: 'Saudi Pro League', tag: 'Elite' }]
      },
      {
        name: 'Japón',
        flag: 'jp',
        leagues: [{ name: 'J1 League', tag: '1ª División' }]
      }
    ]
  },
  {
    id: 'africa-football',
    name: '🌍 África (CAF)',
    icon: 'fas fa-earth-africa',
    countries: [
      {
        name: 'Egipto',
        flag: 'eg',
        leagues: [{ name: 'Egyptian Premier League', tag: '1ª División' }]
      },
      {
        name: 'Marruecos',
        flag: 'ma',
        leagues: [{ name: 'Botola Pro', tag: '1ª División' }]
      },
      {
        name: 'Sudáfrica',
        flag: 'za',
        leagues: [{ name: 'DSTV Premiership', tag: '1ª División' }]
      }
    ]
  },
  {
    id: 'oceania-football',
    name: '🌍 Oceanía (OFC)',
    icon: 'fas fa-anchor',
    countries: [
      {
        name: 'Australia',
        flag: 'au',
        leagues: [{ name: 'A-League', tag: 'Elite' }]
      },
      {
        name: 'Nueva Zelanda',
        flag: 'nz',
        leagues: [{ name: 'NZ National League', tag: '1ª División' }]
      }
    ]
  },
  {
    id: 'antarctica-football',
    name: '🌍 Antártida',
    icon: 'fas fa-snowflake',
    countries: [
      {
        name: 'Base Esperanza',
        flag: 'aq',
        leagues: [{ name: 'Copa Pingüino de Verano', tag: 'Torneo Científico' }]
      }
    ]
  }
];

const LeagueExplorer: React.FC<LeagueExplorerProps> = ({ onBack, onSelectLeague, lang, sport, date, favorites = [], onToggleFavoriteLeague }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeContinent, setActiveContinent] = useState<string | null>(null);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});

  const isRTL = lang === 'ar';
  const tGlobal = translations[lang];

  // Efecto para cargar los conteos de partidos dinámicamente
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const counts = await fetchLeagueMatchCounts(date, sport, lang);
        setMatchCounts(counts);
      } catch (err) {
        console.error("Error loading match counts:", err);
      }
    };
    loadCounts();
  }, [date, sport, lang]);

  const CURRENT_DATA = sport === 'football' ? FOOTBALL_DATA : BASKETBALL_DATA;

  const filteredData = useMemo(() => {
    if (!searchTerm) return CURRENT_DATA;
    const term = searchTerm.toLowerCase();
    
    return CURRENT_DATA.map(continent => {
      const filteredCountries = continent.countries.filter(country => 
        country.name.toLowerCase().includes(term) ||
        country.leagues.some(l => l.name.toLowerCase().includes(term))
      );

      return {
        ...continent,
        countries: filteredCountries
      };
    }).filter(continent => continent.countries.length > 0 || continent.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, CURRENT_DATA]);

  const handleContinentToggle = (id: string) => {
    setActiveContinent(prev => prev === id ? null : id);
    setActiveCountry(null);
  };

  const handleCountryToggle = (name: string) => {
    setActiveCountry(prev => prev === name ? null : name);
  };

  const toggleExpandCountry = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setExpandedCountries(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <div className={`bg-[#0a0a0a] dark:bg-black text-white min-h-[400px] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in duration-500 mb-12 border border-[#006CFF]/30 dark:border-[#FF3B30]/30 flex flex-col transition-colors ${isRTL ? 'text-right' : 'text-left'}`}>
      
      <div className="p-6 border-b border-[#006CFF]/20 dark:border-[#232323] bg-[#141414] dark:bg-[#0D0D0D]">
        <div className="flex items-center justify-between mb-6">
          <div className={`flex items-center space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
            <div className="w-10 h-10 bg-black border border-[#006CFF] dark:border-[#FF3B30] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,108,255,0.2)]">
              <i className={`fas ${sport === 'football' ? 'fa-trophy' : 'fa-basketball-ball'} text-[#006CFF] dark:text-[#FF3B30] text-lg`}></i>
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-white leading-none">
                EXPLORADOR GLOBAL
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">7 Continentes • Temporada 24/25</p>
            </div>
          </div>
          <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="relative group">
          <span className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-5' : 'left-0 pl-5'} flex items-center text-slate-600 dark:text-[#6E6E6E] group-focus-within:text-[#006CFF] dark:group-focus-within:text-[#FF3B30] transition-colors`}>
            <i className="fas fa-search"></i>
          </span>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar país, liga o continente..." 
            className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 bg-black dark:bg-[#1A1A1A] border border-slate-800 dark:border-[#232323] rounded-2xl focus:border-[#006CFF] dark:focus:border-[#FF3B30] outline-none transition-all font-bold text-white shadow-inner text-sm`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#0a0a0a] dark:bg-black scrollbar-hide pb-8 max-h-[600px]">
        <div className="divide-y divide-slate-900 dark:divide-[#232323]">
          {filteredData.map((continent) => (
            <div key={continent.id} className="overflow-hidden">
              <button
                onClick={() => handleContinentToggle(continent.id)}
                className={`w-full p-5 flex items-center justify-between transition-all group ${
                  activeContinent === continent.id ? 'bg-[#141414] dark:bg-[#121212]' : 'hover:bg-white/5'
                }`}
              >
                <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isRTL ? 'ml-3' : 'mr-3'} transition-all ${activeContinent === continent.id ? 'bg-[#006CFF] dark:bg-[#FF3B30] text-white' : 'bg-slate-900 dark:bg-[#1A1A1A] text-slate-600 group-hover:text-[#006CFF] dark:group-hover:text-[#FF3B30]'}`}>
                    <i className={`${continent.icon} text-sm`}></i>
                  </div>
                  <span className={`font-black uppercase text-xs tracking-widest ${activeContinent === continent.id ? 'text-white' : 'text-slate-500'}`}>
                    {continent.name}
                  </span>
                </div>
                <div className={`text-base ${activeContinent === continent.id ? 'text-[#006CFF] dark:text-[#FF3B30]' : 'text-slate-800'}`}>
                  {activeContinent === continent.id ? <i className="fas fa-minus-circle"></i> : <i className="fas fa-plus-circle"></i>}
                </div>
              </button>

              <div className={`transition-all duration-300 ease-out overflow-hidden ${activeContinent === continent.id ? 'max-h-[8000px] bg-black/40' : 'max-h-0'}`}>
                <div className={`border-[#006CFF]/20 dark:border-[#FF3B30]/20 mb-4 mt-2 ${isRTL ? 'border-r-2 mr-6' : 'border-l-2 ml-6'}`}>
                  {continent.countries.map((country) => {
                    const isCountryExpanded = expandedCountries.has(country.name);
                    const leaguesToShow = isCountryExpanded ? country.leagues : country.leagues.slice(0, 3);
                    const hasMoreLeagues = country.leagues.length > 3;

                    return (
                      <div key={country.name} className="overflow-hidden">
                        <button
                          onClick={() => handleCountryToggle(country.name)}
                          className={`w-full p-4 flex items-center justify-between transition-all group ${
                            activeCountry === country.name ? 'bg-[#006CFF]/5 dark:bg-[#FF3B30]/5 border-b border-[#006CFF]/10 dark:border-[#FF3B30]/10' : 'hover:bg-white/5 border-b border-white/5 dark:border-[#232323]'
                          }`}
                        >
                          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-7 h-5 flex items-center justify-center overflow-hidden rounded-sm shadow-sm border border-white/10 ${isRTL ? 'ml-3' : 'mr-3'}`}>
                              <img 
                                src={`https://flagcdn.com/w40/${country.flag.toLowerCase()}.png`} 
                                alt={country.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement?.classList.add('bg-slate-800');
                                }}
                              />
                            </div>
                            <span className={`font-bold text-sm tracking-tight ${activeCountry === country.name ? 'text-white' : 'text-slate-400 dark:text-[#C8C8C8]'}`}>
                              {country.name}
                            </span>
                          </div>
                        </button>

                        <div className={`transition-all duration-300 ease-out overflow-hidden ${activeCountry === country.name ? 'max-h-[3000px]' : 'max-h-0'}`}>
                          <div className="p-3 space-y-2">
                            {leaguesToShow.map((league) => {
                              const count = matchCounts[league.name] || 0;
                              const isFav = favorites.some(f => f.name === league.name);
                              
                              return (
                                <div key={league.name} 
                                  className={`flex items-center justify-between p-3 bg-slate-900/40 dark:bg-[#0D0D0D] rounded-2xl border border-slate-800 dark:border-[#232323] hover:border-[#006CFF] dark:hover:border-[#FF3B30] transition-all cursor-pointer group shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}
                                >
                                  <div 
                                    onClick={() => onSelectLeague(league.name)}
                                    className={`flex items-center flex-1 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg bg-black flex items-center justify-center ${isRTL ? 'ml-3' : 'mr-3'} group-hover:bg-[#006CFF] dark:group-hover:bg-[#FF3B30] transition-colors`}>
                                      <i className="fas fa-trophy text-[10px]"></i>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{league.name}</span>
                                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{league.tag}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    {count > 0 && (
                                      <span className="text-[10px] font-black bg-white/10 dark:bg-white/5 text-slate-400 px-2 py-0.5 rounded-full transition-colors group-hover:text-white">
                                        {count}
                                      </span>
                                    )}
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleFavoriteLeague?.({
                                          id: `league_${league.name}`,
                                          name: league.name,
                                          sport: sport,
                                          country: country.name
                                        });
                                      }}
                                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isFav ? 'text-red-500 bg-red-500/10' : 'text-slate-600 hover:text-red-500 hover:bg-red-500/10'}`}
                                    >
                                      <i className={`${isFav ? 'fas' : 'far'} fa-heart`}></i>
                                    </button>
                                    <i onClick={() => onSelectLeague(league.name)} className={`fas ${isRTL ? 'fa-chevron-left' : 'fa-chevron-right'} text-slate-800 dark:text-[#232323] group-hover:text-white transition-colors`}></i>
                                  </div>
                                </div>
                              );
                            })}
                            
                            {hasMoreLeagues && (
                              <button
                                onClick={(e) => toggleExpandCountry(e, country.name)}
                                className="w-full mt-2 py-3 px-4 bg-white/5 hover:bg-white/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl border border-dashed border-slate-700 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center justify-center"
                              >
                                <i className={`fas ${isCountryExpanded ? 'fa-minus-circle' : 'fa-plus-circle'} mr-2 opacity-50`}></i>
                                {isCountryExpanded 
                                  ? (tGlobal.verMenos || 'Ver menos') 
                                  : (tGlobal.verMas || 'Ver más')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeagueExplorer;
