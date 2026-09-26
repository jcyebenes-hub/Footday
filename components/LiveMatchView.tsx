
import React, { useState, useEffect } from 'react';
import { Match, Language } from '../types';
import { getMatchEvents, getMatchStatistics, getMatchLineups } from '../lib/football';
import TeamLogo from './TeamLogo';
import LoadingOverlay from './LoadingOverlay';
import { translations } from '../utils/translations';

interface LiveMatchViewProps {
  match: Match;
  onClose: () => void;
  lang: Language;
}

const LiveMatchView: React.FC<LiveMatchViewProps> = ({ match, onClose, lang }) => {
  const [activeTab, setActiveTab] = useState<'tracker' | 'stats' | 'lineups' | 'events'>('tracker');
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [lineups, setLineups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const t = translations[lang];

  useEffect(() => {
    const fetchData = async () => {
      if (!match.id) return;
      setLoading(true);
      try {
        const fixtureId = parseInt(match.id);
        const [eventsData, statsData, lineupsData] = await Promise.all([
          getMatchEvents(fixtureId),
          getMatchStatistics(fixtureId),
          getMatchLineups(fixtureId)
        ]);
        setEvents(eventsData || []);
        setStats(statsData || []);
        setLineups(lineupsData || []);
      } catch (error) {
        console.error('Error fetching live data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [match.id]);

  const renderStats = () => {
    if (stats.length === 0) return <div className="text-center py-10 text-gray-500">{t.noStats}</div>;

    const homeStats = stats[0]?.statistics || [];
    const awayStats = stats[1]?.statistics || [];

    return (
      <div className="space-y-6 p-4">
        {homeStats.map((s: any, index: number) => {
          const homeVal = s.value || 0;
          const awayVal = awayStats[index]?.value || 0;
          
          // Calculate percentage for the bar
          let homePercent = 50;
          let awayPercent = 50;
          
          const hNum = typeof homeVal === 'string' ? parseInt(homeVal) : homeVal;
          const aNum = typeof awayVal === 'string' ? parseInt(awayVal) : awayVal;

          if (hNum + aNum > 0) {
            homePercent = (hNum / (hNum + aNum)) * 100;
            awayPercent = (aNum / (hNum + aNum)) * 100;
          }

          if (s.type === 'Ball Possession') {
             homePercent = parseInt(homeVal);
             awayPercent = parseInt(awayVal);
          }

          return (
            <div key={index} className="flex flex-col">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-2 dark:text-gray-400">
                <span>{homeVal}{s.type === 'Ball Possession' ? '%' : ''}</span>
                <span className="text-gray-400">{t.statsLabels?.[s.type] || s.type}</span>
                <span>{awayVal}{s.type === 'Ball Possession' ? '%' : ''}</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000" 
                  style={{ width: `${homePercent}%` }}
                ></div>
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000" 
                  style={{ width: `${awayPercent}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderEvents = () => {
    if (events.length === 0) return <div className="text-center py-10 text-gray-500">{t.noEvents}</div>;

    return (
      <div className="space-y-4 p-4">
        {events.slice().reverse().map((event, index) => (
          <div key={index} className={`flex items-center gap-4 p-3 rounded-2xl border border-gray-100 dark:border-white/5 ${event.team.name === match.homeTeam ? 'flex-row' : 'flex-row-reverse'}`}>
            <div className="text-sm font-black text-gray-400 w-8 text-center">{event.time.elapsed}'</div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              event.type === 'Goal' ? 'bg-emerald-500 text-white' : 
              event.type === 'Card' && event.detail === 'Yellow Card' ? 'bg-yellow-400 text-black' :
              event.type === 'Card' && event.detail === 'Red Card' ? 'bg-red-500 text-white' :
              'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400'
            }`}>
              {event.type === 'Goal' && <i className="fas fa-futbol"></i>}
              {event.type === 'Card' && <i className="fas fa-square"></i>}
              {event.type === 'subst' && <i className="fas fa-exchange-alt"></i>}
              {event.type === 'Var' && <i className="fas fa-tv"></i>}
            </div>
            <div className={`flex-1 ${event.team.name === match.homeTeam ? 'text-left' : 'text-right'}`}>
              <div className="text-xs font-black dark:text-white uppercase">{event.player.name}</div>
              <div className="text-[10px] text-gray-400 font-bold uppercase">{t.eventLabels?.[event.detail] || event.detail}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTracker = () => {
    // A simplified match tracker simulation
    return (
      <div className="p-4">
        <div className="relative aspect-[16/9] bg-emerald-600 rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl">
          {/* Pitch markings */}
          <div className="absolute inset-4 border-2 border-white/30 rounded-lg"></div>
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/30 rounded-full"></div>
          
          {/* Animated ball or action indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-pulse">
             <div className="w-4 h-4 bg-white rounded-full shadow-lg mb-2"></div>
             <span className="text-[10px] font-black text-white uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded">{t.accionEnCurso}</span>
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full px-8 flex justify-between items-end">
             <div className="flex flex-col items-center">
                <TeamLogo logoUrl={match.homeLogo || ''} teamName={match.homeTeam} size={48} />
                <span className="text-[10px] font-black text-white mt-2 uppercase">{match.homeTeam}</span>
             </div>
             <div className="flex flex-col items-center">
                <TeamLogo logoUrl={match.awayLogo || ''} teamName={match.awayTeam} size={48} />
                <span className="text-[10px] font-black text-white mt-2 uppercase">{match.awayTeam}</span>
             </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
           <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10">
              <span className="text-[10px] font-black text-gray-400 uppercase block mb-2">{t.statsLabels?.['Dangerous Attacks'] || 'Ataques Peligrosos'}</span>
              <div className="flex justify-between items-end">
                 <span className="text-2xl font-black dark:text-white">{stats[0]?.statistics?.find((s: any) => s.type === 'Dangerous Attacks')?.value || 0}</span>
                 <span className="text-2xl font-black text-blue-500">{stats[1]?.statistics?.find((s: any) => s.type === 'Dangerous Attacks')?.value || 0}</span>
              </div>
           </div>
           <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10">
              <span className="text-[10px] font-black text-gray-400 uppercase block mb-2">{t.statsLabels?.['Shots on Goal'] || 'Remates a puerta'}</span>
              <div className="flex justify-between items-end">
                 <span className="text-2xl font-black dark:text-white">{stats[0]?.statistics?.find((s: any) => s.type === 'Shots on Goal')?.value || 0}</span>
                 <span className="text-2xl font-black text-emerald-500">{stats[1]?.statistics?.find((s: any) => s.type === 'Shots on Goal')?.value || 0}</span>
              </div>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#121212] w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-[#232323]">
        
        {/* Header */}
        <div className="bg-emerald-600 dark:bg-[#FF3B30] p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          >
            <i className="fas fa-times"></i>
          </button>

          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-70">{match.league}</span>
            <div className="flex items-center justify-center gap-8 w-full">
              <div className="flex flex-col items-center flex-1">
                <TeamLogo logoUrl={match.homeLogo || ''} teamName={match.homeTeam} size={64} />
                <span className="text-sm font-black mt-2 uppercase text-center line-clamp-1">{match.homeTeam}</span>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="text-4xl font-black italic tracking-tighter">{match.score || '0 - 0'}</div>
                <div className="mt-2 px-3 py-1 bg-black/20 rounded-full text-[10px] font-black animate-pulse">{t.enVivo}</div>
              </div>

              <div className="flex flex-col items-center flex-1">
                <TeamLogo logoUrl={match.awayLogo || ''} teamName={match.awayTeam} size={64} />
                <span className="text-sm font-black mt-2 uppercase text-center line-clamp-1">{match.awayTeam}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-white/5">
          <button 
            onClick={() => setActiveTab('tracker')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tracker' ? 'text-emerald-600 dark:text-[#FF3B30] border-b-2 border-emerald-600 dark:border-[#FF3B30]' : 'text-gray-400'}`}
          >
            {t.tracker}
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'text-emerald-600 dark:text-[#FF3B30] border-b-2 border-emerald-600 dark:border-[#FF3B30]' : 'text-gray-400'}`}
          >
            {t.stats}
          </button>
          <button 
            onClick={() => setActiveTab('events')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'events' ? 'text-emerald-600 dark:text-[#FF3B30] border-b-2 border-emerald-600 dark:border-[#FF3B30]' : 'text-gray-400'}`}
          >
            {t.eventos}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative">
          {loading && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>}
          
          {activeTab === 'tracker' && renderTracker()}
          {activeTab === 'stats' && renderStats()}
          {activeTab === 'events' && renderEvents()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/40 text-center">
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t.realTimeData}</p>
        </div>
      </div>
    </div>
  );
};

export default LiveMatchView;
