
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SearchForm from './components/SearchForm';
import ResultsDisplay from './components/ResultsDisplay';
import MatchDetail from './components/MatchDetail';
import SubscriptionPage from './components/SubscriptionPage';
import LeagueExplorer from './components/LeagueExplorer';
import LoadingOverlay from './components/LoadingOverlay';
import SavedPicksView from './components/SavedPicksView';
import FavoritesView from './components/FavoritesView';
import LiveMatchView from './components/LiveMatchView';
import { SearchParams, MatchResponse, Match, ViewState, User, Plan, Language, Sport, ThemeMode, SavedPick, FavoritesState, FavoriteTeam, FavoriteLeague, FavoriteMatch } from './types';
import { fetchMatches, fetchBasketballMatchesOnly } from './services/geminiService';
import { translations } from './utils/translations';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>('home');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showLiveMatch, setShowLiveMatch] = useState(false);
  const [liveMatch, setLiveMatch] = useState<Match | null>(null);
  
  const getSpainDate = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now);
  };

  const [searchDate, setSearchDate] = useState(getSpainDate());
  const [searchSport, setSearchSport] = useState<Sport>('football');
  const [searchQuery, setSearchQuery] = useState('');

  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('footyday_lang');
    return (saved as Language) || 'es';
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('pickmaster_theme');
    return (saved as ThemeMode) || 'auto';
  });

  const [savedPicks, setSavedPicks] = useState<SavedPick[]>(() => {
    const saved = localStorage.getItem('pickmaster_saved_picks');
    return saved ? JSON.parse(saved) : [];
  });

  const [favorites, setFavorites] = useState<FavoritesState>(() => {
    const saved = localStorage.getItem('pickmaster_favorites');
    return saved ? JSON.parse(saved) : { teams: [], leagues: [], matches: [] };
  });

  const t = translations[lang];
  const isRTL = lang === 'ar';

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('footyday_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (mode: 'light' | 'dark') => {
      root.classList.remove('light', 'dark');
      root.classList.add(mode);
      localStorage.setItem('pickmaster_theme', theme);
    };

    if (theme === 'auto') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(systemDark ? 'dark' : 'light');
    } else {
      applyTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('footyday_lang', lang);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, isRTL]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('footyday_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('footyday_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('pickmaster_saved_picks', JSON.stringify(savedPicks));
  }, [savedPicks]);

  useEffect(() => {
    localStorage.setItem('pickmaster_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const handleSearch = async (params: Omit<SearchParams, 'lang'>) => {
    setIsLoading(true);
    setError(null);
    setData(null);
    setView('results');

    try {
      let result;
      if (params.sport === 'basketball') {
        result = await fetchBasketballMatchesOnly({ ...params, lang });
      } else {
        result = await fetchMatches({ ...params, lang });
      }
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExploreLeagueSelect = (leagueName: string) => {
    setSearchQuery(leagueName);
    const params = {
      date: searchDate,
      sport: searchSport,
      query: leagueName
    };
    handleSearch(params);
  };

  const handleMatchClick = (match: Match, action: 'live' | 'prediction' = 'prediction') => {
    if (action === 'live') {
      setLiveMatch(match);
      setShowLiveMatch(true);
    } else {
      setSelectedMatch(match);
      setView('detail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToResults = () => {
    setSelectedMatch(null);
    setView(data ? 'results' : 'home');
  };

  const handleSubscribe = (plan: Plan) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const durationMs = plan.durationDays * 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + durationMs;
    const updatedUser: User = { ...user, subscription: { planId: plan.id, expiresAt: expiresAt } };
    setUser(updatedUser);
    setView('home'); 
  };

  const handleSavePick = (pick: SavedPick) => {
    setSavedPicks(prev => {
      const exists = prev.some(p => p.id === pick.id);
      if (exists) return prev;
      return [pick, ...prev];
    });
  };

  const handleRemoveSavedPick = (id: string) => {
    setSavedPicks(prev => prev.filter(p => p.id !== id));
  };

  const handleViewSavedPick = (pick: SavedPick) => {
    setSelectedMatch(pick.match);
    setView('detail');
  };

  const toggleFavoriteTeam = (team: FavoriteTeam) => {
    setFavorites(prev => {
      const exists = prev.teams.some(t => t.id === team.id);
      if (exists) {
        return { ...prev, teams: prev.teams.filter(t => t.id !== team.id) };
      }
      return { ...prev, teams: [team, ...prev.teams] };
    });
  };

  const toggleFavoriteLeague = (league: FavoriteLeague) => {
    setFavorites(prev => {
      const exists = prev.leagues.some(l => l.id === league.id);
      if (exists) {
        return { ...prev, leagues: prev.leagues.filter(l => l.id !== league.id) };
      }
      return { ...prev, leagues: [league, ...prev.leagues] };
    });
  };

  const toggleFavoriteMatch = (match: Match) => {
    setFavorites(prev => {
      const exists = prev.matches.some(m => m.id === match.id);
      if (exists) {
        return { ...prev, matches: prev.matches.filter(m => m.id !== match.id) };
      }
      const newFav: FavoriteMatch = {
        id: match.id,
        match,
        savedAt: Date.now()
      };
      return { ...prev, matches: [newFav, ...prev.matches] };
    });
  };

  const mockLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    const email = target[0].value;
    
    let newUser: User = { 
      id: 'usr_' + Date.now(), 
      email: email, 
      name: (email || '').split('@')[0]?.toUpperCase() || 'USER'
    };

    if (email === 'admin@picks.pro') {
      newUser = {
        ...newUser,
        name: 'Administrator',
        subscription: {
          planId: 'monthly',
          expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000)
        }
      };
    }

    setUser(newUser);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setUser(null);
    setView('home');
  };

  const handleSavedPicksClick = () => {
    if (!user) {
      setView('subscription');
    } else {
      setView(view === 'savedPicks' ? (data ? 'results' : 'home') : 'savedPicks');
    }
  };

  const handleBackFromSavedPicks = () => {
    setView(data ? 'results' : 'home');
  };

  const handleFavoritesClick = () => {
    setView(view === 'favorites' ? (data ? 'results' : 'home') : 'favorites');
  };

  const isPro = user?.subscription && user.subscription.expiresAt > Date.now();
  const displayTitle = isPro ? t.titlePro : t.title;
  const displaySubtitle = isPro ? t.subtitlePro : t.subtitle;

  return (
    <div className={`min-h-screen transition-colors duration-300 font-['Inter'] ${isRTL ? 'text-right' : 'text-left'} bg-slate-50 dark:bg-black`}>
      <Header 
        currentLang={lang} 
        onLanguageChange={setLang} 
        currentTheme={theme}
        onThemeChange={setTheme}
      />
      
      <LoadingOverlay isLoading={isLoading} message={t.loadingMatches} sport={searchSport} />

      <main className="container mx-auto px-4 py-8 max-w-4xl flex-grow">
        {(view === 'home' || view === 'results' || view === 'explore' || view === 'savedPicks') && (
          <>
            <section className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-4xl font-black text-[#001F3F] dark:text-white tracking-tight mb-2 uppercase">{displayTitle}</h2>
                  <p className="text-gray-400 dark:text-[#C8C8C8] font-medium max-w-lg">{displaySubtitle}</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button 
                    onClick={handleFavoritesClick}
                    className={`group relative flex items-center space-x-3 px-6 py-3.5 rounded-2xl transition-all duration-300 font-black text-xs uppercase tracking-widest shadow-xl overflow-hidden ${
                      view === 'favorites' 
                        ? 'bg-red-600 text-white shadow-red-600/30' 
                        : 'bg-white dark:bg-[#121212] text-red-500 border border-red-100 dark:border-[#232323] hover:shadow-red-500/10 hover:scale-[1.03] active:scale-95'
                    }`}
                  >
                    <div className="flex items-center space-x-2 relative z-10">
                      <i className={`fas fa-heart ${view === 'favorites' ? '' : 'animate-pulse'}`}></i>
                      <span>{t.favoritesTitle || 'FAVORITOS'}</span>
                    </div>
                    {(favorites.teams.length + favorites.leagues.length + favorites.matches.length) > 0 && (
                      <span className={`relative z-10 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] ml-2 ${view === 'favorites' ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
                        {favorites.teams.length + favorites.leagues.length + favorites.matches.length}
                      </span>
                    )}
                  </button>

                  <button 
                    onClick={handleSavedPicksClick}
                    className={`group relative flex items-center space-x-3 px-6 py-3.5 rounded-2xl transition-all duration-300 font-black text-xs uppercase tracking-widest shadow-xl overflow-hidden ${
                      view === 'savedPicks' 
                        ? 'bg-amber-600 text-white shadow-amber-600/30' 
                        : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white hover:shadow-amber-500/40 hover:scale-[1.03] active:scale-95'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                    
                    <div className="flex items-center space-x-2 relative z-10">
                      <i className={`fas ${view === 'savedPicks' ? 'fa-bookmark' : 'fa-crown'} ${view !== 'savedPicks' ? 'animate-pulse' : ''}`}></i>
                      <span>{t.savedPicksTitle.replace(/=/g, '').trim()}</span>
                    </div>

                    {savedPicks.length > 0 && (
                      <span className="relative z-10 bg-white/20 backdrop-blur-md text-white border border-white/30 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] ml-2">
                        {savedPicks.length}
                      </span>
                    )}
                  </button>

                  {user ? (
                    <div className="flex items-center space-x-3 bg-white dark:bg-[#121212] px-5 py-3 rounded-[1.5rem] border border-gray-100 dark:border-[#232323] shadow-sm relative group">
                      <div className="w-10 h-10 bg-[#001F3F] dark:bg-[#FF3B30] rounded-xl flex items-center justify-center text-[#00FF00] dark:text-white font-black text-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div className={`flex flex-col ${isRTL ? 'mr-3' : 'ml-1'}`}>
                        <span className="text-xs font-black text-gray-900 dark:text-white leading-none">{user.name}</span>
                        {user.subscription && user.subscription.expiresAt > Date.now() ? (
                          <span className="text-[10px] text-emerald-600 dark:text-[#00FF00] font-bold uppercase mt-1 tracking-wider">{t.suscripcionPro}</span>
                        ) : (
                          <span className="text-[10px] text-gray-400 dark:text-[#6E6E6E] font-bold uppercase mt-1 tracking-wider">{t.gratis}</span>
                        )}
                      </div>
                      <button 
                        onClick={handleLogout}
                        className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-lg transition-opacity"
                        title="Cerrar sesión"
                      >
                        <i className="fas fa-sign-out-alt"></i>
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowAuthModal(true)} className="bg-white dark:bg-[#121212] px-6 py-3 rounded-2xl border border-gray-100 dark:border-[#232323] text-xs font-black text-[#001F3F] dark:text-white hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors shadow-sm">
                      {t.acceder}
                    </button>
                  )}
                </div>
              </div>
              
              <SearchForm 
                date={searchDate}
                setDate={setSearchDate}
                sport={searchSport}
                setSport={(s) => { setSearchSport(s); setView('home'); }}
                query={searchQuery}
                setQuery={setSearchQuery}
                onSearch={handleSearch} 
                onExplore={() => setView(view === 'explore' ? 'home' : 'explore')} 
                isLoading={isLoading} 
                lang={lang} 
              />
            </section>

            {view === 'savedPicks' && (
              <SavedPicksView 
                picks={savedPicks} 
                onRemove={handleRemoveSavedPick} 
                onView={handleViewSavedPick}
                onBack={handleBackFromSavedPicks}
                lang={lang} 
                currentUser={user}
              />
            )}

            {view === 'favorites' && (
              <FavoritesView 
                favorites={favorites}
                onRemoveTeam={toggleFavoriteTeam}
                onRemoveLeague={toggleFavoriteLeague}
                onRemoveMatch={(m) => toggleFavoriteMatch(m.match)}
                onViewMatch={(m) => { setSelectedMatch(m.match); setView('detail'); }}
                onSelectLeague={handleExploreLeagueSelect}
                onBack={() => setView(data ? 'results' : 'home')}
                lang={lang}
                currentUser={user}
              />
            )}

            {view === 'explore' && (
              <div className="mt-4 animate-in slide-in-from-top-4 duration-500">
                <LeagueExplorer 
                  onBack={() => setView('home')} 
                  onSelectLeague={handleExploreLeagueSelect}
                  lang={lang} 
                  sport={searchSport}
                  date={searchDate}
                  favorites={favorites.leagues}
                  onToggleFavoriteLeague={toggleFavoriteLeague}
                />
              </div>
            )}

            {view === 'results' && !isLoading && (
              <ResultsDisplay 
                data={data} 
                isLoading={false} 
                error={error} 
                onMatchClick={handleMatchClick}
                lang={lang}
              />
            )}
          </>
        )}

        {view === 'detail' && selectedMatch && (
          <MatchDetail 
            match={selectedMatch} 
            onBack={handleBackToResults} 
            currentUser={user}
            onOpenSubscription={() => setView('subscription')}
            lang={lang}
            savedPicks={savedPicks}
            onSavePick={handleSavePick}
            favorites={favorites}
            onToggleFavoriteTeam={toggleFavoriteTeam}
            onToggleFavoriteMatch={toggleFavoriteMatch}
          />
        )}

        {view === 'subscription' && (
          <SubscriptionPage 
            onSubscribe={handleSubscribe} 
            onBack={handleBackToResults}
            currentUser={user}
            lang={lang}
          />
        )}
      </main>

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001F3F]/80 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#121212] rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl relative overflow-hidden text-slate-900 dark:text-white">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500 dark:bg-[#FF3B30]"></div>
            <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <i className="fas fa-times text-xl"></i>
            </button>
            <div className="flex justify-center mb-6">
              <i className="fas fa-crown text-5xl text-emerald-500 dark:text-[#FF3B30]"></i>
            </div>
            <h3 className="text-2xl font-black text-[#001F3F] dark:text-white text-center mb-2">{t.acceder}</h3>
            <p className="text-gray-400 dark:text-[#6E6E6E] text-center text-sm font-medium mb-8">
              Tip: Usa <span className="text-emerald-600 dark:text-[#00FF00] font-bold">admin@picks.pro</span> para acceso administrador.
            </p>
            <form onSubmit={mockLogin} className="space-y-4">
              <input 
                type="email" 
                placeholder="Email" 
                autoComplete="email"
                className="w-full p-4 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#232323] rounded-2xl outline-none focus:border-emerald-500 dark:focus:border-[#FF3B30] font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-[#6E6E6E]" 
                required 
              />
              <input 
                type="password" 
                placeholder="Contraseña" 
                autoComplete="current-password"
                className="w-full p-4 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#232323] rounded-2xl outline-none focus:border-emerald-500 dark:focus:border-[#FF3B30] font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-[#6E6E6E]" 
                required 
              />
              <button type="submit" className="w-full py-4 bg-[#001F3F] dark:bg-[#FF3B30] text-white font-black rounded-2xl shadow-xl hover:opacity-90 transition-all active:scale-95">
                LOG IN
              </button>
            </form>
          </div>
        </div>
      )}

      {showLiveMatch && liveMatch && (
        <LiveMatchView 
          match={liveMatch} 
          onClose={() => setShowLiveMatch(false)} 
          lang={lang} 
        />
      )}

      <footer className="bg-white dark:bg-black border-t border-gray-100 dark:border-[#232323] py-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400 dark:text-[#6E6E6E] text-xs font-bold uppercase tracking-[0.3em]">
            © 2025 PICKMASTER PRO • IA DRIVEN SPORTS INSIGHTS
          </p>
          <p className="text-gray-300 dark:text-[#3A3A3A] text-[10px] font-bold uppercase tracking-[0.2em] mt-2">
            Datos: API-Football • football-data.org • ESPN • The Odds API
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
