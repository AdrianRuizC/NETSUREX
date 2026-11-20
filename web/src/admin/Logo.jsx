import React from 'react';

const Logo = ({ size = 36, showText = true, className = '' }) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <img src="/netsurex-logo.svg" alt="" width={size} height={size} style={{ minWidth: size }} />
    {showText && (
      <span className="font-display text-xl font-bold tracking-tight text-foreground">
        Net<span className="text-gradient">Surex</span>
      </span>
    )}
  </span>
);

export default Logo;
