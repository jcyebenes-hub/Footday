
import React, { useState } from 'react';

interface TeamLogoProps {
  logoUrl: string;
  teamName: string;
  size?: number;
}

const TeamLogo: React.FC<TeamLogoProps> = ({ logoUrl, teamName, size = 40 }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !logoUrl) {
    const initials = (teamName || '')
      .split(' ')
      .filter(Boolean)
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    
    const hash = (teamName || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: `hsl(${hue}, 60%, 45%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: size * 0.4,
        flexShrink: 0
      }}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={teamName}
      onError={() => setHasError(true)}
      referrerPolicy="no-referrer"
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain',
        flexShrink: 0
      }}
    />
  );
};

export default TeamLogo;
