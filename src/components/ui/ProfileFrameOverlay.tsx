import React from 'react';
import { PROFILE_FRAME_BY_ID } from '../../data/profileFrames';

interface ProfileFrameOverlayProps {
  frameId?: string | null;
  className?: string;
}

/**
 * Renders a stylish frame around a profile avatar. `none`/unknown = nothing.
 * Parent must be `relative`.
 */
export const ProfileFrameOverlay: React.FC<ProfileFrameOverlayProps> = ({ frameId, className = '' }) => {
  if (!frameId || frameId === 'none') return null;
  const frame = PROFILE_FRAME_BY_ID.get(frameId);
  if (!frame || frame.id === 'none') return null;

  // PNG artwork frame: layer the image on top, filling the avatar box.
  if (frame.image) {
    return (
      <img
        src={frame.image}
        alt=""
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-1 h-[calc(100%+8px)] w-[calc(100%+8px)] object-contain ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute -inset-1 rounded-full ${className}`}
      style={{
        padding: '3px',
        background: frame.ring,
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        boxShadow: '0 0 14px rgba(168,85,247,0.45)',
      }}
    />
  );
};
