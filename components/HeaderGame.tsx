
import React, { useState, useEffect, useRef } from 'react';

interface HeaderGameProps {
  progress: number;
  statusText: string;
}

type CharacterType = 'boy' | 'girl' | 'fox' | 'ninja' | 'panda';

const HeaderGame: React.FC<HeaderGameProps> = ({ progress, statusText }) => {
  const [score, setScore] = useState(0);
  const [ball, setBall] = useState({ x: 50, y: 35, vx: 0, vy: 0, rotation: 0 });
  const [playerX, setPlayerX] = useState(50);
  const [isJumping, setIsJumping] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [highScore, setHighScore] = useState(0);
  const [character, setCharacter] = useState<CharacterType>('boy');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const chars: CharacterType[] = ['boy', 'girl', 'fox', 'ninja', 'panda'];
    setCharacter(chars[Math.floor(Math.random() * chars.length)]);
  }, []);

  const gravity = 0.035;
  const bounceForce = -3.0;
  const friction = 0.985;
  const maxHeight = 25;

  useEffect(() => {
    const initAudio = () => {
      if (audioCtxRef.current) return;
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    };
    const handleInteraction = () => {
      initAudio();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  const playSfx = (type: 'hit' | 'fail') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const vol = 0.08; 
    if (type === 'hit') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    }
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  useEffect(() => {
    const update = () => {
      setBall((prev) => {
        let newVy = prev.vy + gravity;
        let newY = prev.y + newVy;
        let newX = prev.x + prev.vx;
        let newRotation = prev.rotation + prev.vx * 3;
        if (newY < maxHeight) { newY = maxHeight; newVy = 0.2; }
        if (newX < 5) { newX = 5; prev.vx *= -0.7; }
        if (newX > 95) { newX = 95; prev.vx *= -0.7; }
        const playerWidth = 22;
        const playerTop = 76;
        const ballRadius = 4;
        if (newY + ballRadius > playerTop && newY < playerTop + 5 && newX > playerX - playerWidth / 2 && newX < playerX + playerWidth / 2 && newVy > 0) {
          newY = playerTop - ballRadius;
          newVy = bounceForce;
          const hitDiff = (newX - playerX) / (playerWidth / 2);
          const newVx = hitDiff * 3.5; 
          handleTouch();
          return { ...prev, x: newX, y: newY, vy: newVy, vx: newVx, rotation: newRotation };
        }
        if (newY > 105) { playSfx('fail'); resetBall(); return { x: 50, y: 20, vx: 0, vy: 0.5, rotation: 0 }; }
        return { ...prev, x: newX, y: newY, vy: newVy, vx: prev.vx * friction, rotation: newRotation };
      });
      requestRef.current = requestAnimationFrame(update);
    };
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [playerX]);

  const handleTouch = () => {
    setScore((s) => {
      const newScore = s + 1;
      if (newScore > highScore) setHighScore(newScore);
      if (newScore === 5) setFeedback('¡BUENA!');
      else if (newScore === 10) setFeedback('¡CRACK!');
      else if (newScore === 20) setFeedback('¡LEYENDA!');
      setTimeout(() => setFeedback(''), 800);
      return newScore;
    });
    setIsJumping(true);
    playSfx('hit');
    setTimeout(() => setIsJumping(false), 200);
    if ('vibrate' in navigator) navigator.vibrate(8);
  };

  const resetBall = () => { setScore(0); setFeedback(''); };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = ((clientX - rect.left) / rect.width) * 100;
    setPlayerX(Math.max(10, Math.min(90, x)));
  };

  const renderCharacter = () => {
    const commonClasses = `absolute bottom-[10%] w-32 h-40 transition-transform duration-75 flex flex-col items-center z-30`;
    const jumpStyle = isJumping ? 'translateY(-20px) scale(1.1)' : '';
    
    switch (character) {
      case 'fox':
        return (
          <div className={commonClasses} style={{ left: `${playerX}%`, transform: `translateX(-50%) ${jumpStyle}` }}>
            <div className="absolute -top-10 flex space-x-14">
              <div className="w-10 h-16 bg-[#D35400] rounded-t-full rotate-[-15deg] border-b-8 border-white"></div>
              <div className="w-10 h-16 bg-[#D35400] rounded-t-full rotate-[15deg] border-b-8 border-white"></div>
            </div>
            <div className="w-24 h-24 bg-[#E67E22] rounded-[2.5rem] border-b-8 border-[#D35400] relative shadow-xl overflow-hidden">
              <div className="absolute -bottom-2 left-0 w-full h-12 bg-white rounded-t-full opacity-90"></div>
              <div className="absolute top-10 left-6 w-3 h-3 bg-black rounded-full"></div>
              <div className="absolute top-10 right-6 w-3 h-3 bg-black rounded-full"></div>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4 h-3 bg-black rounded-full"></div>
            </div>
            <div className="w-18 h-20 bg-[#D35400] rounded-t-3xl -mt-4 border-x-4 border-white"></div>
          </div>
        );
      case 'ninja':
        return (
          <div className={commonClasses} style={{ left: `${playerX}%`, transform: `translateX(-50%) ${jumpStyle}` }}>
            <div className="w-24 h-24 bg-[#1A1A1A] rounded-3xl border-b-8 border-black relative shadow-xl flex flex-col items-center justify-center">
              <div className="w-20 h-6 bg-[#333] rounded-full mt-2 flex items-center justify-center space-x-6 overflow-hidden">
                 <div className="w-4 h-4 bg-white rounded-full"><div className="w-2 h-2 bg-black rounded-full m-1"></div></div>
                 <div className="w-4 h-4 bg-white rounded-full"><div className="w-2 h-2 bg-black rounded-full m-1"></div></div>
              </div>
              <div className="absolute -top-2 w-28 h-4 bg-red-600 rounded-full"></div>
            </div>
            <div className="w-18 h-20 bg-[#1A1A1A] rounded-t-2xl -mt-2 border-x-8 border-red-600"></div>
          </div>
        );
      case 'panda':
        return (
          <div className={commonClasses} style={{ left: `${playerX}%`, transform: `translateX(-50%) ${jumpStyle}` }}>
            <div className="absolute -top-4 flex space-x-14">
              <div className="w-8 h-8 bg-black rounded-full"></div>
              <div className="w-8 h-8 bg-black rounded-full"></div>
            </div>
            <div className="w-26 h-26 bg-white rounded-full border-b-8 border-gray-200 relative shadow-xl overflow-hidden">
              <div className="absolute top-8 left-5 w-6 h-8 bg-black rounded-full rotate-12 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div className="absolute top-8 right-5 w-6 h-8 bg-black rounded-full -rotate-12 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-4 h-3 bg-black rounded-full"></div>
            </div>
            <div className="w-20 h-22 bg-black rounded-t-2xl -mt-4 border-x-8 border-white"></div>
          </div>
        );
      case 'girl':
        return (
          <div className={commonClasses} style={{ left: `${playerX}%`, transform: `translateX(-50%) ${jumpStyle}` }}>
            <div className="w-24 h-24 bg-[#FFDBAC] rounded-[2.5rem] border-b-8 border-[#E0AC69] relative shadow-xl overflow-hidden">
              <div className="absolute -top-2 left-0 w-full h-14 bg-[#4B2C20] rounded-t-[3rem]"></div>
              <div className="absolute top-2 right-0 w-12 h-20 bg-[#4B2C20] rounded-l-full"></div>
              <div className="absolute top-12 left-5 w-4 h-4 bg-white rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-black rounded-full"></div></div>
              <div className="absolute top-12 right-5 w-4 h-4 bg-white rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-black rounded-full"></div></div>
            </div>
            <div className="w-18 h-20 bg-pink-500 rounded-t-2xl -mt-2 border-x-8 border-white"></div>
          </div>
        );
      default: // boy
        return (
          <div className={commonClasses} style={{ left: `${playerX}%`, transform: `translateX(-50%) ${jumpStyle}` }}>
            <div className="w-24 h-24 bg-[#FFDBAC] rounded-[2.5rem] border-b-8 border-[#E0AC69] relative shadow-xl overflow-hidden">
              <div className="absolute -top-4 left-0 w-full h-12 bg-[#001F3F] rounded-t-[4rem]"></div>
              <div className="absolute top-12 left-5 w-4 h-4 bg-white rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-black rounded-full"></div></div>
              <div className="absolute top-12 right-5 w-4 h-4 bg-white rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-black rounded-full"></div></div>
            </div>
            <div className="w-18 h-20 bg-blue-600 rounded-t-2xl -mt-2 border-x-8 border-white"></div>
          </div>
        );
    }
  };

  return (
    <div ref={containerRef} onMouseMove={handleMove} onTouchMove={handleMove} className="relative w-full h-full bg-gradient-to-b from-[#0a192f] to-[#001F3F] overflow-hidden select-none touch-none flex flex-col items-center font-['Inter']">
      <div className="absolute inset-0">
        <div className="absolute bottom-0 w-full h-1/4 bg-emerald-900 border-t-8 border-emerald-800"></div>
        <div className="absolute bottom-0 w-full h-1/6 bg-emerald-800/20 grid grid-cols-12 gap-0">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="border-r border-white/5 skew-x-12"></div>)}
        </div>
        <div className="absolute bottom-1/4 w-full flex justify-around items-end opacity-10 px-2 h-10">
           {[...Array(24)].map((_, i) => (
             <div key={i} className="w-3 h-6 bg-white rounded-t-full animate-bounce" style={{ animationDelay: `${i * 0.1}s`, animationDuration: '2.5s' }}></div>
           ))}
        </div>
        <div className="absolute top-8 left-8 w-1 h-1 bg-white rounded-full shadow-[0_0_15px_white] animate-pulse"></div>
        <div className="absolute top-12 right-12 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_20px_white] animate-pulse delay-500"></div>
      </div>
      <div className="absolute top-12 left-0 w-full z-50 flex flex-col items-center">
        <div className="w-[90%] max-w-xl relative">
          <div className="absolute -inset-1 bg-white/10 blur-xl rounded-3xl"></div>
          <div className="h-16 bg-black/70 backdrop-blur-2xl rounded-3xl border-4 border-white/20 overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.8)] flex items-center relative">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-white transition-all duration-1000 ease-out relative" style={{ width: `${progress}%` }}>
              <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-sm md:text-lg font-black text-white uppercase tracking-[0.4em] italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {statusText} <span className="text-emerald-400 ml-2">{Math.round(progress)}%</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-48 z-10 flex flex-col items-center">
        <div className="bg-black/60 backdrop-blur-xl px-12 py-4 rounded-3xl border-b-[6px] border-blue-600/50 transform -skew-x-12 flex items-baseline shadow-2xl">
           <span className="text-6xl font-black text-emerald-400 italic tracking-tighter drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">{score}</span>
           <span className="text-xs uppercase text-white/60 font-black ml-4 tracking-[0.2em]">Toques</span>
        </div>
        {feedback && (
          <div className="mt-8 transform scale-150 animate-bounce">
            <span className="text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.7)]">{feedback}</span>
          </div>
        )}
      </div>
      <div className="absolute w-16 h-16 z-40 transition-none" style={{ left: `${ball.x}%`, top: `${ball.y}%`, transform: `translate(-50%, -50%) rotate(${ball.rotation}deg)` }}>
        <div className="w-full h-full bg-white rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.5)] border-[6px] border-gray-100 flex items-center justify-center relative overflow-hidden">
           <div className="absolute inset-0 opacity-80 scale-110">
              <div className="w-6 h-6 bg-slate-900 rotate-12 rounded-sm absolute top-1 left-4"></div>
              <div className="w-6 h-6 bg-slate-900 -rotate-45 rounded-sm absolute bottom-2 left-1"></div>
              <div className="w-6 h-6 bg-slate-900 rotate-45 rounded-sm absolute top-5 right-2"></div>
           </div>
           <div className="absolute top-2 left-3 w-5 h-3 bg-white/80 rounded-full rotate-[-45deg]"></div>
        </div>
      </div>
      <div className="absolute bottom-[20%] h-4 bg-black/30 blur-2xl rounded-full transition-all duration-75" style={{ left: `${ball.x}%`, width: `${Math.max(15, 70 - ball.y / 1.5)}px`, transform: 'translateX(-50%)', opacity: Math.max(0, 0.7 - ball.y / 100) }}></div>
      {renderCharacter()}
      <div className="absolute bottom-8 left-0 w-full flex flex-col items-center opacity-40">
        <div className="flex items-center space-x-6">
           <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
           <span className="text-[10px] font-black text-white uppercase tracking-[0.5em]">PickMaster Core Engine Active</span>
           <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping delay-500"></span>
        </div>
        <div className="mt-2 text-[8px] font-bold text-white/50 uppercase tracking-widest italic">Personal Record: {highScore}</div>
      </div>
      <style>{`@keyframes shimmer { 0% { transform: translateX(-150%); } 100% { transform: translateX(150%); } }`}</style>
    </div>
  );
};

export default HeaderGame;
