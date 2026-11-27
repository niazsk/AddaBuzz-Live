import React from 'react';

interface AvatarProps {
  name: string;
  color?: string;
  src?: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLiveRing?: boolean;
  isSpeaking?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-7 h-7 text-[11px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  color = '#6366F1',
  src,
  avatarUrl,
  size = 'md',
  isLiveRing = false,
  isSpeaking = false,
  className = '',
}) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div
      className={`avatar-chip relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-semibold text-white select-none ${
        SIZE_CLASSES[size]
      } ${
        isSpeaking
          ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-[#0D0F18]'
          : isLiveRing
          ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-[#0D0F18]'
          : 'border border-white/15'
      } ${className}`}
      style={{
        background: `linear-gradient(145deg, ${color}, #0F172A)`,
      }}
      aria-label={name}
    >
      {src || avatarUrl ? (
        <img src={src ?? avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials || 'AB'}</span>
      )}
    </div>
  );
};
