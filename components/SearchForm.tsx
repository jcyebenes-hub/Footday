
import React from 'react';
import { SearchParams, Sport, Language } from '../types';
import { translations } from '../utils/translations';

interface SearchFormProps {
  onSearch: (params: Omit<SearchParams, 'lang'>) => void;
  onExplore: () => void;
  isLoading: boolean;
  lang: Language;
  date: string;
  setDate: (date: string) => void;
  sport: Sport;
  setSport: (sport: Sport) => void;
  query: string;
  setQuery: (query: string) => void;
}

const SearchForm: React.FC<SearchFormProps> = ({ 
  onSearch, 
  onExplore, 
  isLoading, 
  lang,
  date,
  setDate,
  sport,
  setSport,
  query,
  setQuery
}) => {
  const t = translations[lang];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ date, sport, query });
  };

  return (
    <div className="bg-white dark:bg-[#121212] p-6 rounded-[2rem] shadow-xl border border-gray-100 dark:border-[#232323] animate-in fade-in duration-700 transition-colors">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Sport Selector */}
            <div className="flex bg-gray-50 dark:bg-[#0D0D0D] p-1.5 rounded-2xl border border-gray-100 dark:border-[#232323]">
              <button
                type="button"
                onClick={() => setSport('football')}
                className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${
                  sport === 'football' ? 'bg-[#001F3F] dark:bg-[#FF3B30] text-white shadow-lg' : 'text-gray-400 dark:text-[#6E6E6E] hover:text-gray-600 dark:hover:text-[#C8C8C8]'
                }`}
              >
                <i className="fas fa-futbol"></i>
                <span>{t.football}</span>
              </button>
              <button
                type="button"
                onClick={() => setSport('basketball')}
                className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${
                  sport === 'basketball' ? 'bg-orange-500 dark:bg-[#FF9500] text-white shadow-lg' : 'text-gray-400 dark:text-[#6E6E6E] hover:text-gray-600 dark:hover:text-[#C8C8C8]'
                }`}
              >
                <i className="fas fa-basketball-ball"></i>
                <span>{t.basketball}</span>
              </button>
            </div>

            {/* League Input */}
            <div className="flex-1 relative group">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 dark:text-[#6E6E6E] group-focus-within:text-emerald-500 dark:group-focus-within:text-[#FF3B30] transition-colors">
                <i className="fas fa-search"></i>
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.leaguePlaceholder}
                className="block w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#232323] rounded-2xl focus:ring-4 focus:ring-emerald-500/10 dark:focus:ring-[#FF3B30]/10 focus:border-emerald-500 dark:focus:border-[#FF3B30] outline-none transition-all font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-[#6E6E6E]"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Date Picker */}
            <div className="flex-1 relative group">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 dark:text-[#6E6E6E] group-focus-within:text-emerald-500 dark:group-focus-within:text-[#FF3B30] transition-colors">
                <i className="fas fa-calendar-alt"></i>
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#232323] rounded-2xl focus:ring-4 focus:ring-emerald-500/10 dark:focus:ring-[#FF3B30]/10 focus:border-emerald-500 dark:focus:border-[#FF3B30] outline-none transition-all font-bold text-gray-900 dark:text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full md:w-auto px-12 py-4 bg-[#00FF00] text-[#001F3F] font-black rounded-2xl shadow-xl shadow-emerald-500/10 transition-all flex items-center justify-center text-lg active:scale-95 hover:scale-[1.02] ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <i className="fas fa-spinner fa-spin mr-3"></i>
              ) : (
                <i className="fas fa-search mr-3 opacity-30"></i>
              )}
              {t.verJornada}
            </button>
          </div>

          {/* Independent 'Explorar Ligas' Button - Trophy Style */}
          <button
            type="button"
            onClick={onExplore}
            className="w-full min-h-[56px] bg-[#121212] dark:bg-[#000000] text-white font-black rounded-[18px] border-2 border-[#006CFF] dark:border-[#FF3B30] shadow-[0_4px_15px_rgba(0,108,255,0.2)] dark:shadow-[0_4px_15px_rgba(255,59,48,0.2)] flex items-center justify-center text-lg transition-all transform hover:scale-[1.02] active:scale-95 hover:shadow-[0_0_25px_rgba(0,108,255,0.5)] dark:hover:shadow-[0_0_25px_rgba(255,59,48,0.5)] group mt-2"
          >
            <i className={`fas fa-trophy mr-3 text-[#006CFF] dark:text-[#FF3B30] group-hover:rotate-12 transition-transform drop-shadow-[0_0_8px_rgba(0,108,255,0.6)] dark:drop-shadow-[0_0_8px_rgba(255,59,48,0.6)]`}></i>
            <span className="tracking-tight uppercase text-sm md:text-base">
              {sport === 'basketball' ? (t.explorarCompeticiones || 'EXPLORAR COMPETICIONES') : (t.explorarLigas || 'EXPLORAR LIGAS')}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchForm;
