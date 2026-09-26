
import React from 'react';
import { FavoritesState, FavoriteTeam, FavoriteLeague, FavoriteMatch, Language, User } from '../types';
import { translations } from '../utils/translations';
import TeamLogo from './TeamLogo';

interface FavoritesViewProps {
  favorites: FavoritesState;
  onRemoveTeam: (team: FavoriteTeam) => void;
  onRemoveLeague: (league: FavoriteLeague) => void;
  onRemoveMatch: (match: FavoriteMatch) => void;
  onViewMatch: (match: FavoriteMatch) => void;
  onSelectLeague: (leagueName: string) => void;
  onBack: () => void;
  lang: Language;
  currentUser: User | null;
}

const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  onRemoveTeam,
  onRemoveLeague,
  onRemoveMatch,
  onViewMatch,
  onSelectLeague,
  onBack,
  lang,
  currentUser
}) => {
  const t = translations[lang];
  const isRTL = lang === 'ar';

  const hasFavorites = favorites.teams.length > 0 || favorites.leagues.length > 0 || favorites.matches.length > 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors font-black text-xs uppercase tracking-widest"
        >
          <i className={`fas ${isRTL ? 'fa-arrow-right' : 'fa-arrow-left'}`}></i>
          <span>{t.volver}</span>
        </button>
        <h2 className="text-2xl font-black text-[#001F3F] dark:text-white uppercase tracking-tighter italic">
          {t.favoritesTitle || 'MIS FAVORITOS'}
        </h2>
        <div className="w-10"></div>
      </div>

      {!hasFavorites ? (
        <div className="bg-white dark:bg-[#121212] rounded-[2.5rem] p-16 text-center border border-gray-100 dark:border-[#232323] shadow-xl">
          <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-heart text-gray-200 dark:text-gray-800 text-3xl"></i>
          </div>
          <p className="text-gray-400 dark:text-[#6E6E6E] font-bold uppercase tracking-widest text-sm">
            {t.noFavorites || 'Aún no tienes favoritos guardados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* LEAGUES */}
          {favorites.leagues.length > 0 && (
            <section>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                  <i className="fas fa-trophy text-xs"></i>
                </div>
                <h3 className="text-lg font-black text-[#001F3F] dark:text-white uppercase tracking-tight">
                  {t.favoriteLeagues || 'Competiciones'}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.leagues.map((league) => (
                  <div 
                    key={league.id}
                    className="bg-white dark:bg-[#121212] p-5 rounded-3xl border border-gray-100 dark:border-[#232323] shadow-sm hover:shadow-md transition-all group flex items-center justify-between"
                  >
                    <div 
                      className="flex items-center space-x-4 cursor-pointer flex-1"
                      onClick={() => onSelectLeague(league.name)}
                    >
                      <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-white/5 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <i className="fas fa-trophy text-lg"></i>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 dark:text-white">{league.name}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{league.country}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemoveLeague(league)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                    >
                      <i className="fas fa-heart text-red-500"></i>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TEAMS */}
          {favorites.teams.length > 0 && (
            <section>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                  <i className="fas fa-shield-alt text-xs"></i>
                </div>
                <h3 className="text-lg font-black text-[#001F3F] dark:text-white uppercase tracking-tight">
                  {t.favoriteTeams || 'Equipos'}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.teams.map((team) => (
                  <div 
                    key={team.id}
                    className="bg-white dark:bg-[#121212] p-5 rounded-3xl border border-gray-100 dark:border-[#232323] shadow-sm hover:shadow-md transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <TeamLogo logoUrl={team.logo || ''} teamName={team.name} size={48} />
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 dark:text-white">{team.name}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{team.sport}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemoveTeam(team)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                    >
                      <i className="fas fa-heart text-red-500"></i>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* MATCHES */}
          {favorites.matches.length > 0 && (
            <section>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                  <i className="fas fa-calendar-check text-xs"></i>
                </div>
                <h3 className="text-lg font-black text-[#001F3F] dark:text-white uppercase tracking-tight">
                  {t.favoriteMatches || 'Partidos'}
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {favorites.matches.map((fav) => (
                  <div 
                    key={fav.id}
                    className="bg-white dark:bg-[#121212] p-6 rounded-[2rem] border border-gray-100 dark:border-[#232323] shadow-sm hover:shadow-md transition-all group flex items-center justify-between"
                  >
                    <div 
                      className="flex items-center justify-between flex-1 cursor-pointer"
                      onClick={() => onViewMatch(fav)}
                    >
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center -space-x-3">
                          <TeamLogo logoUrl={fav.match.homeLogo || ''} teamName={fav.match.homeTeam} size={40} />
                          <TeamLogo logoUrl={fav.match.awayLogo || ''} teamName={fav.match.awayTeam} size={40} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900 dark:text-white">
                            {fav.match.homeTeam} vs {fav.match.awayTeam}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {fav.match.league} • {fav.match.time}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemoveMatch(fav)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all ml-4"
                    >
                      <i className="fas fa-heart text-red-500"></i>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default FavoritesView;
