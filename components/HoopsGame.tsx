
import React, { useState, useEffect, useRef } from 'react';

interface HoopsGameProps {
  onBasket?: () => void;
}

type GamePhase = 'direction' | 'power' | 'shooting' | 'result';

const HoopsGame: React.FC<HoopsGameProps> = ({ onBasket }) => {
  const [phase, setPhase] = useState<GamePhase>('direction');
  const [dirAngle, setDirAngle] = useState(0); // -40 to 40 degrees
  const [pwrValue, setPwrValue] = useState(50); // 0-100
  const [ballPos, setBallPos] = useState({ x: 50, y: 85, scale: 1, rotate: 0, shadowScale: 1 });
  const [defenderPos, setDefenderPos] = useState<'left' | 'center' | 'right'>('center');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState('');
  const [isRimShaking, setIsRimShaking] = useState(false);
  const [showFire, setShowFire] = useState(false);

  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(null);
  const shotStartTimeRef = useRef<number | null>(null);

  const animate = (time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = time - startTimeRef.current;

    if (phase === 'direction') {
      const angle = Math.sin(elapsed * 0.005) * 40;
      setDirAngle(angle);
    } else if (phase === 'power') {
      const power = 50 + Math.sin(elapsed * 0.01) * 50;
      setPwrValue(power);
    } else if (phase === 'shooting') {
      if (!shotStartTimeRef.current) shotStartTimeRef.current = time;
      const shotElapsed = time - shotStartTimeRef.current;
      const duration = 800; // ms de vuelo
      const progress = Math.min(shotElapsed / duration, 1);

      // Trayectoria Parabólica
      // targetX calculado al fijar
      const startX = 50;
      const targetX = 50 + (dirAngle / 40) * 25;
      
      const startY = 85;
      const targetY = 22; // Nivel del aro
      const peakY = 5 + (100 - pwrValue) * 0.2; // Altura máxima según potencia

      // Interpolación curva (Bézier simple)
      const currentX = startX + (targetX - startX) * progress;
      const currentY = progress < 0.5 
        ? startY + (peakY - startY) * (progress * 2) 
        : peakY + (targetY - peakY) * ((progress - 0.5) * 2);
      
      const currentScale = 1 - progress * 0.65;
      const currentShadow = 1 - progress * 0.8;

      setBallPos(prev => ({
        ...prev,
        x: currentX,
        y: currentY,
        scale: currentScale,
        rotate: progress * 720,
        shadowScale: currentShadow
      }));

      if (progress === 1) {
        handleShotResolution(targetX);
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [phase]);

  const handleActionButton = () => {
    if (phase === 'direction') {
      setPhase('power');
    } else if (phase === 'power') {
      setPhase('shooting');
      shotStartTimeRef.current = null;
      
      // IA Defensiva: 40% anticipación
      if (Math.random() < 0.4 && Math.abs(dirAngle) > 15) {
        setDefenderPos(dirAngle < 0 ? 'left' : 'right');
      }
    }
  };

  const handleShotResolution = (targetX: number) => {
    const dirAbs = Math.abs(dirAngle);
    const pwrAbs = Math.abs(50 - pwrValue);

    let result: 'basket' | 'rim' | 'airball' = 'airball';

    const isDirGreen = dirAbs < 7;
    const isPwrGreen = pwrAbs < 12;

    if (isDirGreen && isPwrGreen) {
      result = 'basket';
    } else if (dirAbs < 18 && pwrAbs < 25) {
      result = Math.random() > 0.4 ? 'rim' : 'basket';
    }

    // Reacción del defensor (60% si no anticipó)
    if (defenderPos === 'center' && Math.random() < 0.6) {
      setDefenderPos(targetX < 45 ? 'left' : targetX > 55 ? 'right' : 'center');
    }

    if (result === 'basket') {
      setScore(s => s + 1);
      setStreak(st => {
        const newStreak = st + 1;
        if (newStreak >= 3) setShowFire(true);
        return newStreak;
      });
      setMessage('¡¡CANASTA!!');
      setIsRimShaking(true);
      if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
      if (onBasket) onBasket();
    } else {
      setStreak(0);
      setShowFire(false);
      setMessage(result === 'rim' ? '¡CASI!' : '¡FALLO!');
    }

    setPhase('result');
    setTimeout(resetGame, 1500);
  };

  const resetGame = () => {
    setPhase('direction');
    setBallPos({ x: 50, y: 85, scale: 1, rotate: 0, shadowScale: 1 });
    setDefenderPos('center');
    setMessage('');
    setIsRimShaking(false);
    startTimeRef.current = null;
    shotStartTimeRef.current = null;
  };

  return (
    <div className="relative w-full h-full bg-[#001F3F] overflow-hidden flex flex-col items-center font-['Inter'] select-none touch-none">
      
      {/* Background Court TV View */}
      <div className="absolute inset-0">
        <div className="w-full h-1/2 bg-[#1a120b] border-b-[6px] border-white/20"></div>
        <div className="w-full h-1/2 bg-[#2d1e12]"></div>
        {/* Luces y Público Minimalista */}
        <div className="absolute top-10 w-full flex justify-around opacity-20">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-75"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-150"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-300"></div>
        </div>
        <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-[120%] h-40 bg-white/5 skew-y-12"></div>
      </div>

      {/* Canasta 3D Style */}
      <div className={`absolute top-[12%] left-1/2 -translate-x-1/2 w-64 flex flex-col items-center z-10 transition-transform duration-500 ${phase === 'shooting' ? 'scale-105' : ''}`}>
        {/* Tablero */}
        <div className="w-56 h-36 bg-white/10 backdrop-blur-md border-[6px] border-white rounded-xl flex flex-col items-center justify-center relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="w-24 h-18 border-4 border-white opacity-40 mb-6"></div>
          <div className="absolute bottom-0 w-full h-2 bg-red-600"></div>
          {/* Luces de racha */}
          {showFire && <div className="absolute inset-0 border-4 border-orange-500 animate-pulse shadow-[inset_0_0_20px_orange]"></div>}
        </div>
        
        {/* Aro y Red Animada */}
        <div className={`relative w-24 h-6 bg-gradient-to-r from-orange-700 to-orange-500 rounded-full -mt-3 shadow-2xl z-20 ${isRimShaking ? 'animate-bounce' : ''}`}>
           <div className={`absolute top-1 left-1/2 -translate-x-1/2 w-20 h-24 border-x-[3px] border-b-[3px] border-white/40 rounded-b-[2rem] transition-all duration-300 ${isRimShaking ? 'scale-y-125 opacity-100 bg-white/10' : 'opacity-40'}`}>
              <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
                 {Array.from({length: 16}).map((_, i) => <div key={i} className="border-[0.5px] border-white/20"></div>)}
              </div>
           </div>
        </div>
        
        {/* Defensor Refinado */}
        <div 
          className={`absolute top-32 transition-all duration-500 ease-out z-30 ${
            defenderPos === 'left' ? '-translate-x-40 scale-110' : 
            defenderPos === 'right' ? 'translate-x-40 scale-110' : 'translate-x-0'
          }`}
        >
          <div className="w-16 h-4 bg-blue-500 rounded-full shadow-[0_0_20px_rgba(0,108,255,0.6)] border-2 border-white/30 animate-pulse"></div>
          <div className="w-1 h-32 bg-gradient-to-t from-transparent to-blue-500/20 mx-auto -mt-32"></div>
        </div>
      </div>

      {/* Marcador Central Moderno */}
      <div className="absolute top-10 z-50 flex flex-col items-center">
        <div className="bg-black/60 backdrop-blur-2xl px-10 py-4 rounded-[2rem] border border-white/10 shadow-2xl flex items-center space-x-8">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Score</span>
            <span className="text-5xl font-black text-white italic tracking-tighter leading-none">{score}</span>
          </div>
          <div className="w-px h-10 bg-white/10"></div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-1">Streak</span>
            <div className="flex items-center space-x-1">
               <span className={`text-3xl font-black italic tracking-tighter leading-none ${showFire ? 'text-orange-500 animate-pulse' : 'text-white'}`}>{streak}</span>
               {showFire && <i className="fas fa-fire text-orange-500 animate-bounce text-xl"></i>}
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes de Impacto */}
      {message && (
        <div className="absolute top-1/2 -translate-y-1/2 z-[100] animate-in zoom-in-50 duration-200">
          <span className={`text-8xl font-black italic tracking-tighter drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)] ${
            message === '¡¡CANASTA!!' ? 'text-[#00FF00]' : 'text-white/60'
          }`}>
            {message}
          </span>
          {showFire && message === '¡¡CANASTA!!' && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex space-x-2">
               <i className="fas fa-star text-yellow-400 animate-ping"></i>
               <i className="fas fa-star text-yellow-400 animate-ping delay-75"></i>
               <i className="fas fa-star text-yellow-400 animate-ping delay-150"></i>
            </div>
          )}
        </div>
      )}

      {/* Balón Realista TV Style */}
      <div 
        className="absolute pointer-events-none z-40 transition-none"
        style={{ 
          left: `${ballPos.x}%`, 
          top: `${ballPos.y}%`, 
          transform: `translate(-50%, -50%) scale(${ballPos.scale}) rotate(${ballPos.rotate}deg)` 
        }}
      >
        {/* Sombra Dinámica */}
        <div 
          className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/40 blur-xl rounded-full transition-all duration-300"
          style={{ 
            width: `${100 * ballPos.shadowScale}px`, 
            height: `${20 * ballPos.shadowScale}px`,
            opacity: phase === 'shooting' ? 0.3 : 0.6
          }}
        ></div>

        {/* Cuerpo del Balón */}
        <div className="w-28 h-28 bg-[#d97706] rounded-full shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.4),0_20px_40px_rgba(0,0,0,0.5)] flex items-center justify-center border-[5px] border-[#92400e] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20"></div>
          {/* Textura */}
          <div className="w-full h-1 bg-black/30 absolute top-1/2 -translate-y-1/2"></div>
          <div className="w-1 h-full bg-black/30 absolute left-1/2 -translate-x-1/2"></div>
          <div className="absolute inset-4 border-[3px] border-black/10 rounded-full"></div>
          {/* Efecto Fuego */}
          {showFire && <div className="absolute inset-0 bg-orange-500/20 animate-pulse"></div>}
        </div>
      </div>

      {/* Interfaz de Control (Fases 1 y 2) */}
      {(phase === 'direction' || phase === 'power') && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-end pb-24 px-10">
          
          {/* Fase 1: Alineación (Péndulo Circular sobre el Aro) */}
          {phase === 'direction' && (
             <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-64 h-24 flex justify-center">
                <div 
                  className="w-12 h-12 border-4 border-[#006CFF] rounded-full shadow-[0_0_20px_#006CFF] flex items-center justify-center transition-none bg-white/5 backdrop-blur-sm"
                  style={{ transform: `translateX(${(dirAngle/40)*100}px)` }}
                >
                   <div className="w-2 h-2 bg-[#00FF00] rounded-full shadow-[0_0_10px_#00FF00]"></div>
                </div>
             </div>
          )}

          {/* Fase 2: Potencia Radial / Arco */}
          {phase === 'power' && (
            <div className="absolute right-14 top-1/2 -translate-y-1/2 h-80 flex items-center">
              <div className="relative h-full w-8 bg-white/5 backdrop-blur-xl rounded-full border border-white/20 overflow-hidden shadow-inner">
                <div className="absolute top-[40%] h-[20%] w-full bg-orange-500/40 border-y-2 border-orange-500 shadow-[0_0_25px_rgba(251,146,60,0.5)]"></div>
                <div 
                  className="absolute left-0 w-full h-4 bg-[#006CFF] shadow-[0_0_20px_#006CFF] z-10"
                  style={{ top: `${pwrValue}%`, transform: 'translateY(-50%)' }}
                ></div>
              </div>
              <div className="flex flex-col justify-between h-full py-4 ml-6">
                 <span className="text-[10px] font-black text-white/40 uppercase rotate-90">Arco Alto</span>
                 <span className="text-[10px] font-black text-white/40 uppercase rotate-90">Arco Plano</span>
              </div>
            </div>
          )}

          {/* Botón Lateral Moderno */}
          <div className="absolute bottom-16 right-16 pointer-events-auto">
            <button 
              onClick={handleActionButton}
              className={`w-32 h-32 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center border-[8px] border-white active:scale-90 transition-all group overflow-hidden relative ${phase === 'direction' ? 'bg-[#006CFF]' : 'bg-[#00FF00]'}`}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
              <i className={`fas ${phase === 'direction' ? 'fa-bullseye' : 'fa-basketball-ball'} text-4xl ${phase === 'direction' ? 'text-white' : 'text-[#001F3F]'} mb-2`}></i>
              <span className={`text-[12px] font-black uppercase tracking-widest ${phase === 'direction' ? 'text-white' : 'text-[#001F3F]'}`}>
                {phase === 'direction' ? 'Alinear' : 'Lanzar'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Footer Info / IA Hint */}
      <div className="absolute bottom-8 left-16 flex items-center space-x-4 opacity-40">
        <div className="w-3 h-3 bg-[#00FF00] rounded-full animate-ping"></div>
        <div className="flex flex-col">
           <span className="text-[12px] font-black text-white uppercase tracking-[0.4em] italic">IA Sports Analysis</span>
           <span className="text-[8px] font-bold text-white/50 uppercase tracking-widest">Calculando probabilidades reales...</span>
        </div>
      </div>
    </div>
  );
};

export default HoopsGame;
