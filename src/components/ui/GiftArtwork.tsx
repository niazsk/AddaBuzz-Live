import React from 'react';

interface GiftArtworkProps {
  src: string;
  alt?: string;
  size?: number;
  className?: string;
}

export const GiftArtwork: React.FC<GiftArtworkProps> = ({
  src,
  alt = '',
  size = 48,
  className = '',
}) => (
  <img
    src={src}
    alt={alt}
    width={size}
    height={size}
    draggable={false}
    loading="lazy"
    className={`object-contain select-none ${className}`}
    style={{ width: size, height: size }}
  />
);