
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SavedPick, Language, User } from '../types';
import { translations } from '../utils/translations';
import { sendTelegramMessage, sendTelegramPhoto } from '../services/telegramService';
import { 
  generatePickImage, 
  generateInstagramImage, 
  generateInstagramSquareImage, 
  generateHashtags, 
  generateBetSlipImage 
} from '../services/geminiService';
import VideoGenerator from './VideoGenerator';

interface SavedPicksViewProps {
  picks: SavedPick[];
  onRemove: (id: string) => void;
  onView: (pick: SavedPick) => void;
  onBack: () => void;
  lang: Language;
  currentUser: User | null;
}

const SavedPicksView: React.FC<SavedPicksViewProps> = ({ picks, onRemove, onView, onBack, lang, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'analysis' | 'combine'>('analysis');
  const [showCombineChoice, setShowCombineChoice] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showInstaPreview, setShowInstaPreview] = useState(false);
  const [showSquareInstaPreview, setShowSquareInstaPreview] = useState(false);
  const [showBetSlipPreview, setShowBetSlipPreview] = useState(false);
  const [showStakeInput, setShowStakeInput] = useState(false);
  const [showVideoGen, setShowVideoGen] = useState(false);
  const [showLmarenaModal, setShowLmarenaModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  
  const [selectedPickForBet, setSelectedPickForBet] = useState<SavedPick | null>(null);
  const [selectedBookie, setSelectedBookie] = useState<'KIROLBET' | 'BET365' | null>(null);
  const [selectedPickForContent, setSelectedPickForContent] = useState<SavedPick | null>(null);
  
  const [previewText, setPreviewText] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [instaImageUrl, setInstaImageUrl] = useState("");
  const [squareInstaImageUrl, setSquareInstaImageUrl] = useState("");
  const [betSlipImageUrl, setBetSlipImageUrl] = useState("");
  const [instaHashtags, setInstaHashtags] = useState("");
  const [stakeInput, setStakeInput] = useState("50.00");
  
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingInsta, setIsGeneratingInsta] = useState(false);
  const [isGeneratingSquareInsta, setIsGeneratingSquareInsta] = useState(false);
  const [isGeneratingBetSlip, setIsGeneratingBetSlip] = useState(false);
  const [selectedPickIds, setSelectedPickIds] = useState<Set<string>>(new Set());
  const [selectedPickForVideo, setSelectedPickForVideo] = useState<SavedPick | null>(null);
  const [copyStatus, setCopyStatus] = useState(false);
  const [activeTicketMenu, setActiveTicketMenu] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputInstaRef = useRef<HTMLInputElement>(null);
  
  const t = translations[lang];
  const isRTL = lang === 'ar';
  
  const isAdmin = currentUser?.email === 'admin@picks.pro';

  const relevantPicks = useMemo(() => {
    return [...picks]
      .filter(p => p.type === 'picks' || p.type === 'combined')
      .map(p => {
        const probMatch = p.prediction.match(/([\d,.]+)%/);
        const probStr = probMatch ? probMatch[1].replace(',', '.') : '0';
        const prob = parseFloat(probStr) || 0;
        return { ...p, prob };
      })
      .sort((a, b) => b.prob - a.prob);
  }, [picks]);

  const togglePick = (id: string) => {
    setSelectedPickIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const extractFieldContent = (content: string, emoji: string) => {
    if (!content) return "";
    const lines = content.split('\n');
    const index = lines.findIndex(l => l.trim().startsWith(emoji));
    if (index === -1) return "";

    let firstPart = lines[index].substring(2).trim();
    if (firstPart.startsWith(':')) firstPart = firstPart.substring(1).trim();
    
    let resultParts = [firstPart];
    
    for (let i = index + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        resultParts.push(""); 
        continue;
      }
      if (/^[🎯⚡🏆💰💡🟢]/.test(line) || line.startsWith('────') || line.startsWith('###') || line.startsWith('[PICK_END]')) {
        break;
      }
      resultParts.push(line);
    }
    
    return resultParts.join('\n').trim().replace(/\*\*/g, ''); 
  };

  const handleOpenLmarena = async () => {
    const selectedPicks = relevantPicks.filter(p => selectedPickIds.has(p.id));
    const bestPick = selectedPicks.length > 0 ? selectedPicks[0] : null;

    if (!bestPick) {
      alert("Selecciona al menos un pick.");
      return;
    }

    const market = extractFieldContent(bestPick.content, '⚡') || "MERCADO PRINCIPAL";
    const selection = extractFieldContent(bestPick.content, '🏆') || bestPick.prediction;
    const odds = extractFieldContent(bestPick.content, '💰') || "1.85";
    
    const promptText = `Genera una imagen promocional deportiva estilo póster profesional de apuestas para el partido ${bestPick.match.homeTeam} vs ${bestPick.match.awayTeam}, con estética realista y cinematográfica.

FORMATO Y ENCUADRE (MUY IMPORTANTE):
- Formato vertical 4:5 o 1:1 (Instagram safe)
- Composición centrada
- Deja márgenes de seguridad amplios en los 4 lados
- NO cortar escudos, textos ni elementos gráficos
- Todo debe estar completamente visible dentro del encuadre final

ELEMENTOS OBLIGATORIOS (NO OMITIR):
1. Dos jugadores realistas enfrentados (${bestPick.match.homeTeam} y ${bestPick.match.awayTeam}), cuerpo superior visible.
2. Estadio de fútbol lleno de fondo, iluminación dramática.
3. Escudos oficiales de los equipos colocados en la parte superior izquierda y superior derecha (tamaño grande y completamente visibles).
4. Texto principal centrado y jerarquizado:
   - PICK DESTACADO
   - ${market.toUpperCase()}
   - ${selection.toUpperCase()}
5. Cuadro inferior destacado con:
   - Texto: CUOTA
   - Valor grande y llamativo: ${odds}

ESTILO VISUAL: Realismo fotográfico, alto contraste, colores intensos, iluminación tipo noche de partido, estilo marketing premium de casas de apuestas.

REGLAS CRÍTICAS: NO cortar escudos ni texto, mantener elementos dentro de zona segura, priorizar legibilidad.`;

    try {
      await navigator.clipboard.writeText(promptText);
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 3000);
      setShowLmarenaModal(true);
    } catch (err) {
      setShowLmarenaModal(true);
    }
  };

  const handleStartBetSlipFlow = (pick: SavedPick, bookie: 'KIROLBET' | 'BET365') => {
    setSelectedPickForBet(pick);
    setSelectedBookie(bookie);
    setShowCombineChoice(true);
    setActiveTicketMenu(null);
  };

  const handleDecisionCombine = (choice: 'yes' | 'no') => {
    setShowCombineChoice(false);
    if (choice === 'no') {
      setSelectedPickIds(new Set([selectedPickForBet!.id]));
      setShowStakeInput(true);
    } else {
      setSelectedPickIds(new Set([selectedPickForBet!.id]));
      setModalMode('combine');
      setShowModal(true);
    }
  };

  const handleGenerateBetSlip = async () => {
    if (selectedPickIds.size === 0 || !selectedBookie) return;
    setShowStakeInput(false);
    setShowModal(false);
    setIsGeneratingBetSlip(true);
    try {
      const isCombined = selectedPickIds.size > 1;
      const selectedPicks = picks.filter(p => selectedPickIds.has(p.id));
      
      let combinedText = "";
      if (isCombined) {
        combinedText = selectedPicks.map(p => {
          const sel = extractFieldContent(p.content, '🏆');
          const mar = extractFieldContent(p.content, '⚡');
          return `${p.match.homeTeam} vs ${p.match.awayTeam}: ${sel} [${mar}]`;
        }).join(' | ');
      } else {
        combinedText = extractFieldContent(selectedPicks[0].content, '🏆');
      }

      const mainPick = selectedPicks[0];
      const now = new Date();
      const fecha = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
      const hora = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }).format(now);
      const totalOdds = isCombined ? (1.5 + (selectedPickIds.size * 0.4)).toFixed(2) : "1.90";

      const imageUrl = await generateBetSlipImage({
        importe: stakeInput,
        linea: combinedText,
        cuota: totalOdds,
        equipoLocal: mainPick.match.homeTeam,
        equipoVisitante: mainPick.match.awayTeam,
        liga: mainPick.match.league,
        fecha,
        hora,
        ganancias: (parseFloat(stakeInput) * parseFloat(totalOdds)).toFixed(2),
        cierre: "0",
        ticketNumber: Math.floor(Math.random() * 10000).toString(),
        mercado: isCombined ? "COMBINADA" : extractFieldContent(mainPick.content, '⚡'),
        bookie: selectedBookie,
        isCombined
      });
      setBetSlipImageUrl(imageUrl);
      setShowBetSlipPreview(true);
    } catch (err) {
      alert("Error al generar el ticket.");
    } finally {
      setIsGeneratingBetSlip(false);
    }
  };

  const handleSaveToDevice = (url: string) => {
    const link = document.createElement('a');
    link.href = url; link.download = `PM_${Date.now()}.png`; link.click();
  };

  const formatText = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => (
      part.startsWith('**') && part.endsWith('**') ? 
        <strong key={i} className="text-gray-900 dark:text-white font-black">{part.slice(2, -2)}</strong> : 
        part
    ));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <input type="file" ref={fileInputRef} onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (event) => { setGeneratedImageUrl(event.target?.result as string); setShowImagePreview(true); };
          reader.readAsDataURL(file);
      }} accept="image/*" className="hidden" />
      
      <input type="file" ref={fileInputInstaRef} onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const bestPick = relevantPicks.filter(p => selectedPickIds.has(p.id))[0];
          if (!bestPick) return;
          setIsGeneratingSquareInsta(true);
          const reader = new FileReader();
          reader.onload = async (event) => {
            setSquareInstaImageUrl(event.target?.result as string);
            const h = await generateHashtags({ match: bestPick.match, selection: bestPick.prediction });
            setInstaHashtags(h); setShowSquareInstaPreview(true); setIsGeneratingSquareInsta(false);
          };
          reader.readAsDataURL(file);
      }} accept="image/*" className="hidden" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 dark:border-[#232323] pb-4 gap-4">
        <div className="flex items-center space-x-6">
          <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-900 dark:hover:text-white font-black text-xs uppercase tracking-widest transition-all">
            <i className={`fas ${lang === 'ar' ? 'fa-arrow-right ml-2' : 'fa-arrow-left mr-2'}`}></i> {t.volver}
          </button>
          <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase flex items-center">
            <i className="fas fa-bookmark mr-3 text-amber-500"></i>
            {t.savedPicksTitle}
          </h3>
        </div>
        <button onClick={() => { setModalMode('analysis'); setSelectedPickIds(new Set()); setShowModal(true); }} className="px-6 py-3 bg-[#001F3F] dark:bg-[#FF3B30] text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 transition-all">
          <i className="fas fa-chart-line mr-2"></i> {t.analyzeAll}
        </button>
      </div>

      {/* Grid de Picks Guardados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {picks.map((pick) => {
          const isMenuOpen = activeTicketMenu === pick.id;
          return (
            <div key={pick.id} className="bg-white dark:bg-[#0D0D0D] p-6 rounded-[2rem] border border-gray-100 dark:border-[#232323] shadow-xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-emerald-500 dark:text-[#00FF00] uppercase tracking-widest mb-1">{pick.match.league}</span>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${pick.type === 'picks' ? 'bg-amber-100 text-amber-600' : pick.type === 'combined' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                    {pick.type === 'picks' ? t.premiumPicks : pick.type === 'combined' ? t.combinada : t.matchAnalysis}
                  </span>
                </div>
                <button onClick={() => onRemove(pick.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
              
              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase mb-4">{pick.match.homeTeam} vs {pick.match.awayTeam}</h4>
              <div className="bg-amber-50/50 dark:bg-white/5 p-4 rounded-2xl mb-6">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-400">{pick.prediction}</p>
              </div>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => { setSelectedPickForContent(pick); setShowContentModal(true); }} 
                  className="w-full py-3 bg-gray-50 dark:bg-[#1A1A1A] rounded-xl text-[10px] font-black uppercase text-[#001F3F] dark:text-[#00FF00] border border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  VER MÁS
                </button>
                {isAdmin && pick.type === 'picks' && (
                  <div className="grid grid-cols-2 gap-2 relative">
                    <div className="relative">
                      <button onClick={() => setActiveTicketMenu(isMenuOpen ? null : pick.id)} className="w-full py-3 bg-[#001F3F] text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center">
                        <i className="fas fa-ticket-alt mr-1"></i> TICKETS
                      </button>
                      {isMenuOpen && (
                        <div className="absolute bottom-full left-0 w-full mb-2 bg-[#1A1A1A] rounded-xl shadow-2xl border border-white/10 p-2 z-50">
                           <button onClick={() => handleStartBetSlipFlow(pick, 'KIROLBET')} className="w-full py-2 bg-orange-500 text-white rounded-lg text-[9px] font-black uppercase mb-1">KIROLBET</button>
                           <button onClick={() => handleStartBetSlipFlow(pick, 'BET365')} className="w-full py-2 bg-[#128833] text-white rounded-lg text-[9px] font-black uppercase">BET365</button>
                        </div>
                      )}
                    </div>
                    <button onClick={() => { setSelectedPickForVideo(pick); setShowVideoGen(true); }} className="py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center">
                      <i className="fas fa-video mr-1"></i> VIDEO
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Decisión Combinar */}
      {showCombineChoice && (
        <div className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in zoom-in-95 duration-200">
           <div className="bg-white dark:bg-[#121212] w-full max-w-sm rounded-[2.5rem] p-10 border border-white/10 shadow-2xl text-center">
              <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                 <i className="fas fa-layer-group text-white text-3xl"></i>
              </div>
              <h3 className="text-xl font-black text-[#001F3F] dark:text-white uppercase mb-4">¿QUIERES COMBINAR?</h3>
              <p className="text-xs text-gray-500 font-bold mb-8">Añade más picks a este ticket para aumentar la cuota total.</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => handleDecisionCombine('yes')} className="py-4 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase shadow-lg">SÍ, COMBINAR</button>
                 <button onClick={() => handleDecisionCombine('no')} className="py-4 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white rounded-xl font-black text-xs uppercase">NO, SOLO ESTE</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal Lista de Selección */}
      {showModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#121212] w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10">
            <div className={`p-8 text-white flex items-center justify-between ${modalMode === 'combine' ? 'bg-amber-600' : 'bg-[#001F3F]'}`}>
              <h4 className="text-xl font-black uppercase">{modalMode === 'combine' ? "SELECCIÓN DE COMBINADA" : "ANÁLISIS DE RECOMENDACIONES"}</h4>
              <button onClick={() => setShowModal(false)}><i className="fas fa-times text-2xl"></i></button>
            </div>
            <div className="p-8 space-y-4 max-h-[50vh] overflow-y-auto">
              {relevantPicks.map((p, i) => (
                <div key={p.id} onClick={() => togglePick(p.id)} className={`p-4 rounded-2xl border transition-all flex items-center space-x-4 cursor-pointer ${selectedPickIds.has(p.id) ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-500' : 'bg-gray-50 dark:bg-[#1A1A1A] border-gray-100 dark:border-[#333]'}`}>
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${selectedPickIds.has(p.id) ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-black text-gray-400'}`}>{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-500 uppercase">{p.match.league}</p>
                    <p className="text-sm font-black dark:text-white">{p.match.homeTeam} VS {p.match.awayTeam}</p>
                    <p className="text-xs font-bold text-emerald-500">{p.prediction}</p>
                  </div>
                  <input type="checkbox" className="w-6 h-6 accent-amber-500" checked={selectedPickIds.has(p.id)} readOnly />
                </div>
              ))}
            </div>
            <div className="p-6 bg-white dark:bg-[#0D0D0D] border-t border-gray-100 dark:border-[#232323]">
              {modalMode === 'combine' ? (
                <button onClick={() => { if (selectedPickIds.size > 0) setShowStakeInput(true); }} disabled={selectedPickIds.size === 0} className="w-full py-4 bg-amber-600 text-white rounded-xl font-black text-xs uppercase shadow-xl disabled:opacity-50">
                  GENERAR TICKET ({selectedPickIds.size} PICKS)
                </button>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                   <button onClick={() => { setPreviewText("Preparando..."); setShowPreview(true); }} className="py-3 bg-sky-500 text-white rounded-xl font-black text-[9px] uppercase">TELEGRAM TXT</button>
                   <button onClick={() => { handleOpenLmarena(); }} className="py-3 bg-fuchsia-600 text-white rounded-xl font-black text-[9px] uppercase">LMARENA IA</button>
                   <button onClick={() => { if(selectedPickIds.size > 0) { setSelectedPickForVideo(relevantPicks.find(r => r.id === Array.from(selectedPickIds)[0]) || null); setShowVideoGen(true); } }} className="py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase">VIDEO STUDIO</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL VER MÁS (CONTENIDO DETALLADO) */}
      {showContentModal && selectedPickForContent && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0D0D0D] w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/10">
            <div className="p-8 bg-[#001F3F] text-white flex justify-between items-center shadow-lg">
              <div className="flex flex-col">
                <h4 className="text-xl font-black uppercase tracking-tight">PRONÓSTICO GUARDADO</h4>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1">
                  {selectedPickForContent.match.homeTeam} VS {selectedPickForContent.match.awayTeam}
                </p>
              </div>
              <button onClick={() => setShowContentModal(false)} className="hover:rotate-90 transition-transform p-3 bg-white/10 rounded-2xl">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto bg-gray-50/20 dark:bg-black/40 flex-1">
               <div className="space-y-4">
                {(selectedPickForContent.content || '').split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={i} className="h-4"></div>;
                  return (
                    <div key={i} className="border-l-2 border-emerald-500/20 pl-4 py-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100 font-bold leading-relaxed whitespace-pre-wrap">
                        {formatText(trimmed)}
                      </p>
                    </div>
                  );
                })}
               </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#0D0D0D] flex gap-3">
               <button onClick={() => { setPreviewText(selectedPickForContent.content); setShowPreview(true); }} className="flex-1 py-4 bg-sky-500 text-white rounded-xl font-black text-[10px] uppercase shadow-lg">
                 ENVIAR A TELEGRAM
               </button>
               <button onClick={() => setShowContentModal(false)} className="px-8 py-4 bg-[#FF3B30] text-white rounded-xl font-black text-[10px] uppercase shadow-lg">
                 CERRAR
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Stake Input */}
      {showStakeInput && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
           <div className="bg-[#121212] w-full max-w-sm rounded-[2.5rem] p-10 border border-white/10 shadow-2xl text-center">
             <h3 className="text-xl font-black text-white uppercase mb-6">IMPORTE {selectedBookie}</h3>
             <input type="text" value={stakeInput} onChange={(e) => setStakeInput(e.target.value)} className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl text-3xl font-black text-white text-center mb-8 outline-none focus:border-emerald-500" autoFocus />
             <button onClick={handleGenerateBetSlip} disabled={isGeneratingBetSlip} className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase shadow-xl">
               {isGeneratingBetSlip ? <i className="fas fa-spinner fa-spin"></i> : "GENERAR TICKET FINAL"}
             </button>
           </div>
        </div>
      )}

      {/* BetSlip Preview */}
      {showBetSlipPreview && (
        <div className="fixed inset-0 z-[1600] flex flex-col bg-black">
           <div className="h-20 bg-black/60 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-8">
             <h5 className="text-sm font-black text-white uppercase">TICKET {selectedPickIds.size > 1 ? "COMBINADO" : "SENCILLO"} - {selectedBookie}</h5>
             <div className="flex space-x-4">
                <button onClick={() => handleSaveToDevice(betSlipImageUrl)} className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase">DESCARGAR</button>
                <button onClick={() => setShowBetSlipPreview(false)} className="text-white/40 hover:text-white"><i className="fas fa-times text-2xl"></i></button>
             </div>
           </div>
           <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
             <img src={betSlipImageUrl} className="h-[90%] w-auto object-contain rounded-2xl shadow-2xl" alt="Ticket" />
           </div>
        </div>
      )}

      {/* Lmarena Modal */}
      {showLmarenaModal && (
        <div className="fixed inset-0 z-[600] flex flex-col bg-black">
          <div className="h-16 bg-[#0D0D0D] border-b border-white/10 flex items-center justify-between px-6">
            <h5 className="text-xs font-black text-white uppercase">LMARENA IA - GENERADOR {copyStatus ? "(PROMPT COPIADO)" : ""}</h5>
            <div className="flex space-x-4">
               <a href="https://lmarena.ai/es?mode=direct&chat-modality=image" target="_blank" rel="noreferrer" className="text-white/40 hover:text-white text-xs font-black uppercase">Abrir Externo</a>
               <button onClick={() => setShowLmarenaModal(false)} className="text-white/40 hover:text-white"><i className="fas fa-times text-xl"></i></button>
            </div>
          </div>
          <iframe src="https://lmarena.ai/es?mode=direct&chat-modality=image" className="w-full h-full border-none" title="IA" />
        </div>
      )}

      {/* Video Generator Modal */}
      {showVideoGen && selectedPickForVideo && (
        <VideoGenerator match={selectedPickForVideo.match} prediction={selectedPickForVideo.prediction} lang={lang} onClose={() => setShowVideoGen(false)} />
      )}
      
      {showPreview && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/90">
          <div className="bg-[#0D0D0D] w-full max-w-xl rounded-3xl p-8 border border-white/10">
            <h5 className="text-sky-500 font-black mb-4 uppercase text-xs">PREVIEW TELEGRAM</h5>
            <div className="bg-black p-6 rounded-xl max-h-64 overflow-y-auto mb-6 border border-white/5">
              <pre className="text-[11px] text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{previewText}</pre>
            </div>
            <button onClick={async () => {
              setIsSending(true);
              const ok = await sendTelegramMessage(previewText);
              setIsSending(false);
              if (ok) setShowPreview(false);
            }} className="w-full py-4 bg-sky-500 text-white rounded-xl font-black text-xs uppercase shadow-xl active:scale-95 transition-transform">
              {isSending ? <i className="fas fa-spinner fa-spin mr-2"></i> : "ENVIAR A TELEGRAM"}
            </button>
            <button onClick={() => setShowPreview(false)} className="w-full mt-4 text-white/30 text-[10px] font-bold uppercase hover:text-white transition-colors">CANCELAR</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedPicksView;
