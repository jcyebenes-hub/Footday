
import React, { useState, useRef, useEffect } from 'react';
import { Match, User, Language, SavedPick, FavoritesState, FavoriteTeam, Standing } from '../types';
import { getMatchInsight } from '../services/geminiService';
import { getStandings, getMatchLineups, getFixtureDetails, getH2HMatches, getTeamLastMatches, getMatchInjuries } from '../api/football';
import { translations } from '../utils/translations';
import LoadingOverlay from './LoadingOverlay';
import TeamLogo from './TeamLogo';

interface MatchDetailProps {
  match: Match;
  onBack: () => void;
  currentUser: User | null;
  onOpenSubscription: () => void;
  lang: Language;
  savedPicks?: SavedPick[];
  onSavePick?: (pick: SavedPick) => void;
  favorites?: FavoritesState;
  onToggleFavoriteTeam?: (team: FavoriteTeam) => void;
  onToggleFavoriteMatch?: (match: Match) => void;
}

const MatchDetail: React.FC<MatchDetailProps> = ({ 
  match, onBack, currentUser, onOpenSubscription, lang, savedPicks = [], onSavePick,
  favorites = { teams: [], leagues: [], matches: [] },
  onToggleFavoriteTeam,
  onToggleFavoriteMatch
}) => {
  const [loading, setLoading] = useState(false);
  const [insightType, setInsightType] = useState<'analysis' | 'picks' | 'summary' | 'combined' | 'lineups' | 'h2h' | 'standings' | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [standingsData, setStandingsData] = useState<any | null>(null);
  const [lineupsData, setLineupsData] = useState<{ lineups: any[], fixture: any, injuries: any[] } | null>(null);
  const [h2hData, setH2hData] = useState<{ direct: any[], homeLast: any[], awayLast: any[] } | null>(null);
  const [selectedPickIndices, setSelectedPickIndices] = useState<Set<number>>(new Set());
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  const isFootball = match.sport === 'football';
  const isFinished = match.status === 'finished';
  const themeColor = isFootball ? 'bg-emerald-600 dark:bg-[#FF3B30]' : 'bg-orange-500 dark:bg-[#FF9500]';
  const themeText = isFootball ? 'text-emerald-600 dark:text-[#FF3B30]' : 'text-orange-500 dark:text-[#FF9500]';
  const themeBorder = isFootball ? 'border-emerald-100 dark:border-[#FF3B30]/20' : 'border-orange-100 dark:border-[#FF9500]/20';

  const hasActiveSubscription = currentUser?.subscription && currentUser.subscription.expiresAt > Date.now();

  const handleAction = async (type: 'analysis' | 'picks' | 'summary' | 'combined' | 'lineups' | 'h2h' | 'standings') => {
    if ((type === 'picks' || type === 'combined') && !hasActiveSubscription) {
      onOpenSubscription();
      return;
    }

    setLoading(true);
    setInsightType(type);
    setContent(null);
    setStandingsData(null);
    setLineupsData(null);
    setH2hData(null);
    setSelectedPickIndices(new Set());
    try {
      if (type === 'standings' && isFootball) {
        const leagueIdOrName = match.leagueId || match.league;
        if (leagueIdOrName) {
          const standings = await getStandings(leagueIdOrName, match.date);
          if (standings) {
            setStandingsData(standings);
            setLoading(false);
            return;
          }
        }
      }

      if (type === 'lineups' && isFootball && match.id) {
        const fixtureId = Number(match.id);
        const [lineups, fixture, injuries] = await Promise.all([
          getMatchLineups(fixtureId),
          getFixtureDetails(fixtureId),
          getMatchInjuries(fixtureId)
        ]);
        if (lineups && lineups.length > 0) {
          setLineupsData({ lineups, fixture, injuries: injuries || [] });
          setLoading(false);
          return;
        }
      }

      if (type === 'h2h' && isFootball && match.homeTeamId && match.awayTeamId) {
        const h2hString = `${match.homeTeamId}-${match.awayTeamId}`;
        const [direct, homeLast, awayLast] = await Promise.all([
          getH2HMatches(h2hString, 10),
          getTeamLastMatches(Number(match.homeTeamId), 5),
          getTeamLastMatches(Number(match.awayTeamId), 5)
        ]);
        if (direct || homeLast || awayLast) {
          setH2hData({ 
            direct: direct || [], 
            homeLast: homeLast || [], 
            awayLast: awayLast || [] 
          });
          setLoading(false);
          return;
        }
      }

      const result = await getMatchInsight(match, type, lang);
      setContent(result);
      
      // Auto-select all legs for combined type
      if (type === 'combined') {
        const legCount = (result.match(/\[LEG_START\]/g) || []).length;
        const allIndices = new Set<number>();
        for (let i = 0; i < legCount; i++) allIndices.add(i);
        setSelectedPickIndices(allIndices);
      }
    } catch (e) {
      setContent("Error al obtener la información.");
    } finally {
      setLoading(false);
    }
  };

  const getPickBlocks = () => {
    if (!content || (insightType !== 'picks' && insightType !== 'combined')) return [];
    const startTag = insightType === 'picks' ? '\\[PICK_START\\]' : '\\[LEG_START\\]';
    const endTag = insightType === 'picks' ? '\\[PICK_END\\]' : '\\[LEG_END\\]';
    const regex = new RegExp(`${startTag}([\\s\\S]*?)${endTag}`, 'g');
    const matches = Array.from(content.matchAll(regex));
    return matches.map(m => m[1].trim());
  };

  const extractPredictionFromBlock = (blockText: string): string => {
    const lines = blockText.split('\n').map(l => l.replace(/\*\*/g, '').trim());
    let confidence = "";
    let market = "";
    let selection = "";
    let odds = "";

    for (const line of lines) {
      const upper = line.toUpperCase();
      if (upper.includes('CONFIANZA:')) confidence = line.split(':')[1]?.trim() || "";
      if (upper.includes('MERCADO:')) market = line.split(':')[1]?.trim() || "";
      if (upper.includes('SELECCIÓN:')) selection = line.split(':')[1]?.trim() || "";
      if (upper.includes('CUOTA ESTIMADA:')) {
        const val = line.split(':')[1]?.trim() || "";
        odds = val.replace(/[\*@]/g, '').trim();
      }
    }

    if (insightType === 'combined') {
      return `${market}: ${selection} (@${odds})`;
    }

    if (confidence || selection) {
      return `${confidence} | ${market} ${selection}`.replace(/^ \| /, '');
    }
    return "Análisis de Alta Seguridad";
  };

  const calculateTotalOdds = () => {
    if (insightType !== 'combined' || !content) return "1.00";
    const blocks = getPickBlocks();
    let total = 1.0;
    selectedPickIndices.forEach(idx => {
      const block = blocks[idx];
      // Regex más flexible para capturar la cuota:
      // - Busca "CUOTA" seguido de cualquier texto hasta los dos puntos
      // - Ignora espacios, asteriscos y el símbolo @
      // - Captura el número con punto o coma
      const oddsMatch = block.match(/CUOTA[\s\S]*?:[\s\*@]*([\d.,]+)/i);
      if (oddsMatch) {
        const oddsVal = oddsMatch[1].replace(',', '.');
        const parsed = parseFloat(oddsVal);
        if (!isNaN(parsed) && parsed > 0) {
          total *= parsed;
        }
      }
    });
    return total.toFixed(2);
  };

  const togglePickSelection = (index: number) => {
    setSelectedPickIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSaveSelected = () => {
    if (!content || !onSavePick) return;

    if (insightType === 'picks' || insightType === 'combined') {
      const blocks = getPickBlocks();
      if (blocks.length === 0 || selectedPickIndices.size === 0) return;

      selectedPickIndices.forEach(idx => {
        const block = blocks[idx];
        const prediction = extractPredictionFromBlock(block);
        const pickId = `${match.id}_${insightType}_${idx}`;
        
        onSavePick({
          id: pickId,
          match: match,
          type: insightType as any,
          content: block,
          prediction: prediction,
          savedAt: Date.now()
        });
      });
    } else {
      const prediction = insightType === 'summary' ? t.matchSummary : t.matchAnalysis;
      onSavePick({
        id: `${match.id}_${insightType}`,
        match: match,
        type: insightType as any,
        content: content,
        prediction: prediction,
        savedAt: Date.now()
      });
    }

    setShowSaveConfirm(true);
    setTimeout(() => setShowSaveConfirm(false), 3000);
  };

  useEffect(() => {
    if (content && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [content]);

  const formatText = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-gray-900 dark:text-white font-black bg-yellow-50 dark:bg-yellow-900/10 px-1 rounded border-b-2 border-yellow-200 dark:border-yellow-900/40">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderStandings = () => {
    if (!standingsData || !standingsData.standings || standingsData.standings.length === 0) {
      return (
        <div className="bg-gray-50 dark:bg-white/5 p-12 rounded-[3rem] border border-gray-100 dark:border-white/5 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-exclamation-triangle text-2xl text-amber-500"></i>
          </div>
          <p className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Clasificación no disponible</p>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No se han encontrado datos para esta competición en la temporada actual.</p>
        </div>
      );
    }
    
    // API Sports can return multiple groups (e.g. Champions League groups)
    const standings = standingsData.standings;
    
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex items-center space-x-4 mb-6">
          <img src={standingsData.logo} alt={standingsData.name} className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
          <div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{standingsData.name}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{standingsData.season} Season</p>
          </div>
        </div>

        {standings.map((group: Standing[], gIdx: number) => (
          <div key={gIdx} className="overflow-hidden rounded-[2rem] border border-gray-100 dark:border-[#232323] bg-white dark:bg-[#0D0D0D] shadow-2xl">
            {group[0]?.group && (
              <div className="bg-gray-50 dark:bg-white/5 px-6 py-3 border-b border-gray-100 dark:border-[#232323]">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{group[0].group}</span>
              </div>
            )}
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-[#232323]">
                    <th className="px-6 py-4 w-12 text-center">#</th>
                    <th className="px-6 py-4">Equipo</th>
                    <th className="px-4 py-4 text-center">PJ</th>
                    <th className="px-4 py-4 text-center">G</th>
                    <th className="px-4 py-4 text-center">E</th>
                    <th className="px-4 py-4 text-center">P</th>
                    <th className="px-4 py-4 text-center">GF</th>
                    <th className="px-4 py-4 text-center">GC</th>
                    <th className="px-4 py-4 text-center">DG</th>
                    <th className="px-6 py-4 text-center bg-gray-50/50 dark:bg-white/5">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((row) => {
                    const homeId = match.homeTeamId ? Number(match.homeTeamId) : null;
                    const awayId = match.awayTeamId ? Number(match.awayTeamId) : null;
                    
                    const isHomeById = homeId && row.team.id === homeId;
                    const isAwayById = awayId && row.team.id === awayId;
                    
                    const isHomeByName = row.team.name.toLowerCase().includes(match.homeTeam.toLowerCase()) || match.homeTeam.toLowerCase().includes(row.team.name.toLowerCase());
                    const isAwayByName = row.team.name.toLowerCase().includes(match.awayTeam.toLowerCase()) || match.awayTeam.toLowerCase().includes(row.team.name.toLowerCase());
                    
                    const isHome = isHomeById || isHomeByName;
                    const isAway = isAwayById || isAwayByName;
                    const isHighlighted = isHome || isAway;

                    return (
                      <tr 
                        key={row.team.id} 
                        className={`border-b border-gray-50 dark:border-white/5 transition-colors ${isHighlighted ? 'bg-emerald-50/30 dark:bg-[#00FF00]/5' : 'hover:bg-gray-50/50 dark:hover:bg-white/5'}`}
                      >
                        <td className="px-6 py-4 text-center">
                          <span className={`text-xs font-black ${row.rank <= 4 ? 'text-emerald-500 dark:text-pickGreen' : row.rank >= group.length - 2 ? 'text-red-500 dark:text-pickRed' : 'text-gray-400 dark:text-pickTextDisabled'}`}>
                            {row.rank}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <img src={row.team.logo} alt={row.team.name} className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                            <span className={`text-xs font-bold ${isHighlighted ? 'text-gray-900 dark:text-pickTextPrimary' : 'text-gray-600 dark:text-pickTextSecondary'}`}>
                              {row.team.name}
                            </span>
                            {isHighlighted && (
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${isHome ? 'bg-emerald-500 dark:bg-pickGreen text-white dark:text-black' : 'bg-blue-500 text-white'}`}>
                                {isHome ? 'LOCAL' : 'VISITANTE'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-xs font-bold text-gray-500 dark:text-pickTextSecondary">{row.all.played}</td>
                        <td className="px-4 py-4 text-center text-xs font-bold text-gray-500 dark:text-pickTextSecondary">{row.all.win}</td>
                        <td className="px-4 py-4 text-center text-xs font-bold text-gray-500 dark:text-pickTextSecondary">{row.all.draw}</td>
                        <td className="px-4 py-4 text-center text-xs font-bold text-gray-500 dark:text-pickTextSecondary">{row.all.lose}</td>
                        <td className="px-4 py-4 text-center text-xs font-bold text-gray-400 dark:text-pickTextDisabled">{row.all.goals.for}</td>
                        <td className="px-4 py-4 text-center text-xs font-bold text-gray-400 dark:text-pickTextDisabled">{row.all.goals.against}</td>
                        <td className="px-4 py-4 text-center text-xs font-bold text-gray-400 dark:text-pickTextDisabled">{row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}</td>
                        <td className="px-6 py-4 text-center bg-gray-50/50 dark:bg-white/5">
                          <span className="text-sm font-black text-gray-900 dark:text-pickTextPrimary">{row.points}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLineups = () => {
    if (!lineupsData || !lineupsData.lineups || lineupsData.lineups.length === 0) {
      return (
        <div className="bg-gray-50 dark:bg-white/5 p-12 rounded-[3rem] border border-gray-100 dark:border-white/5 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-users-slash text-2xl text-gray-400"></i>
          </div>
          <p className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Alineaciones no disponibles</p>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Aún no se han confirmado las alineaciones oficiales para este partido.</p>
        </div>
      );
    }

    const { lineups, fixture, injuries } = lineupsData;
    const refereeStr = fixture?.fixture?.referee;
    
    // Split referee string if it contains multiple officials (some APIs do this)
    const officials = refereeStr ? refereeStr.split(',').map((s: string) => s.trim()) : [];

    const posLabels: Record<string, string> = {
      'G': 'Porteros',
      'D': 'Defensas',
      'M': 'Centrocampistas',
      'F': 'Delanteros'
    };

    const renderPlayerGroup = (players: any[], label: string, isMissing: boolean = false) => {
      if (players.length === 0) return null;
      return (
        <div className="mb-3">
          <h6 className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-1 border-b border-gray-100 dark:border-white/5">{label}</h6>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {players.map((p: any) => (
              <span key={p.player.id || p.player.name} className={`text-[9px] font-bold uppercase flex items-center ${isMissing ? 'text-red-400/60' : 'text-gray-700 dark:text-gray-300'}`}>
                {isMissing && <i className="fas fa-plus text-[7px] text-red-500 mr-1 rotate-45"></i>}
                {!isMissing && <span className="text-emerald-500 mr-0.5">{p.player.number}</span>}
                {p.player.name}
              </span>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Árbitro y Estadio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {officials.length > 0 && (
            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-start space-x-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0">
                <i className="fas fa-user text-lg"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Cuerpo Arbitral</p>
                <div className="space-y-1">
                  {officials.map((name: string, i: number) => (
                    <p key={i} className={`text-[10px] font-black uppercase ${i === 0 ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {i === 0 ? 'Principal: ' : ''}{name}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
          {fixture?.fixture?.venue?.name && (
            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                <i className="fas fa-stadium text-lg"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Sede del Encuentro</p>
                <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase">{fixture.fixture.venue.name}</p>
                <p className="text-[8px] font-bold text-gray-400 uppercase">{fixture.fixture.venue.city}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {lineups.map((teamLineup, idx) => {
            const teamId = teamLineup.team.id;
            const startersByPos: Record<string, any[]> = { 'G': [], 'D': [], 'M': [], 'F': [] };
            teamLineup.startXI.forEach((p: any) => {
              if (startersByPos[p.player.pos]) startersByPos[p.player.pos].push(p);
            });

            const subsByPos: Record<string, any[]> = { 'G': [], 'D': [], 'M': [], 'F': [] };
            teamLineup.substitutes.forEach((p: any) => {
              if (subsByPos[p.player.pos]) subsByPos[p.player.pos].push(p);
            });

            const teamInjuries = injuries.filter((inj: any) => inj.team.id === teamId);

            return (
              <div key={idx} className="space-y-6">
                {/* Team Header */}
                <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                  <img src={teamLineup.team.logo} alt="" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                  <div className="min-w-0">
                    <h4 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tighter truncate">{teamLineup.team.name}</h4>
                    <p className="text-[7px] font-bold text-emerald-500 uppercase tracking-widest">{teamLineup.formation}</p>
                  </div>
                </div>

                {/* Starters Grouped */}
                <div className="space-y-1">
                  <h5 className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.1em] mb-2 border-l-2 border-emerald-500 pl-2">Titulares</h5>
                  {Object.entries(posLabels).map(([pos, label]) => renderPlayerGroup(startersByPos[pos], label))}
                </div>

                {/* Substitutes Grouped */}
                <div className="space-y-1">
                  <h5 className="text-[8px] font-black text-blue-500 uppercase tracking-[0.1em] mb-2 border-l-2 border-blue-500 pl-2">Reservas</h5>
                  {Object.entries(posLabels).map(([pos, label]) => renderPlayerGroup(subsByPos[pos], label))}
                </div>

                {/* Injuries / Missing */}
                {teamInjuries.length > 0 && (
                  <div className="space-y-1">
                    <h5 className="text-[8px] font-black text-red-500 uppercase tracking-[0.1em] mb-2 border-l-2 border-red-500 pl-2">No Convocados / Bajas</h5>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {teamInjuries.map((inj: any, i: number) => (
                        <span key={i} className="text-[9px] font-bold text-red-400/70 uppercase flex items-center">
                          <i className="fas fa-plus text-[7px] text-red-500 mr-1 rotate-45"></i>
                          {inj.player.name}
                          {inj.player.reason && <span className="text-[7px] ml-1 opacity-60">({inj.player.reason})</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Coach */}
                {teamLineup.coach && (
                  <div className="p-2 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20 flex items-center space-x-2">
                    <i className="fas fa-user-tie text-emerald-500 text-[10px]"></i>
                    <div className="min-w-0">
                      <p className="text-[7px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Míster</p>
                      <p className="text-[9px] font-black text-gray-900 dark:text-white uppercase truncate">{teamLineup.coach.name}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderH2H = () => {
    if (!h2hData) return null;

    const renderMatchRow = (m: any, highlightTeamId?: number) => {
      const isHome = highlightTeamId && m.teams.home.id === highlightTeamId;
      const isAway = highlightTeamId && m.teams.away.id === highlightTeamId;
      const homeScore = m.goals.home;
      const awayScore = m.goals.away;
      
      let resultColor = 'text-gray-400';
      if (highlightTeamId) {
        if (homeScore === awayScore) resultColor = 'text-amber-500';
        else if ((isHome && homeScore > awayScore) || (isAway && awayScore > homeScore)) resultColor = 'text-emerald-500';
        else resultColor = 'text-red-500';
      }

      return (
        <div key={m.fixture.id} className="flex items-center justify-between p-4 bg-white dark:bg-black/20 rounded-2xl border border-gray-50 dark:border-white/5 hover:border-emerald-500/30 transition-all group">
          <div className="flex flex-col w-20">
            <span className="text-[9px] font-black text-gray-400 uppercase">{new Date(m.fixture.date).toLocaleDateString()}</span>
            <span className="text-[8px] font-bold text-gray-400 uppercase truncate">{m.league.name}</span>
          </div>
          
          <div className="flex-1 flex items-center justify-center space-x-3">
            <div className={`flex items-center space-x-2 flex-1 justify-end ${isHome ? 'font-black text-gray-900 dark:text-white' : 'text-gray-500'}`}>
              <span className="text-[10px] uppercase truncate max-w-[80px] md:max-w-none">{m.teams.home.name}</span>
              <img src={m.teams.home.logo} alt="" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
            </div>
            
            <div className="flex items-center space-x-1 bg-gray-50 dark:bg-white/5 px-3 py-1 rounded-lg border border-gray-100 dark:border-white/10">
              <span className={`text-sm font-black ${resultColor}`}>{homeScore}</span>
              <span className="text-gray-300">-</span>
              <span className={`text-sm font-black ${resultColor}`}>{awayScore}</span>
            </div>
            
            <div className={`flex items-center space-x-2 flex-1 ${isAway ? 'font-black text-gray-900 dark:text-white' : 'text-gray-500'}`}>
              <img src={m.teams.away.logo} alt="" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
              <span className="text-[10px] uppercase truncate max-w-[80px] md:max-w-none">{m.teams.away.name}</span>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-12 animate-in fade-in duration-700">
        {/* Direct H2H */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
            <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center">
              <i className="fas fa-swords mr-3 text-emerald-500"></i> Enfrentamientos Directos
            </h4>
            <span className="text-[10px] font-black text-gray-400 uppercase bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">Últimos 10</span>
          </div>
          
          {h2hData.direct.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {h2hData.direct.map(m => renderMatchRow(m))}
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No hay enfrentamientos previos registrados</p>
            </div>
          )}
        </div>

        {/* Team Last Matches */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Home Team */}
          <div className="space-y-6">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5">
              <img src={match.homeLogo} alt="" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">Últimos de {match.homeTeam}</h4>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Estado de forma reciente</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {h2hData.homeLast.map(m => renderMatchRow(m, Number(match.homeTeamId)))}
            </div>
          </div>

          {/* Away Team */}
          <div className="space-y-6">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5">
              <img src={match.awayLogo} alt="" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">Últimos de {match.awayTeam}</h4>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Estado de forma reciente</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {h2hData.awayLast.map(m => renderMatchRow(m, Number(match.awayTeamId)))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (insightType === 'standings') {
      if (standingsData) return renderStandings();
      if (content) {
        const lines = content.split('\n');
        const elements: React.ReactNode[] = [];
        lines.forEach((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) { elements.push(<div key={i} className="h-4"></div>); return; }
          elements.push(<p key={i} className="my-3 leading-relaxed text-gray-700 dark:text-[#C8C8C8] font-bold text-sm">{formatText(trimmed)}</p>);
        });
        return <div className="markdown-content bg-gray-50/50 dark:bg-black/20 p-8 rounded-[3rem] border border-gray-100 dark:border-white/5">{elements}</div>;
      }
      if (!loading && !standingsData && !content) {
        return (
          <div className="bg-gray-50 dark:bg-white/5 p-12 rounded-[3rem] border border-gray-100 dark:border-white/5 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-search text-2xl text-gray-400"></i>
            </div>
            <p className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Sin datos de clasificación</p>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No se ha podido recuperar la tabla de posiciones para este partido.</p>
          </div>
        );
      }
      return null; // Si es standings pero no hay nada todavía
    }

    if (insightType === 'lineups') {
      if (lineupsData) return renderLineups();
      if (content) {
        const lines = content.split('\n');
        const elements: React.ReactNode[] = [];
        lines.forEach((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) { elements.push(<div key={i} className="h-4"></div>); return; }
          elements.push(<p key={i} className="my-3 leading-relaxed text-gray-700 dark:text-[#C8C8C8] font-bold text-sm">{formatText(trimmed)}</p>);
        });
        return <div className="markdown-content bg-gray-50/50 dark:bg-black/20 p-8 rounded-[3rem] border border-gray-100 dark:border-white/5">{elements}</div>;
      }
      if (!loading && !lineupsData && !content) {
        return (
          <div className="bg-gray-50 dark:bg-white/5 p-12 rounded-[3rem] border border-gray-100 dark:border-white/5 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-users-slash text-2xl text-gray-400"></i>
            </div>
            <p className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Alineaciones no disponibles</p>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No se han podido recuperar las alineaciones oficiales para este partido.</p>
          </div>
        );
      }
      return null;
    }

    if (insightType === 'h2h') {
      if (h2hData) return renderH2H();
      if (content) {
        const lines = content.split('\n');
        const elements: React.ReactNode[] = [];
        lines.forEach((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) { elements.push(<div key={i} className="h-4"></div>); return; }
          elements.push(<p key={i} className="my-3 leading-relaxed text-gray-700 dark:text-[#C8C8C8] font-bold text-sm">{formatText(trimmed)}</p>);
        });
        return <div className="markdown-content bg-gray-50/50 dark:bg-black/20 p-8 rounded-[3rem] border border-gray-100 dark:border-white/5">{elements}</div>;
      }
      if (!loading && !h2hData && !content) {
        return (
          <div className="bg-gray-50 dark:bg-white/5 p-12 rounded-[3rem] border border-gray-100 dark:border-white/5 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-history text-2xl text-gray-400"></i>
            </div>
            <p className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Historial no disponible</p>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No se ha podido recuperar el historial de enfrentamientos para este partido.</p>
          </div>
        );
      }
      return null;
    }

    if (!content) return null;

    if (insightType === 'picks' || insightType === 'combined') {
      const blocks = getPickBlocks();
      if (blocks.length > 0) {
        const totalOdds = calculateTotalOdds();
        return (
          <div className="space-y-8">
            <div className={`flex flex-col md:flex-row md:items-center justify-between p-6 rounded-[2rem] border gap-4 ${match.sport === 'football' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100' : 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-100'}`}>
              <div className="flex flex-col">
                <span className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${match.sport === 'football' ? 'text-emerald-600 dark:text-[#00FF00]' : 'text-orange-600 dark:text-[#FF9500]'}`}>
                  {insightType === 'picks' ? 'Protocolo de Élite' : 'Arquitectura de Combinada'}
                </span>
                <span className="text-xs font-bold text-gray-500">{selectedPickIndices.size} Seleccionados para Guardar</span>
                {insightType === 'combined' && selectedPickIndices.size > 0 && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-[10px] font-black text-indigo-500 uppercase">Cuota Combinada:</span>
                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">@{totalOdds}</span>
                  </div>
                )}
              </div>
              <button 
                onClick={handleSaveSelected}
                disabled={selectedPickIndices.size === 0}
                className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl ${
                  selectedPickIndices.size > 0 
                    ? 'bg-[#001F3F] dark:bg-[#FF3B30] text-white hover:scale-105 active:scale-95' 
                    : 'bg-gray-200 dark:bg-white/5 text-gray-400 cursor-not-allowed'
                }`}
              >
                {showSaveConfirm ? '✓ GUARDADO' : 'GUARDAR SELECCIÓN'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {blocks.map((block, idx) => {
                const lines = block.split('\n');
                const isSelected = selectedPickIndices.has(idx);
                const blockThemeColor = match.sport === 'football' ? 'emerald' : 'orange';
                const blockThemeHex = match.sport === 'football' ? '#00FF00' : '#FF9500';

                return (
                  <div 
                    key={idx} 
                    onClick={() => togglePickSelection(idx)}
                    className={`p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer relative overflow-hidden group shadow-2xl ${
                      isSelected 
                        ? `border-${blockThemeColor}-500 dark:border-[${blockThemeHex}] bg-white dark:bg-[#0D0D0D]` 
                        : `border-gray-100 dark:border-[#232323] bg-white dark:bg-[#0D0D0D] hover:border-${blockThemeColor}-200`
                    }`}
                  >
                    {isSelected && (
                      <div className={`absolute top-0 left-0 w-2 h-full bg-${blockThemeColor}-500 dark:bg-[${blockThemeHex}]`}></div>
                    )}
                    
                    <div className={`absolute top-6 right-8 w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${
                      isSelected ? `bg-${blockThemeColor}-500 border-${blockThemeColor}-500 text-white shadow-lg` : 'border-gray-200 dark:border-[#333] text-transparent'
                    }`}>
                      <i className="fas fa-check text-xs"></i>
                    </div>

                    <div className="space-y-4">
                      {lines.map((line, li) => {
                        const trimmed = line.trim();
                        if (!trimmed) return null;
                        const upper = trimmed.toUpperCase();
                        
                        if (upper.includes('CONFIANZA:') || upper.includes('PROBABILIDAD DE ÉXITO:')) {
                          return (
                            <div key={li} className="flex items-center space-x-3 mb-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${match.sport === 'football' ? 'bg-emerald-100 dark:bg-[#00FF00]/10 text-emerald-600 dark:text-[#00FF00]' : 'bg-orange-100 dark:bg-[#FF9500]/10 text-orange-600 dark:text-[#FF9500]'}`}>
                                <i className={`fas ${match.sport === 'football' ? 'fa-bullseye' : 'fa-basketball-ball'} text-xl`}></i>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Certeza Proyectada</span>
                                <span className={`text-2xl font-black italic leading-none ${match.sport === 'football' ? 'text-emerald-600 dark:text-[#00FF00]' : 'text-orange-600 dark:text-[#FF9500]'}`}>{trimmed.split(':')[1]?.trim() || trimmed}</span>
                              </div>
                            </div>
                          );
                        }

                        if (upper.includes('CUOTA ESTIMADA:')) {
                          return (
                            <div key={li} className="flex items-center space-x-3 mb-4 bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/20">
                              <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                                <i className="fas fa-chart-line"></i>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Cuota Individual</span>
                                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">@{trimmed.split(':')[1]?.replace(/[\*@]/g, '').trim() || trimmed}</span>
                              </div>
                            </div>
                          );
                        }

                        if (upper.includes('MERCADO:')) {
                          return (
                            <div key={li} className="flex items-start space-x-3">
                              <span className="text-lg">⚡</span>
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mercado</span>
                                <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{formatText(trimmed.split(':')[1]?.trim() || trimmed)}</p>
                              </div>
                            </div>
                          );
                        }

                        if (upper.includes('SELECCIÓN:')) {
                          return (
                            <div key={li} className="bg-amber-50 dark:bg-white/5 p-4 rounded-2xl border border-amber-100 dark:border-white/10 mb-4">
                              <div className="flex items-center space-x-3">
                                <i className="fas fa-crown text-amber-500"></i>
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-amber-600/60 uppercase tracking-widest">Selección Sugerida</span>
                                  <p className="text-lg font-black text-amber-900 dark:text-amber-400">{formatText(trimmed.includes(':') ? trimmed.split(':')[1]?.trim() : trimmed)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (upper.includes('LÓGICA CONVERGENTE:') || upper.includes('SELECCIONES DE LA COMBINADA:')) {
                           return <p key={li} className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6 mb-2 border-b border-gray-100 dark:border-white/5 pb-1">Validación Técnica</p>;
                        }

                        if (upper.includes('ANÁLISIS DE SINERGIA:')) {
                          return <p key={li} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-6 mb-2 border-b border-indigo-100 dark:border-indigo-900/10 pb-1">Sinergia Estratégica</p>;
                        }

                        if (upper.includes('CÓDIGO:')) {
                          return (
                            <div key={li} className="inline-block mt-4 px-3 py-1 bg-gray-100 dark:bg-white/10 rounded-lg">
                              <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 tracking-widest">{trimmed}</span>
                            </div>
                          );
                        }

                        return (
                          <div key={li} className="flex items-start space-x-3 ml-1">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${match.sport === 'football' ? 'bg-emerald-500/40' : 'bg-orange-500/40'}`}></div>
                            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 leading-relaxed italic">{formatText(trimmed)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
    }

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) { elements.push(<div key={i} className="h-4"></div>); return; }
      
      // Manejo de Bloqueos (Fútbol y Basket)
      if (trimmed.includes('NO HAY OPORTUNIDAD DE ALTA SEGURIDAD') || trimmed.includes('PICK BLOQUEADO') || trimmed.includes('COMBINADA BLOQUEADA')) {
        elements.push(
          <div key={i} className="bg-red-50 dark:bg-red-900/10 p-10 rounded-[2.5rem] border-2 border-red-100 dark:border-red-900/20 text-center my-8 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-hand-paper text-3xl text-red-600 dark:text-red-400"></i>
            </div>
            <p className="text-xl font-black text-red-600 dark:text-red-400 uppercase tracking-tight mb-2">{trimmed}</p>
            <p className="text-xs text-red-400/70 font-bold uppercase tracking-widest">Protocolo de Seguridad Activado</p>
          </div>
        );
      } else if (trimmed.startsWith('ANÁLISIS') || trimmed.startsWith('PICK PRINCIPAL')) {
        elements.push(<h3 key={i} className={`text-2xl md:text-3xl font-black mt-12 mb-6 pb-2 border-b-4 ${themeBorder} text-gray-900 dark:text-white uppercase tracking-tighter`}>{trimmed}</h3>);
      } else {
        elements.push(<p key={i} className="my-3 leading-relaxed text-gray-700 dark:text-[#C8C8C8] font-bold text-sm">{formatText(trimmed)}</p>);
      }
    });

    return (
      <div className="space-y-4 animate-in fade-in duration-700">
        <div className="markdown-content bg-gray-50/50 dark:bg-black/20 p-8 rounded-[3rem] border border-gray-100 dark:border-white/5">{elements}</div>
        {(insightType === 'summary' || insightType === 'analysis' || insightType === 'lineups' || insightType === 'h2h' || insightType === 'standings') && (
          <div className="pt-8 flex justify-center">
            <button 
              onClick={handleSaveSelected}
              className={`flex items-center space-x-3 px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl bg-[#001F3F] dark:bg-[#FF3B30] text-white hover:scale-105 active:scale-95`}
            >
              <i className="fas fa-bookmark"></i>
              <span>{showSaveConfirm ? 'CONTENIDO GUARDADO' : 'GUARDAR INFORME'}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const isMatchFav = favorites.matches.some(m => m.id === match.id);
  const isHomeFav = favorites.teams.some(t => t.id === `team_${match.homeTeam}`);
  const isAwayFav = favorites.teams.some(t => t.id === `team_${match.awayTeam}`);

  return (
    <div className="bg-white dark:bg-[#121212] rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 mb-12 border border-gray-100 dark:border-[#232323] transition-colors relative">
      <LoadingOverlay isLoading={loading} message={"Ejecutando algoritmos cuánticos..."} sport={match.sport} />

      <div className={`${themeColor} p-10 text-white transition-colors duration-500 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="flex items-center justify-between mb-10 relative z-10">
          <button onClick={onBack} className="flex items-center text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-white/10 px-6 py-3 rounded-2xl border border-white/10 transition-all group backdrop-blur-sm">
            <i className={`fas ${lang === 'ar' ? 'fa-arrow-right ml-3' : 'fa-arrow-left mr-3'} transform group-hover:-translate-x-1 transition-transform`}></i> {t.volver}
          </button>

          <button 
            onClick={() => onToggleFavoriteMatch?.(match)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${isMatchFav ? 'bg-white text-red-500 border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
          >
            <i className={`${isMatchFav ? 'fas' : 'far'} fa-heart text-xl`}></i>
          </button>
        </div>
        
        <div className="text-center py-8 relative z-10">
          <div className="flex flex-col items-center mb-10">
             <span className="bg-white/20 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.4em] mb-4 border border-white/20 shadow-lg backdrop-blur-md">{match.country} • {match.league}</span>
          </div>

          <div className="flex items-center justify-between md:justify-center md:space-x-24">
            <div className="flex flex-col items-center w-1/3">
              <TeamLogo 
                logoUrl={match.homeLogo || ''} 
                teamName={match.homeTeam} 
                size={120} 
              />
              <div className="flex items-center mt-8 space-x-3">
                <h2 className="text-xl md:text-4xl font-black leading-none tracking-tighter uppercase italic">{match.homeTeam}</h2>
                <button 
                  onClick={() => onToggleFavoriteTeam?.({ id: `team_${match.homeTeam}`, name: match.homeTeam, logo: match.homeLogo, sport: match.sport })}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isHomeFav ? 'text-red-500 bg-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                  <i className={`${isHomeFav ? 'fas' : 'far'} fa-heart`}></i>
                </button>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              {isFinished ? (
                <div className="flex flex-col items-center">
                  <div className="text-5xl md:text-8xl font-black text-white italic tracking-tighter drop-shadow-2xl">{match.score}</div>
                  <div className="bg-red-500 px-8 py-2.5 rounded-2xl text-[10px] font-black mt-8 border-b-4 border-red-700 shadow-2xl uppercase tracking-widest animate-pulse">{t.final}</div>
                </div>
              ) : (
                <>
                  <span className="text-4xl md:text-7xl font-black text-white/20 italic tracking-tighter mb-4">VS</span>
                  <div className="bg-black/40 px-8 py-3 rounded-2xl text-base font-black border border-white/10 shadow-2xl backdrop-blur-xl border-b-4 border-black/60">{match.time}</div>
                </>
              )}
            </div>

            <div className="flex flex-col items-center w-1/3">
              <TeamLogo 
                logoUrl={match.awayLogo || ''} 
                teamName={match.awayTeam} 
                size={120} 
              />
              <div className="flex items-center mt-8 space-x-3">
                <h2 className="text-xl md:text-4xl font-black leading-none tracking-tighter uppercase italic">{match.awayTeam}</h2>
                <button 
                  onClick={() => onToggleFavoriteTeam?.({ id: `team_${match.awayTeam}`, name: match.awayTeam, logo: match.awayLogo, sport: match.sport })}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isAwayFav ? 'text-red-500 bg-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                  <i className={`${isAwayFav ? 'fas' : 'far'} fa-heart`}></i>
                </button>
              </div>
            </div>
          </div>

          {match.odds && (
            <div className="mt-12 flex justify-center space-x-4">
              <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 flex flex-col items-center min-w-[80px]">
                <span className="text-[10px] font-black text-white/60 uppercase">1</span>
                <span className="text-xl font-black text-white">{match.odds.home?.toFixed(2)}</span>
              </div>
              {match.odds.draw && (
                <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 flex flex-col items-center min-w-[80px]">
                  <span className="text-[10px] font-black text-white/60 uppercase">X</span>
                  <span className="text-xl font-black text-white">{match.odds.draw?.toFixed(2)}</span>
                </div>
              )}
              <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 flex flex-col items-center min-w-[80px]">
                <span className="text-[10px] font-black text-white/60 uppercase">2</span>
                <span className="text-xl font-black text-white">{match.odds.away?.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-10 md:p-20">
        {/* Botones Secundarios (Pequeños) - Forzados a una sola línea */}
        <div className="grid grid-cols-4 gap-2 md:gap-4 mb-10">
          <button 
            onClick={() => handleAction('summary')} 
            disabled={loading} 
            className={`px-1 py-3 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-tighter md:tracking-widest transition-all transform active:scale-95 shadow-lg flex flex-col md:flex-row items-center justify-center md:space-x-2 ${insightType === 'summary' ? `${themeColor} text-white` : 'bg-gray-50 dark:bg-[#1A1A1A] text-gray-500 dark:text-gray-400 hover:bg-gray-100 border border-gray-100 dark:border-[#232323]'}`}
          >
            <i className="fas fa-file-alt opacity-40 mb-1 md:mb-0"></i>
            <span className="text-center">RESUMEN</span>
          </button>
          <button 
            onClick={() => handleAction('lineups')} 
            disabled={loading} 
            className={`px-1 py-3 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-tighter md:tracking-widest transition-all transform active:scale-95 shadow-lg flex flex-col md:flex-row items-center justify-center md:space-x-2 ${insightType === 'lineups' ? `${themeColor} text-white` : 'bg-gray-50 dark:bg-[#1A1A1A] text-gray-500 dark:text-gray-400 hover:bg-gray-100 border border-gray-100 dark:border-[#232323]'}`}
          >
            <i className="fas fa-users opacity-40 mb-1 md:mb-0"></i>
            <span className="text-center">ALINEACIONES</span>
          </button>
          <button 
            onClick={() => handleAction('h2h')} 
            disabled={loading} 
            className={`px-1 py-3 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-tighter md:tracking-widest transition-all transform active:scale-95 shadow-lg flex flex-col md:flex-row items-center justify-center md:space-x-2 ${insightType === 'h2h' ? `${themeColor} text-white` : 'bg-gray-50 dark:bg-[#1A1A1A] text-gray-500 dark:text-gray-400 hover:bg-gray-100 border border-gray-100 dark:border-[#232323]'}`}
          >
            <i className="fas fa-history opacity-40 mb-1 md:mb-0"></i>
            <span className="text-center">H2H</span>
          </button>
          <button 
            onClick={() => handleAction('standings')} 
            disabled={loading} 
            className={`px-1 py-3 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-tighter md:tracking-widest transition-all transform active:scale-95 shadow-lg flex flex-col md:flex-row items-center justify-center md:space-x-2 ${insightType === 'standings' ? `${themeColor} text-white` : 'bg-gray-50 dark:bg-[#1A1A1A] text-gray-500 dark:text-gray-400 hover:bg-gray-100 border border-gray-100 dark:border-[#232323]'}`}
          >
            <i className="fas fa-list-ol opacity-40 mb-1 md:mb-0"></i>
            <span className="text-center">CLASIFICACIÓN</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-6 mb-20">
          {isFinished && (
            <button onClick={() => handleAction('summary')} disabled={loading} className={`flex-1 py-6 px-8 rounded-[2rem] font-black text-sm md:text-lg flex items-center justify-center transition-all transform active:scale-95 shadow-2xl ${insightType === 'summary' ? `${themeColor} text-white` : 'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 hover:bg-blue-100 border border-blue-100 dark:border-blue-900/20'}`}>
              <i className="fas fa-file-alt mr-4 text-2xl opacity-40"></i> RESUMEN
            </button>
          )}
          <button onClick={() => handleAction('analysis')} disabled={loading} className={`flex-1 py-6 px-8 rounded-[2rem] font-black text-sm md:text-lg flex items-center justify-center transition-all transform active:scale-95 shadow-2xl ${insightType === 'analysis' ? `${themeColor} text-white` : 'bg-gray-50 dark:bg-[#1A1A1A] text-gray-600 dark:text-[#C8C8C8] hover:bg-gray-100 border border-gray-100 dark:border-[#232323]'}`}>
            <i className={`fas ${isFootball ? 'fa-microscope' : 'fa-chart-pie'} mr-4 text-2xl opacity-40`}></i> {t.analizar}
          </button>
          <button onClick={() => handleAction('picks')} disabled={loading} className={`flex-1 py-6 px-8 rounded-[2rem] font-black text-sm md:text-lg flex items-center justify-center transition-all transform active:scale-95 shadow-2xl relative group ${insightType === 'picks' ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-[#FF9500] hover:bg-amber-100 border border-amber-100 dark:border-amber-900/20'}`}>
            {!hasActiveSubscription && <i className="fas fa-lock absolute top-6 right-8 text-[10px] opacity-40 group-hover:opacity-100 transition-opacity"></i>}
            <i className="fas fa-crown mr-4 text-2xl opacity-40"></i> PICKS 90%+
          </button>
          <button onClick={() => handleAction('combined')} disabled={loading} className={`flex-1 py-6 px-8 rounded-[2rem] font-black text-sm md:text-lg flex items-center justify-center transition-all transform active:scale-95 shadow-2xl relative group ${insightType === 'combined' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 border border-indigo-100 dark:border-indigo-900/20'}`}>
            {!hasActiveSubscription && <i className="fas fa-lock absolute top-6 right-8 text-[10px] opacity-40 group-hover:opacity-100 transition-opacity"></i>}
            <i className="fas fa-layer-group mr-4 text-2xl opacity-40"></i> {t.combinada}
          </button>
        </div>

        <div ref={contentRef} className="max-w-4xl mx-auto">
          {(content || standingsData || lineupsData || h2hData) && !loading && renderContent()}
        </div>
      </div>
      
      {/* Disclaimer de Seguridad */}
      <div className="bg-gray-50 dark:bg-black/40 p-8 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-6">
         <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isFootball ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
               <i className="fas fa-shield-check text-2xl"></i>
            </div>
            <div>
               <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Protocolo de Verificación</p>
               <p className="text-[10px] font-bold text-gray-400">Análisis basado en convergencia estadística extrema.</p>
            </div>
         </div>
         <p className="text-[9px] font-black text-gray-400 max-w-xs uppercase leading-relaxed tracking-tighter">Advertencia: Los resultados deportivos son impredecibles. Estos datos son apoyo técnico, no garantía financiera.</p>
      </div>
    </div>
  );
};

export default MatchDetail;
