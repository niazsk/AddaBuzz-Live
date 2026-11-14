import React from 'react';

interface BrandLogoProps {
  compact?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ compact = false }) => {
  return (
    <div className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <svg
        width="32"
        height="32"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="addabuzz-prism" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="55%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="11" fill="#121521" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        <path
          d="M12.5 20C12.5 15.8579 15.8579 12.5 20 12.5C24.1421 12.5 27.5 15.8579 27.5 20C27.5 24.1421 24.1421 27.5 20 27.5"
          stroke="url(#addabuzz-prism)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M17.5 16L25 20L17.5 24V16Z"
          fill="#38BDF8"
        />
      </svg>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight text-white">
          AddaBuzz <span className="text-sky-400">Live</span>
        </span>
      )}
    </div>
  );
};
