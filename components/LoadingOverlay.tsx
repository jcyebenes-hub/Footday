
import React, { useState, useEffect } from 'react';
import HeaderGame from './HeaderGame';
import HoopsGame from './HoopsGame';
import { Sport } from '../types';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  sport?: Sport;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, message, sport = 'football' }) => {
  const [showGame, setShowGame] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer: any;
    let progressInterval: any;

    if (isLoading) {
      setProgress(0);
      setShowGame(false);
      
      // Simular progreso suave basado en etapas
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 92) return prev + Math.random() * 0.8;
          return prev;
        });
      }, 150);

      // Activar minijuego tras un breve delay para impacto visual
      timer = setTimeout(() => {
        setShowGame(true);
      }, 800);
    } else {
      setProgress(100);
      setTimeout(() => {
        setShowGame(false);
        setProgress(0);
      }, 400);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isLoading]);

  if (!isLoading && progress < 100) return null;

  const currentStatus = progress < 25 ? "Analizando datos globales..." : 
                        progress < 50 ? "Consultando fuentes expertas..." : 
                        progress < 75 ? "Preparando picks premium..." : 
                        progress < 95 ? "Finalizando análisis IA..." : "¡Carga completada!";

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#001F3F] transition-opacity duration-500 ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {showGame ? (
        <div className="w-full h-full max-w-lg mx-auto overflow-hidden relative shadow-2xl border-x border-white/5 animate-in fade-in zoom-in-95 duration-700">
          {sport === 'football' ? (
            <HeaderGame progress={progress} statusText={currentStatus} />
          ) : (
            <HoopsGame />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center p-12 text-center animate-in zoom-in-95 duration-500">
          <div className="relative mb-12">
            <div className={`w-36 h-36 border-8 border-white/5 ${sport === 'football' ? 'border-t-emerald-500' : 'border-t-orange-500'} rounded-full animate-spin`}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.2)] animate-bounce">
                <i className={`fas ${sport === 'football' ? 'fa-futbol' : 'fa-basketball-ball'} text-4xl ${sport === 'football' ? 'text-[#001F3F]' : 'text-orange-500'}`}></i>
              </div>
            </div>
          </div>
          <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4 drop-shadow-lg">
            {message || 'Procesando Inteligencia...'}
          </h3>
          <div className="flex items-center space-x-3">
            <div className={`w-2.5 h-2.5 ${sport === 'football' ? 'bg-emerald-500' : 'bg-orange-500'} rounded-full animate-pulse shadow-[0_0_10px_currentColor]`}></div>
            <p className="text-white/40 font-black text-[12px] uppercase tracking-[0.5em]">
              PickMaster Core Engine v4.2
            </p>
          </div>
          
          <div className="w-72 h-3 bg-black/40 rounded-full mt-12 overflow-hidden border border-white/5 p-0.5">
            <div 
              className={`h-full ${sport === 'football' ? 'bg-emerald-500' : 'bg-orange-500'} rounded-full transition-all duration-300 shadow-[0_0_15px_currentColor]`} 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingOverlay;
