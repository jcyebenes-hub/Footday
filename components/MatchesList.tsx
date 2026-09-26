import React, { useState } from 'react';
import { Match, FavoritesState } from '../types';
import TeamLogo from './TeamLogo';
import './MatchesList.css';

interface MatchesListProps {
  matchesByLeague: Record<string, Match[]>;
  onMatchClick?: (match: Match, action: 'live' | 'prediction') => void;
  favorites?: FavoritesState;
}

const MatchesList: React.FC<MatchesListProps> = ({ matchesByLeague, onMatchClick, favorites = { teams: [], leagues: [], matches: [] } }) => {
  const [expandedLeagues, setExpandedLeagues] = useState<Set<string>>(new Set());

  const toggleLeague = (leagueKey: string) => {
    const newExpanded = new Set(expandedLeagues);
    if (newExpanded.has(leagueKey)) {
      newExpanded.delete(leagueKey);
    } else {
      newExpanded.add(leagueKey);
    }
    setExpandedLeagues(newExpanded);
  };

  const getStatusBadge = (match: Match) => {
    const status = match.statusShort?.toUpperCase() || '';
    
    if (['LIVE', '1H', '2H', 'HT', 'ET', 'P', 'BT'].includes(status)) {
      return (
        <span className="badge badge-live flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
          EN VIVO
        </span>
      );
    }
    
    if (['FT', 'AET', 'PEN'].includes(status)) {
      return <span className="badge badge-finished">FINALIZADO</span>;
    }

    if (['PST', 'CANC', 'ABD', 'SUSP', 'INT'].includes(status)) {
      return <span className="badge badge-suspended">SUSPENDIDO</span>;
    }

    return <span className="badge badge-scheduled">{match.time}</span>;
  };

  // Función para obtener código de país (ISO 2 letras)
  const getCountryCode = (country: string): string => {
    const countryCodes: Record<string, string> = {
      'Spain': 'ES',
      'England': 'GB',
      'Germany': 'DE',
      'Italy': 'IT',
      'France': 'FR',
      'Portugal': 'PT',
      'Netherlands': 'NL',
      'Belgium': 'BE',
      'Turkey': 'TR',
      'Brazil': 'BR',
      'Argentina': 'AR',
      'Mexico': 'MX',
      'USA': 'US',
      'World': '🌍',
      'Europe': '🇪🇺',
      'Barbados': 'BB'
    };
    return countryCodes[country] || '';
  };

  const getCountryFlag = (country: string) => {
    const code = getCountryCode(country);
    if (code.startsWith('🌍') || code.startsWith('🇪🇺')) return code;
    if (!code) return '🏴';
    return `https://flagcdn.com/24x18/${code.toLowerCase()}.png`;
  };

  return (
    <div className="matches-list">
      {(Object.entries(matchesByLeague) as [string, Match[]][]).map(([leagueKey, matches]) => {
        const firstMatch = matches[0];
        const isExpanded = expandedLeagues.has(leagueKey);
        const pendingMatches = matches.filter(m => !['FT', 'AET', 'PEN'].includes(m.statusShort || '')).length;
        
        return (
          <div key={leagueKey} className="league-section">
            <div 
              className="league-header" 
              onClick={() => toggleLeague(leagueKey)}
            >
              <div className="league-info">
                <div className="relative">
                  <img 
                    src={firstMatch.leagueLogo} 
                    alt={firstMatch.league} 
                    className="league-logo"
                    onError={(e) => {
                      if (firstMatch.leagueId) {
                        e.currentTarget.src = `https://media.api-sports.io/football/leagues/${firstMatch.leagueId}.png`;
                      } else {
                        e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/53/53283.png';
                      }
                    }}
                  />
                  {favorites.leagues.some(l => l.name === firstMatch.league) && (
                    <div className="absolute -top-1 -right-1 text-red-500 text-[8px] bg-white dark:bg-black rounded-full w-3 h-3 flex items-center justify-center shadow-sm">
                      <i className="fas fa-heart"></i>
                    </div>
                  )}
                </div>
                <div>
                  <h3>{firstMatch.league}</h3>
                  <div className="league-country">
                    {typeof getCountryFlag(firstMatch.country) === 'string' && 
                     getCountryFlag(firstMatch.country).startsWith('http') ? (
                      <img 
                        src={getCountryFlag(firstMatch.country)} 
                        alt={firstMatch.country}
                        style={{ width: 20, height: 15, marginRight: 6 }}
                      />
                    ) : (
                      <span style={{ marginRight: 6 }}>{getCountryFlag(firstMatch.country)}</span>
                    )}
                    {firstMatch.country}
                  </div>
                </div>
              </div>
              <div className="league-stats">
                <div className="match-count">
                  {pendingMatches > 0 && (
                    <span className="pending-count">{pendingMatches}</span>
                  )}
                  <span className="total-count">{matches.length} partidos</span>
                </div>
                <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>
                  ▼
                </span>
              </div>
            </div>

            {isExpanded && (
              <div className="matches-container">
                {matches.map((match) => {
                  const isMatchFav = favorites.matches.some(m => m.id === match.id);
                  const isHomeFav = favorites.teams.some(t => t.id === `team_${match.homeTeam}`);
                  const isAwayFav = favorites.teams.some(t => t.id === `team_${match.awayTeam}`);

                  return (
                    <div 
                      key={match.id} 
                      className="match-card relative"
                      onClick={() => {
                        const isLive = ['LIVE', '1H', '2H', 'HT', 'ET', 'P', 'BT'].includes(match.statusShort?.toUpperCase() || '');
                        onMatchClick && onMatchClick(match, isLive ? 'live' : 'prediction');
                      }}
                    >
                      {(isMatchFav || isHomeFav || isAwayFav) && (
                        <div className="absolute top-2 right-2 text-red-500 text-[10px]">
                          <i className="fas fa-heart"></i>
                        </div>
                      )}
                      <div className="match-status">
                        {getStatusBadge(match)}
                      </div>
                      
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
                        </div>
                        
                        <div className="vs-divider">VS</div>
                        
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
                        </div>
                      </div>

                    {match.odds && (
                      <div className="match-odds-summary">
                        <div className="odds-badge">
                          <span className="odds-label">1</span>
                          <span className="odds-value">{match.odds.home?.toFixed(2)}</span>
                        </div>
                        {match.odds.draw && (
                          <div className="odds-badge">
                            <span className="odds-label">X</span>
                            <span className="odds-value">{match.odds.draw?.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="odds-badge">
                          <span className="odds-label">2</span>
                          <span className="odds-value">{match.odds.away?.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <button 
                      className="analyze-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMatchClick && onMatchClick(match, 'prediction');
                      }}
                    >
                      VER PRONÓSTICO
                    </button>
                  </div>
                )})}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MatchesList;
