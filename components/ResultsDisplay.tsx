
import React, { useState, useMemo } from 'react';
import { MatchResponse, Match, Language, FavoritesState } from '../types';
import { translations } from '../utils/translations';
import TeamLogo from './TeamLogo';
import MatchesList from './MatchesList';

interface ResultsDisplayProps {
  data: MatchResponse | null;
  isLoading: boolean;
  error: string | null;
  onMatchClick: (match: Match, action: 'live' | 'prediction') => void;
  lang: Language;
  favorites?: FavoritesState;
}

type MatchFilter = 'all' | 'live' | 'scheduled' | 'finished' | 'suspended';

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ data, isLoading, error, onMatchClick, lang, favorites = { teams: [], leagues: [], matches: [] } }) => {
  const [activeFilter, setActiveFilter] = useState<MatchFilter>('all');
  const t = translations[lang];
  const isRTL = lang === 'ar';

  const filterMatches = (match: Match): boolean => {
    const status = match.statusShort?.toUpperCase() || '';
    
    switch (activeFilter) {
      case 'live':
        return ['LIVE', '1H', '2H', 'HT', 'ET', 'P', 'BT'].includes(status);
      case 'scheduled':
        return ['TBD', 'NS'].includes(status) || (!status && !!match.time);
      case 'finished':
        return ['FT', 'AET', 'PEN'].includes(status);
      case 'suspended':
        return ['PST', 'CANC', 'ABD', 'SUSP', 'INT'].includes(status);
      default:
        return true;
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return null;
    
    const newGroups = data.groups.map(group => ({
      ...group,
      matches: group.matches.filter(filterMatches)
    })).filter(group => group.matches.length > 0);

    return {
      ...data,
      groups: newGroups
    };
  }, [data, activeFilter]);

  const renderFormDots = (formString: string | undefined) => {
    if (!formString) return null;
    
    // Normalizar a mayúsculas y filtrar solo W, D, L
    const results = formString.toUpperCase().split('').filter(c => ['W', 'D', 'L'].includes(c));
    
    return (
      <div className="flex space-x-1 mt-1">
        {results.slice(0, 5).map((res, i) => {
          let color = 'bg-gray-300';
          if (res === 'W') color = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
          if (res === 'D') color = 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]';
          if (res === 'L') color = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]';
          
          return (
            <div 
              key={i} 
              className={`w-2.5 h-2.5 rounded-full ${color} flex items-center justify-center text-[6px] text-white font-bold transition-all hover:scale-125`}
              title={res === 'W' ? 'Victoria' : res === 'D' ? 'Empate' : 'Derrota'}
            >
              {res}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center p-12 bg-white dark:bg-[#121212] rounded-xl shadow-sm animate-pulse border dark:border-[#232323]">
        <div className="w-16 h-16 border-4 border-emerald-500 dark:border-[#FF3B30] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-[#C8C8C8] font-medium text-center">{t.loadingMatches}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl text-red-700 dark:text-red-400 flex items-start space-x-3">
        <i className="fas fa-exclamation-circle mt-1"></i>
        <p>{error}</p>
      </div>
    );
  }

  if (!data || !data.groups || data.groups.length === 0) {
    return (
      <div className="mt-8 p-12 bg-white dark:bg-[#121212] rounded-[2.5rem] border border-gray-100 dark:border-[#232323] text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-calendar-times text-4xl text-gray-300 dark:text-[#232323]"></i>
        </div>
        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase mb-2">Sin actividad oficial</h3>
        <p className="text-gray-500 dark:text-[#6E6E6E] font-medium max-w-sm mx-auto leading-relaxed">
          {lang === 'es' 
            ? "No hay partidos programados para esta competición en la fecha seleccionada."
            : t.noMatches || "No games scheduled for this date."}
        </p>
      </div>
    );
  }

  // Convert MatchGroup[] to Record<string, Match[]> for MatchesList
  const matchesByLeague: Record<string, Match[]> = {};
  data?.groups?.forEach(group => {
    const key = `${group.country}-${group.league}`;
    matchesByLeague[key] = group.matches;
  });

  // Check if it's football (we assume if the first match is football, they all are for this display)
  const isFootball = data?.groups?.[0]?.matches?.[0]?.sport === 'football';

  const filters = [
    { id: 'all', label: 'Todos', icon: 'fa-list-ul', color: 'bg-gray-500' },
    { id: 'live', label: 'En Vivo', icon: 'fa-broadcast-tower', color: 'bg-red-500' },
    { id: 'scheduled', label: 'Próximos', icon: 'fa-clock', color: 'bg-emerald-500' },
    { id: 'finished', label: 'Finalizados', icon: 'fa-check-circle', color: 'bg-blue-500' },
    { id: 'suspended', label: 'Suspendidos', icon: 'fa-pause-circle', color: 'bg-amber-500' },
  ];

  const renderFilterBar = () => (
    <div className="flex overflow-x-auto pb-2 mb-6 gap-2 no-scrollbar">
      {filters.map((f) => {
        const isActive = activeFilter === f.id;
        return (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id as MatchFilter)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
              isActive 
                ? `${f.color} text-white border-transparent shadow-lg scale-105` 
                : 'bg-white dark:bg-[#121212] text-gray-500 dark:text-gray-400 border-gray-100 dark:border-[#232323] hover:border-gray-300'
            }`}
          >
            <i className={`fas ${f.icon} ${isActive ? 'text-white' : ''}`}></i>
            {f.label}
          </button>
        );
      })}
    </div>
  );

  if (isFootball) {
    const matchesByLeague: Record<string, Match[]> = {};
    filteredData?.groups?.forEach(group => {
      const key = `${group.country}-${group.league}`;
      matchesByLeague[key] = group.matches;
    });

    const totalMatches = filteredData?.groups?.reduce((acc, g) => acc + g.matches.length, 0) || 0;

    return (
      <div className="mt-8 space-y-4 pb-12 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between px-2 gap-4 mb-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <i className="fas fa-futbol text-emerald-500 dark:text-[#FF3B30]"></i>
            Partidos de Fútbol
          </h2>
          <span className="text-sm text-gray-500 bg-gray-100 dark:bg-[#1A1A1A] px-3 py-1 rounded-full font-bold w-fit">
            {totalMatches} encuentros
          </span>
        </div>

        {renderFilterBar()}
        
        {totalMatches > 0 ? (
          <MatchesList 
            matchesByLeague={matchesByLeague} 
            onMatchClick={(match, action) => onMatchClick({ ...match, league: match.league, country: match.country }, action)}
            favorites={favorites}
          />
        ) : (
          <div className="py-20 text-center bg-white dark:bg-[#121212] rounded-3xl border border-dashed border-gray-200 dark:border-[#232323]">
            <i className="fas fa-search text-4xl text-gray-200 dark:text-[#232323] mb-4"></i>
            <p className="text-gray-500 dark:text-[#6E6E6E] font-medium">No hay partidos con este estado</p>
          </div>
        )}

        {data.sources.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-100 dark:border-[#232323]">
            <h4 className="text-[10px] font-black text-gray-400 dark:text-[#6E6E6E] uppercase tracking-widest mb-4">Fuentes consultadas:</h4>
            <div className="flex flex-wrap gap-2">
              {data.sources.map((source, i) => source.web && (
                <a 
                  key={i} 
                  href={source.web.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] bg-white dark:bg-[#121212] px-3 py-1.5 rounded-full border border-gray-100 dark:border-[#232323] text-gray-500 dark:text-[#C8C8C8] hover:text-[#001F3F] dark:hover:text-[#FF3B30] hover:border-emerald-200 transition-all font-bold"
                >
                  {source.web.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between px-2 gap-4 mb-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="fas fa-basketball-ball text-orange-500 dark:text-[#FF9500]"></i>
          Partidos de Baloncesto
        </h2>
        <span className="text-sm text-gray-500 bg-gray-100 dark:bg-[#1A1A1A] px-3 py-1 rounded-full font-bold w-fit">
          {filteredData?.groups?.reduce((acc, g) => acc + g.matches.length, 0) || 0} encuentros
        </span>
      </div>

      {renderFilterBar()}

      {filteredData && filteredData.groups.length > 0 ? (
        filteredData.groups.map((group, idx) => {
          return (
            <div key={idx} className="space-y-4">
              <div className={`flex items-center space-x-2 border-b border-gray-200 dark:border-[#232323] pb-2 ${isRTL ? 'space-x-reverse' : ''}`}>
                <span className="bg-gray-100 dark:bg-[#1A1A1A] text-gray-600 dark:text-[#C8C8C8] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  {group.country}
                </span>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">{group.league}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.matches.map((match, mIdx) => {
                  const isMatchFav = favorites.matches.some(m => m.id === match.id);
                  const isHomeFav = favorites.teams.some(t => t.id === `team_${match.homeTeam}`);
                  const isAwayFav = favorites.teams.some(t => t.id === `team_${match.awayTeam}`);
                  const isLeagueFav = favorites.leagues.some(l => l.name === group.league);

                  return (
                    <div 
                      key={match.id}
                      onClick={() => onMatchClick({ ...match, league: group.league, country: group.country }, 'live')}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col border-l-4 shadow-sm relative ${
                        mIdx % 2 === 0 ? 'bg-white dark:bg-[#0D0D0D]' : 'bg-gray-50/30 dark:bg-[#1A1A1A]'
                      } ${
                        match.sport === 'football' 
                          ? 'hover:border-emerald-200 dark:hover:border-emerald-900/40 border-l-emerald-500 dark:border-l-[#FF3B30]' 
                          : 'hover:border-orange-200 dark:hover:border-orange-900/40 border-l-orange-500 dark:border-l-[#FF9500]'
                      } border-gray-100 dark:border-[#232323] hover:shadow-lg ${isRTL ? 'border-l-0 border-r-4' : ''}`}
                    >
                      {(isMatchFav || isHomeFav || isAwayFav || isLeagueFav) && (
                        <div className="absolute top-3 right-3 text-red-500 text-[10px]">
                          <i className="fas fa-heart"></i>
                        </div>
                      )}
                      <div className="match-content">
                        <div className="team home-team">
                          <TeamLogo 
                            logoUrl={match.homeLogo || ''} 
                            teamName={match.homeTeam} 
                            size={40} 
                          />
                          <span className={`team-name ${isHomeFav ? 'text-red-500 font-black' : ''}`}>{match.homeTeam}</span>
                          {match.score && (
                            <span className="score">{match.score.split(' - ')[0]}</span>
                          )}
                          {renderFormDots(match.homeForm)}
                        </div>
                        
                        <div className="vs-divider">
                          {match.status === 'finished' ? (
                            <span className="text-[10px] font-black text-red-500 dark:text-[#FF3B30] bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded uppercase tracking-widest">
                              {t.final}
                            </span>
                          ) : (
                            <span className="font-black text-[10px] opacity-50">{match.time}</span>
                          )}
                        </div>

                        <div className="team away-team">
                          <TeamLogo 
                            logoUrl={match.awayLogo || ''} 
                            teamName={match.awayTeam} 
                            size={40} 
                          />
                          <span className={`team-name ${isAwayFav ? 'text-red-500 font-black' : ''}`}>{match.awayTeam}</span>
                          {match.score && (
                            <span className="score">{match.score.split(' - ')[1]}</span>
                          )}
                          {renderFormDots(match.awayForm)}
                        </div>
                      </div>

                      {match.briefStatus && !match.briefStatus.toLowerCase().includes('programado') && (
                        <div className="mt-2 pt-3 border-t border-gray-50 dark:border-[#232323] flex items-start space-x-2 text-[10px] font-medium text-gray-400 dark:text-[#6E6E6E]">
                          <i className="fas fa-info-circle mt-0.5 opacity-40"></i>
                          <p className="flex-1 italic">{match.briefStatus}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      ) : (
        <div className="py-20 text-center bg-white dark:bg-[#121212] rounded-3xl border border-dashed border-gray-200 dark:border-[#232323]">
          <i className="fas fa-search text-4xl text-gray-200 dark:text-[#232323] mb-4"></i>
          <p className="text-gray-500 dark:text-[#6E6E6E] font-medium">No hay partidos con este estado</p>
        </div>
      )}

      {data.sources.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-[#232323]">
          <h4 className="text-[10px] font-black text-gray-400 dark:text-[#6E6E6E] uppercase tracking-widest mb-4">Fuentes consultadas:</h4>
          <div className="flex flex-wrap gap-2">
            {data.sources.map((source, i) => source.web && (
              <a 
                key={i} 
                href={source.web.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] bg-white dark:bg-[#121212] px-3 py-1.5 rounded-full border border-gray-100 dark:border-[#232323] text-gray-500 dark:text-[#C8C8C8] hover:text-[#001F3F] dark:hover:text-[#FF3B30] hover:border-emerald-200 transition-all font-bold"
              >
                {source.web.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;
