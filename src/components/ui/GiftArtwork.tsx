import React from 'react';
import { GiftCatalogItem } from '../../types/app';

interface GiftArtworkProps {
  artworkKey: GiftCatalogItem['artworkKey'];
  size?: number;
}

export const GiftArtwork: React.FC<GiftArtworkProps> = ({ artworkKey, size = 36 }) => {
  switch (artworkKey) {
    case 'rose':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="24" cy="24" r="21" fill="#2A123E" stroke="#A855F7" strokeOpacity="0.4" />
          <path
            d="M24 13C19.5 13 16 16.5 16 20.5C16 25.5 21 29 24 31C27 29 32 25.5 32 20.5C32 16.5 28.5 13 24 13Z"
            fill="#C084FC"
          />
          <path d="M24 31V38" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M24 34C26.5 34 28.5 32.5 29 31" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'crown':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="24" cy="24" r="21" fill="#1F1638" stroke="#8B5CF6" strokeOpacity="0.45" />
          <path
            d="M12 31L14.5 18L20.5 23L24 15L27.5 23L33.5 18L36 31H12Z"
            fill="#A78BFA"
            stroke="#E9D5FF"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <rect x="13" y="33" width="22" height="3" rx="1.5" fill="#38BDF8" />
        </svg>
      );
    case 'wave':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="24" cy="24" r="21" fill="#0F223A" stroke="#38BDF8" strokeOpacity="0.45" />
          <path d="M13 24V24M18 18V30M24 13V35M30 19V29M35 22V26" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'starburst':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="24" cy="24" r="21" fill="#132242" stroke="#60A5FA" strokeOpacity="0.45" />
          <path
            d="M24 11L27 20L36 20L29 25.5L31.5 34.5L24 29L16.5 34.5L19 25.5L12 20L21 20L24 11Z"
            fill="#60A5FA"
          />
        </svg>
      );
    case 'lantern':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="24" cy="24" r="21" fill="#2A1F10" stroke="#F59E0B" strokeOpacity="0.4" />
          <rect x="17" y="15" width="14" height="18" rx="6" fill="#FBBF24" fillOpacity="0.85" stroke="#FEF3C7" strokeWidth="1.5" />
          <path d="M24 11V15M21 35H27" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'guitar':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="24" cy="24" r="21" fill="#151C3B" stroke="#3B82F6" strokeOpacity="0.45" />
          <path
            d="M31 13L35 17L26 26C27 29 25.5 32.5 22 34C18.5 35.5 14.5 33.5 14 30C13.5 26.5 16 23.5 19.5 23.5L22 22L31 13Z"
            fill="#60A5FA"
            stroke="#DBEAFE"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
};
