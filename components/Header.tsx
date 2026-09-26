
import React, { useState, useRef, useEffect } from 'react';
import Logo from './Logo';
import { Language, ThemeMode } from '../types';

interface HeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

const LANGUAGES: { code: Language; name: string; flag: string }[] = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

const THEMES: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Modo Claro', icon: 'fas fa-sun' },
  { mode: 'dark', label: 'Modo Oscuro', icon: 'fas fa-moon' },
  { mode: 'auto', label: 'Automático', icon: 'fas fa-desktop' },
];

const Header: React.FC<HeaderProps> = ({ currentLang, onLanguageChange, currentTheme, onThemeChange }) => {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const selectedLang = LANGUAGES.find(l => l.code === currentLang);
  const selectedTheme = THEMES.find(t => t.mode === currentTheme) || THEMES[2];

  return (
    <header className="bg-[#001F3F] dark:bg-black text-white py-5 shadow-2xl border-b border-emerald-500/20 dark:border-[#232323] relative z-[60] transition-colors duration-300">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Logo size={48} className="shadow-lg shadow-emerald-500/10" />
          <div className="hidden sm:block">
            <h1 className="text-2xl font-black tracking-tighter flex items-center">
              PICK<span className="text-[#00FF00] ml-1">MASTER</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-500/60 dark:text-[#FF3B30] leading-none">
              Elite Insights by IA
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Theme Selector (Dropdown) */}
          <div className="relative">
            <button 
              onClick={() => {
                setIsThemeOpen(!isThemeOpen);
                setIsLangOpen(false);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all font-bold text-sm bg-white/10 dark:bg-[#121212] border border-white/10 dark:border-[#232323] hover:bg-white/20`}
              title="Cambiar tema"
            >
              <i className={`${selectedTheme.icon} ${currentTheme === 'dark' ? 'text-[#FF3B30]' : currentTheme === 'light' ? 'text-yellow-400' : 'text-blue-400'}`}></i>
              <span className="hidden md:inline">{selectedTheme.label}</span>
              <i className={`fas fa-chevron-down text-[10px] opacity-40 transition-transform ${isThemeOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isThemeOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsThemeOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#232323] overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-20">
                  <div className="py-2">
                    {THEMES.map((t) => (
                      <button
                        key={t.mode}
                        onClick={() => {
                          onThemeChange(t.mode);
                          setIsThemeOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                          currentTheme === t.mode 
                            ? 'bg-emerald-50 dark:bg-[#1A1A1A] text-emerald-600 dark:text-[#00FF00] font-bold' 
                            : 'text-gray-700 dark:text-[#C8C8C8] hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <i className={`${t.icon} w-5 text-center ${currentTheme === t.mode ? 'opacity-100' : 'opacity-40'}`}></i>
                        <span className="text-sm">{t.label}</span>
                        {currentTheme === t.mode && (
                           <i className="fas fa-check text-[10px] ml-auto"></i>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Language Selector */}
          <div className="relative">
            <button 
              onClick={() => {
                setIsLangOpen(!isLangOpen);
                setIsThemeOpen(false);
              }}
              className="flex items-center space-x-2 bg-white/10 dark:bg-[#121212] hover:bg-white/20 px-4 py-2 rounded-xl border border-white/10 dark:border-[#232323] transition-all font-bold text-sm"
            >
              <span>{selectedLang?.flag}</span>
              <span className="hidden md:inline">{selectedLang?.name}</span>
              <i className={`fas fa-chevron-down text-[10px] transition-transform ${isLangOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isLangOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsLangOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#232323] overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-20">
                  <div className="py-2 max-h-[60vh] overflow-y-auto">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          onLanguageChange(lang.code);
                          setIsLangOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-emerald-50 dark:hover:bg-[#1A1A1A] transition-colors ${
                          currentLang === lang.code ? 'bg-emerald-50 dark:bg-[#1A1A1A] text-emerald-600 dark:text-[#00FF00] font-bold' : 'text-gray-700 dark:text-[#C8C8C8] font-medium'
                        }`}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span className="text-sm">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
