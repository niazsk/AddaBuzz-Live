import React from 'react';

interface BrandLogoProps {
  compact?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ compact = false }) => {
  return (
    <div className="inline-flex items-center gap-3 whitespace-nowrap shrink-0 select-none">
      <span className="relative inline-flex shrink-0">
        <span
          aria-hidden="true"
          className="absolute inset-0.5 rounded-[12px] bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-400 opacity-60 blur-[7px]"
        />
        <svg
          width="34"
          height="34"
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="relative shrink-0 drop-shadow-[0_4px_10px_rgba(56,120,248,0.35)]"
        >
          <defs>
            <linearGradient id="addabuzz-brand-bg" x1="4" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#0EA5E9" />
            </linearGradient>
            <linearGradient id="addabuzz-brand-sheen" x1="22" y1="2" x2="22" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="1.5" y="1.5" width="41" height="41" rx="13" fill="url(#addabuzz-brand-bg)" />
          <rect x="1.5" y="1.5" width="41" height="41" rx="13" fill="url(#addabuzz-brand-sheen)" />
          <rect
            x="1.5"
            y="1.5"
            width="41"
            height="41"
            rx="13"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1.2"
          />
          <path
            d="M22 13.5C27.5228 13.5 32 17.4772 32 22.5C32 27.5228 27.5228 31.5 22 31.5C20.4 31.5 18.8883 31.1707 17.55 30.5761L13.5 32.5L14.318 28.1602C13.1842 26.5738 12.5 24.6162 12.5 22.5C12.5 17.4772 16.4772 13.5 22 13.5Z"
            fill="rgba(9,16,33,0.28)"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M19.6 18.6L26.2 22.5L19.6 26.4V18.6Z" fill="#FFFFFF" />
          <circle cx="33.5" cy="10.5" r="2.6" fill="#FDE68A" stroke="rgba(9,16,33,0.35)" strokeWidth="0.8" />
        </svg>
      </span>
      {!compact && (
        <span className="flex items-center gap-2">
          <span className="relative font-display text-[18px] font-black leading-none tracking-[-0.05em] min-[420px]:text-[21px]">
            <span
              aria-hidden="true"
              className="absolute inset-x-0 -bottom-1 h-[7px] rounded-full bg-gradient-to-r from-violet-500/40 via-sky-400/35 to-transparent blur-[6px]"
            />
            <span className="relative bg-[linear-gradient(96deg,#FFFFFF_0%,#DDD6FE_42%,#93C5FD_74%,#67E8F9_100%)] bg-clip-text text-transparent drop-shadow-[0_1px_16px_rgba(129,140,248,0.35)]">
              AddaBuzz
            </span>
          </span>
          <span className="hidden items-center gap-[5px] rounded-full border border-rose-400/25 bg-gradient-to-r from-rose-500/15 via-fuchsia-500/10 to-transparent px-2 py-[3px] min-[420px]:flex">
            <span className="live-dot h-[5px] w-[5px] rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]" />
            <span className="bg-gradient-to-r from-rose-200 to-fuchsia-200 bg-clip-text text-[8px] font-black uppercase leading-none tracking-[0.28em] text-transparent">
              Live
            </span>
          </span>
        </span>
      )}
    </div>
  );
};
