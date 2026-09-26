
import React, { useState, useRef, useEffect } from 'react';
import { Match, Language } from '../types';
// Fix: removed generateMatchPromoVideo as it is not exported by geminiService and not used in this component
import { generateVideoScript } from '../services/geminiService';

// Referencia visual para el usuario (Logo de Ody Lola Sound para el encabezado)
const ODY_LOLA_LOGO = "https://i.ibb.co/Lz0zZ2hF/odylola-logo.png";

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

interface VideoGeneratorProps {
  match: Match;
  prediction: string;
  lang: Language;
  onClose: () => void;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ match, prediction, lang, onClose }) => {
  const [mode, setMode] = useState<'selection' | 'video' | 'script' | 'watermark'>('selection');
  const [step, setStep] = useState<'idle' | 'generating' | 'result' | 'processing'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [scriptContent, setScriptContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Estados para Eliminación de Marca
  const [wmProgress, setWmProgress] = useState(0);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startScriptGen = async (shouldRedirect: boolean = false) => {
    setMode('script');
    setStep('generating');
    try {
      const content = await generateVideoScript(match, prediction, lang);
      setScriptContent(content);
      setStep('result');

      try {
        // Fix: corrected WriteText to writeText
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch (clipErr) {
        console.error("Error al copiar automáticamente:", clipErr);
      }

      if (shouldRedirect) {
        window.open('https://m.heygen.com/home', '_blank');
      }
    } catch (err) {
      setError("Error al generar el guion.");
      setStep('idle');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setStep('idle');
  };

  const processRemoveWatermark = async () => {
    if (!videoRef.current || !canvasRef.current || !videoUrl) return;

    setStep('processing');
    setWmProgress(0);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (video.readyState < 2) {
      await new Promise(resolve => video.onloadeddata = resolve);
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Configurar Audio
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(video);
    const destination = audioCtx.createMediaStreamDestination();
    source.connect(destination);
    
    const canvasStream = canvas.captureStream(30); 
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...destination.stream.getAudioTracks()
    ]);

    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    const recorder = new MediaRecorder(combinedStream, { 
      mimeType,
      videoBitsPerSecond: 6000000 
    });
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      setProcessedVideoUrl(URL.createObjectURL(blob));
      setStep('result');
      audioCtx.close();
    };

    const renderFrame = () => {
      if (video.paused || video.ended) return;

      // 1. Dibujar el vídeo original completo
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 2. Definir zona de la marca de agua (Cálculo idéntico a la posición anterior)
      const patchWidth = canvas.width * 0.16; 
      const patchHeight = canvas.height * 0.10;
      const margin = canvas.width * 0.03;

      const x = canvas.width - patchWidth - margin;
      const y = canvas.height - patchHeight - margin;

      // 3. Aplicar SMART BLUR PATCH (Eliminación)
      ctx.save();
      // Aplicar filtro de desenfoque pesado únicamente a la región
      ctx.filter = 'blur(40px)';
      // Dibujamos el trozo del vídeo sobre sí mismo con desenfoque para ocultar la marca
      ctx.drawImage(video, x, y, patchWidth, patchHeight, x, y, patchWidth, patchHeight);
      
      // Añadir una capa sólida sutil de mezcla
      ctx.filter = 'none';
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(x, y, patchWidth, patchHeight);
      ctx.restore();

      setWmProgress((video.currentTime / video.duration) * 100);
      requestAnimationFrame(renderFrame);
    };

    video.currentTime = 0;
    recorder.start();
    video.play().then(() => {
      renderFrame();
    });

    video.onended = () => {
      if (recorder.state !== 'inactive') recorder.stop();
    };
  };

  const copyToClipboard = () => {
    if (scriptContent) {
      navigator.clipboard.writeText(scriptContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#0D0D0D] w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white z-10">
          <i className="fas fa-times text-2xl"></i>
        </button>

        <div className="p-10 flex flex-col items-center text-center">
          
          {mode === 'selection' && (
            <div className="animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/20 mx-auto">
                <i className="fas fa-video text-white text-3xl"></i>
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">ESTUDIO DE VÍDEO</h3>
              <p className="text-gray-400 text-sm font-medium mb-8 leading-relaxed">
                Potencia tus vídeos eliminando marcas de agua o generando guiones virales con IA.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                <button 
                  onClick={() => startScriptGen(true)}
                  className="flex flex-col items-center p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-emerald-600 transition-all group"
                >
                  <i className="fas fa-robot text-3xl mb-3 text-emerald-500 group-hover:text-white"></i>
                  <span className="text-[10px] font-black uppercase text-white">IA (HEYGEN)</span>
                </button>

                <button 
                  onClick={() => startScriptGen(false)}
                  className="flex flex-col items-center p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-sky-600 transition-all group"
                >
                  <i className="fas fa-file-signature text-3xl mb-3 text-sky-500 group-hover:text-white"></i>
                  <span className="text-[10px] font-black uppercase text-white">GUION VIRAL</span>
                </button>

                <button 
                  onClick={() => setMode('watermark')}
                  className="flex flex-col items-center p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-red-600 transition-all group"
                >
                  <i className="fas fa-eraser text-3xl mb-3 text-red-500 group-hover:text-white"></i>
                  <span className="text-[10px] font-black uppercase text-white">QUITAR MARCA</span>
                </button>
              </div>
            </div>
          )}

          {mode === 'watermark' && step === 'idle' && (
            <div className="w-full animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <i className="fas fa-magic text-amber-500 text-xl"></i>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">ELIMINAR MARCA DE AGUA</h3>
              </div>
              
              {!videoUrl ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all group"
                >
                  <i className="fas fa-film text-4xl text-gray-500 mb-4 group-hover:text-red-500 transition-colors"></i>
                  <span className="text-xs font-black text-gray-400 uppercase">SUBIR VÍDEO A LIMPIAR</span>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="video/*" className="hidden" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                    <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" muted />
                    {/* Indicador de zona de limpieza */}
                    <div className="absolute bottom-4 right-4 w-24 h-12 border-2 border-red-500 border-dashed bg-red-500/10 flex items-center justify-center animate-pulse">
                      <span className="text-[8px] font-black text-white">ZONA DE BORRADO</span>
                    </div>
                  </div>
                  <button 
                    onClick={processRemoveWatermark} 
                    className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3"
                  >
                    <i className="fas fa-eraser"></i>
                    <span>INICIAR BORRADO INTELIGENTE</span>
                  </button>
                  <button onClick={() => setVideoUrl(null)} className="text-white/40 text-[10px] uppercase font-black hover:text-white transition-colors">Cambiar archivo</button>
                </div>
              )}
            </div>
          )}

          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center w-full">
              <div className="w-36 h-36 relative mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-white/5" />
                  <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={402} strokeDashoffset={402 - (402 * wmProgress) / 100} className="text-red-500 transition-all duration-300" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white">{Math.round(wmProgress)}%</span>
                </div>
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">BORRANDO CONTENIDO...</h3>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Limpiando píxeles en esquina inferior derecha</p>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {step === 'result' && processedVideoUrl && (
            <div className="w-full animate-in zoom-in-95 duration-500">
              <div className="flex items-center justify-center space-x-2 mb-6">
                <i className="fas fa-check-circle text-emerald-500"></i>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">VÍDEO LIMPIO</h3>
              </div>
              <div className="relative aspect-video max-h-[40vh] bg-black rounded-3xl overflow-hidden border border-white/10 mx-auto shadow-2xl mb-8">
                <video src={processedVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
              </div>
              <div className="flex gap-4">
                <a href={processedVideoUrl} download="Video_Limpio_PickMaster.mp4" className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl text-center hover:scale-105 transition-transform">DESCARGAR VÍDEO</a>
                <button onClick={onClose} className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-black text-xs uppercase hover:bg-white/20 transition-all">VOLVER</button>
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="py-12 flex flex-col items-center animate-in fade-in duration-700">
              <div className="relative mb-12">
                <div className="w-32 h-32 border-8 border-white/5 border-t-emerald-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="fas fa-brain text-white text-3xl animate-pulse"></i>
                </div>
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">GENERANDO GUION...</h3>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Integrando pronóstico en el guion</p>
            </div>
          )}
          
          {step === 'result' && mode === 'script' && scriptContent && (
            <div className="w-full animate-in zoom-in-95 duration-500 text-left">
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">GUION MAESTRO</h3>
                  {copied && <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest animate-pulse">✓ ¡Copiado al portapapeles!</span>}
                </div>
                <button onClick={copyToClipboard} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60'}`}>
                  {copied ? '¡COPIADO!' : 'COPIAR TEXTO'}
                </button>
              </div>
              <div className="bg-black/50 p-6 rounded-3xl border border-white/5 max-h-[50vh] overflow-y-auto custom-scrollbar">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{scriptContent}</pre>
              </div>
              <div className="mt-8 flex flex-col gap-3">
                <div className="flex gap-3">
                  <button onClick={() => window.open('https://m.heygen.com/home', '_blank')} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.02] transition-all">ABRIR HEYGEN</button>
                  <button onClick={onClose} className="flex-1 py-4 bg-white/5 text-white/60 rounded-2xl font-black text-xs uppercase border border-white/10">FINALIZAR</button>
                </div>
              </div>
            </div>
          )}

          {error && step === 'idle' && (
            <div className="animate-in shake duration-300 mt-4">
              <p className="text-red-500 text-xs font-bold mb-6">{error}</p>
              <button onClick={() => setMode('selection')} className="text-white underline text-xs">Volver al estudio</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;
