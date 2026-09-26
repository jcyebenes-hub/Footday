
import React, { useState, useEffect, useRef } from 'react';

interface PenaltyGameProps {
  onGoal?: () => void;
}

type GamePhase = 'direction' | 'power' | 'shooting' | 'result';

const PenaltyGame: React.FC<PenaltyGameProps> = ({ onGoal }) => {
  const [phase, setPhase] = useState<GamePhase>('direction');
  const [dirAngle, setDirAngle] = useState(0); // -45 to 45 degrees
  const [pwrValue, setPwrValue] = useState(50); // 0-100
  const [ballPos, setBallPos] = useState({ x: 50, y: 85, scale: 1, rotate: 0 });
  const [goaliePos, setGoaliePos] = useState<'left' | 'center' | 'right'>('center');
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');
  const [isNetShaking, setIsNetShaking] = useState(false);

  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(null);

  // Ciclo de animación principal
  const animate = (time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = time - startTimeRef.current;

    if (phase === 'direction') {
      // Péndulo de dirección: -45 a 45 grados (Arco moderado 1B)
      const angle = Math.sin(elapsed * 0.004) * 45;
      setDirAngle(angle);
    } else if (phase === 'power') {
      // Barra de potencia lateral: 0 a 100
      const power = 50 + Math.sin(elapsed * 0.008) * 50;
      setPwrValue(power);
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
      executePenalty();
    }
  };

  const executePenalty = () => {
    setPhase('shooting');
    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    // IA del Portero - Configuración 2C
    const goalieDecisionTime = Math.random();
    const isEarlyJump = goalieDecisionTime < 0.4; // 40% se adelanta
    
    const goalieMoves: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
    const jumpDir = goalieMoves[Math.floor(Math.random() * goalieMoves.length)];

    if (isEarlyJump) {
      setGoaliePos(jumpDir);
    }

    // Cálculo de Precisión
    const dirAbs = Math.abs(dirAngle); // 0 es el centro perfecto (Verde)
    const pwrAbs = Math.abs(50 - pwrValue); // 0 es el centro perfecto (Verde)

    // Determinar Destino del Balón
    // Mapear ángulo -45/45 a coordenadas de portería (aprox 25% a 75% del ancho)
    const targetX = 50 + (dirAngle / 45) * 30;
    const targetY = 20 + (100 - pwrValue) * 0.15; // Más potencia = más alto

    let result: 'goal' | 'save' | 'out' = 'out';

    // Matriz de resultados
    const isDirGreen = dirAbs < 8;
    const isPwrGreen = pwrAbs < 10;
    const isDirOk = dirAbs < 20;
    const isPwrHigh = pwrValue > 80;
    const isPwrLow = pwrValue < 25;

    if (isDirGreen && isPwrGreen) {
      result = 'goal'; // Golazo a la escuadra
    } else if (isDirGreen && isPwrHigh) {
      result = 'goal'; // Entra por potencia
    } else if (isDirGreen && isPwrLow) {
      result = 'save'; // Parada fácil
    } else if (isDirOk && isPwrGreen) {
      result = Math.random() > 0.5 ? 'goal' : 'save'; // Poste o roce
    } else if (dirAbs > 35) {
      result = 'out'; // Fuera
    } else {
      result = 'save';
    }

    // Si el portero saltó tarde (60%), decidir ahora
    if (!isEarlyJump) {
      setTimeout(() => {
        // El portero intenta reaccionar a la dirección del balón
        if (result === 'save') {
           setGoaliePos(targetX < 45 ? 'left' : targetX > 55 ? 'right' : 'center');
        } else {
           setGoaliePos(jumpDir);
        }
      }, 100);
    }

    // Animación de Vuelo
    setBallPos({
      x: targetX,
      y: targetY,
      scale: 0.3,
      rotate: 1440
    });

    // Resultado final
    setTimeout(() => {
      if (result === 'goal') {
        setScore(s => s + 1);
        setMessage('¡¡GOL!!');
        setIsNetShaking(true);
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        if (onGoal) onGoal();
      } else if (result === 'save') {
        setMessage('PARADA');
      } else {
        setMessage('FUERA');
      }
      
      setPhase('result');
      setTimeout(resetCycle, 1500);
    }, 600);
  };

  const resetCycle = () => {
    setPhase('direction');
    setBallPos({ x: 50, y: 85, scale: 1, rotate: 0 });
    setGoaliePos('center');
    setMessage('');
    setIsNetShaking(false);
    startTimeRef.current = null;
  };

  return (
    <div className="relative w-full h-full bg-[#001F3F] overflow-hidden flex flex-col items-center font-['Inter'] select-none touch-none">
      
      {/* Fondo Estadio TV Style */}
      <div className="absolute inset-0 opacity-40">
        <div className="w-full h-1/2 bg-[#002a1a] border-b-[12px] border-white/30"></div>
        <div className="w-full h-1/2 bg-[#004d26]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#001F3F]"></div>
      </div>

      {/* Portería */}
      <div className={`absolute top-[18%] w-[75%] h-[32%] border-x-[8px] border-t-[8px] border-white z-10 ${isNetShaking ? 'animate-bounce shadow-[0_0_40px_rgba(255,255,255,0.4)] bg-white/10' : ''}`}>
        <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 opacity-20 pointer-events-none">
          {Array.from({ length: 72 }).map((_, i) => (
            <div key={i} className="border-[0.5px] border-white"></div>
          ))}
        </div>
        
        {/* Portero (Detalle Minimalista) */}
        <div 
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-28 transition-all duration-300 ease-out z-20 ${
            goaliePos === 'left' ? '-translate-x-36 -rotate-12' : 
            goaliePos === 'right' ? 'translate-x-36 rotate-12' : 'translate-x-0'
          }`}
        >
          <div className="w-full h-full flex flex-col items-center">
            <div className="w-10 h-10 bg-white rounded-full border-2 border-blue-400 mb-1 shadow-lg"></div>
            <div className="w-14 h-18 bg-blue-700 rounded-t-2xl border-x-4 border-white shadow-xl relative">
               <div className="absolute -left-6 top-2 w-6 h-12 bg-blue-600 rounded-full -rotate-12 border-l-2 border-white"></div>
               <div className="absolute -right-6 top-2 w-6 h-12 bg-blue-600 rounded-full rotate-12 border-r-2 border-white"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Marcador Central */}
      <div className="absolute top-10 flex flex-col items-center z-50">
        <div className="bg-white/10 backdrop-blur-xl px-8 py-3 rounded-3xl border border-white/20 shadow-2xl flex items-center space-x-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Score</span>
            <span className="text-[10px] font-black text-[#00FF00] uppercase">Goals</span>
          </div>
          <span className="text-5xl font-black text-white italic tracking-tighter leading-none">{score}</span>
        </div>
      </div>

      {/* Feedback de Resultado */}
      {message && (
        <div className="absolute top-1/2 -translate-y-1/2 z-[100] animate-in zoom-in-50 duration-200">
          <span className={`text-8xl font-black italic tracking-tighter drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)] ${
            message === '¡¡GOL!!' ? 'text-[#00FF00]' : message === 'PARADA' ? 'text-amber-400' : 'text-red-500'
          }`}>
            {message}
          </span>
        </div>
      )}

      {/* Balón Style TV */}
      <div 
        className="absolute transition-all duration-600 ease-out pointer-events-none z-40"
        style={{ 
          left: `${ballPos.x}%`, 
          top: `${ballPos.y}%`, 
          transform: `translate(-50%, -50%) scale(${ballPos.scale}) rotate(${ballPos.rotate}deg)` 
        }}
      >
        <div className="w-24 h-24 bg-white rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center border-4 border-slate-200 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-100 to-slate-300"></div>
          <div className="w-8 h-8 bg-slate-900 absolute top-2 left-8 rotate-45 rounded-sm opacity-90"></div>
          <div className="w-7 h-7 bg-slate-900 absolute bottom-4 left-4 rotate-12 rounded-sm opacity-90"></div>
          <div className="w-9 h-9 bg-slate-900 absolute top-10 right-2 -rotate-45 rounded-sm opacity-90"></div>
        </div>
        {phase !== 'shooting' && phase !== 'result' && (
           <div className="w-24 h-5 bg-black/40 blur-xl rounded-full mt-6 mx-auto animate-pulse"></div>
        )}
      </div>

      {/* Mecánicas de Juego */}
      {(phase === 'direction' || phase === 'power') && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-end pb-20 px-8">
          
          {/* FASE 1: Péndulo de Dirección */}
          {phase === 'direction' && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-52 w-px h-64 flex flex-col items-center">
               <div 
                 className="w-1.5 h-full bg-gradient-to-t from-[#006CFF] to-transparent shadow-[0_0_20px_#006CFF] origin-bottom transition-none"
                 style={{ 
                   transform: `rotate(${dirAngle}deg)`,
                   filter: 'drop-shadow(0 0 10px rgba(0,108,255,0.8))'
                 }}
               >
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#006CFF] rounded-full blur-[2px]"></div>
               </div>
               
               {/* Guía de Arco */}
               <div className="absolute top-0 w-80 h-1 bg-white/5 rounded-full overflow-hidden flex justify-center">
                  <div className="w-12 h-full bg-[#00FF00]/40 shadow-[0_0_10px_#00FF00]"></div>
               </div>
            </div>
          )}

          {/* FASE 2: Barra de Potencia */}
          {phase === 'power' && (
            <div className="absolute right-12 top-1/2 -translate-y-1/2 h-80 flex items-center">
              <div className="relative h-full w-6 bg-white/10 backdrop-blur-md rounded-full border border-white/20 overflow-hidden">
                <div className="absolute top-[40%] h-[20%] w-full bg-[#00FF00]/30 border-y border-[#00FF00]/50 shadow-[0_0_15px_#00FF00]"></div>
                <div 
                  className="absolute left-0 w-full h-3 bg-[#006CFF] shadow-[0_0_15px_#006CFF] z-10"
                  style={{ top: `${pwrValue}%`, transform: 'translateY(-50%)' }}
                ></div>
              </div>
              <div className="flex flex-col justify-between h-full py-2 ml-4">
                 <span className="text-[10px] font-black text-white/40 uppercase rotate-90">Max</span>
                 <span className="text-[10px] font-black text-white/40 uppercase rotate-90">Min</span>
              </div>
            </div>
          )}

          {/* Botón de Acción Principal (Pulgar Derecho) */}
          <div className="absolute bottom-12 right-12 pointer-events-auto">
            <button 
              onClick={handleActionButton}
              className="w-28 h-28 bg-[#00FF00] rounded-full shadow-[0_15px_40px_rgba(0,255,0,0.4)] flex flex-col items-center justify-center border-[6px] border-white active:scale-90 transition-all group"
            >
              <i className="fas fa-crosshairs text-3xl text-[#001F3F] mb-1 group-active:rotate-90 transition-transform"></i>
              <span className="text-[11px] font-black text-[#001F3F] uppercase tracking-tighter">
                {phase === 'direction' ? 'Fijar' : 'Chutar'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="absolute bottom-6 left-12 flex items-center space-x-3 opacity-50">
        <div className="w-2.5 h-2.5 bg-[#00FF00] rounded-full animate-pulse shadow-[0_0_10px_#00FF00]"></div>
        <span className="text-[11px] font-black text-white uppercase tracking-[0.3em]">IA Analysis Loading...</span>
      </div>
    </div>
  );
};

export default PenaltyGame;
