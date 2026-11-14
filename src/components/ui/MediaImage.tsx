import React, { useState } from 'react';
import { Radio } from 'lucide-react';

interface MediaImageProps {
  src?: string;
  alt: string;
  fallbackGradient: string;
  fallbackTitle?: string;
  className?: string;
}

export const MediaImage: React.FC<MediaImageProps> = ({
  src,
  alt,
  fallbackGradient,
  fallbackTitle,
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden ${className}`}
        style={{ background: fallbackGradient }}
        role="img"
        aria-label={alt}
      >
        <div className="flex flex-col items-center gap-2 px-4 text-center opacity-80">
          <Radio className="w-7 h-7 text-sky-300" aria-hidden="true" />
          {fallbackTitle && (
            <span className="text-xs font-medium text-slate-200 line-clamp-2 max-w-[20ch]">
              {fallbackTitle}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
