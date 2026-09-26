
import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 40 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Circle with Gradient */}
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#001F3F" />
          <stop offset="100%" stopColor="#000A1A" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill="url(#logo-grad)" />
      
      {/* Motion Lines */}
      <path 
        d="M25 45H15" 
        stroke="#00FF00" 
        strokeWidth="4" 
        strokeLinecap="round" 
        className="animate-pulse"
      />
      <path 
        d="M20 55H10" 
        stroke="#00FF00" 
        strokeWidth="4" 
        strokeLinecap="round" 
        style={{ opacity: 0.6 }}
      />
      
      {/* The Velocity Checkmark */}
      <path 
        d="M35 50L48 63L75 35" 
        stroke="#00FF00" 
        strokeWidth="10" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="drop-shadow-[0_0_8px_rgba(0,255,0,0.8)]"
      />
      
      {/* Accent Sparkle */}
      <circle cx="75" cy="35" r="4" fill="#FF9500" />
    </svg>
  );
};

export default Logo;
