import React from 'react';
import { Eye, Users, Video, Mic } from 'lucide-react';
import { LiveRoom, UserProfile } from '../../types/app';
import { MediaImage } from '../ui/MediaImage';
import { Avatar } from '../ui/Avatar';

interface RoomCardProps {
  room: LiveRoom;
  host: UserProfile;
  onJoinRoom: (room: LiveRoom) => void;
  onOpenHostProfile: (user: UserProfile) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  host,
  onJoinRoom,
  onOpenHostProfile,
}) => {
  const occupiedSeats = room.seats.filter((s) => s.status === 'OCCUPIED').length;

  const modeLabel =
    room.mode === 'MULTI_GUEST'
      ? `Multi-Guest (${occupiedSeats}/8)`
      : room.mode === 'AUDIO'
      ? 'Audio Board'
      : 'Video Live';

  const ModeIcon = room.mode === 'MULTI_GUEST' ? Users : room.mode === 'AUDIO' ? Mic : Video;

  return (
    <article className="card-hover group rounded-2xl bg-gradient-to-b from-[#131726] to-[#0F121C] border border-white/[0.08] overflow-hidden flex flex-col">
      <button
        type="button"
        onClick={() => onJoinRoom(room)}
        className="relative aspect-[4/3] w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <MediaImage
          src={room.thumbnailUrl}
          alt={room.title}
          fallbackGradient={room.fallbackGradient}
          fallbackTitle={room.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090E] via-black/25 to-black/30" />
        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-violet-950/30 via-transparent to-sky-500/10" />

        {/* Live Status & Viewer Count */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600/95 to-violet-600/95 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white shadow-[0_6px_18px_-8px_rgba(244,63,94,0.8)] ring-1 ring-white/15">
            <span className="w-1.5 h-1.5 rounded-full bg-white live-dot" aria-hidden="true" />
            <span>LIVE</span>
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/65 backdrop-blur-sm px-2.5 py-1 text-xs font-mono tabular-nums text-slate-100">
            <Eye className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span>{room.viewerCount.toLocaleString()}</span>
          </span>
        </div>

        {/* Bottom Media Overlay Info */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-xs text-slate-200">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <ModeIcon className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span>{modeLabel}</span>
          </span>
          <span className="font-mono text-[11px] text-slate-300 tabular-nums">
            {room.startedAtLabel}
          </span>
        </div>
      </button>

      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => onJoinRoom(room)}
            className="text-left w-full"
          >
            <h3 className="font-display text-[15px] font-semibold text-white group-hover:text-sky-300 transition-colors line-clamp-2 leading-snug">
              {room.title}
            </h3>
          </button>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
            <span>{room.category}</span>
            <span aria-hidden="true">·</span>
            <span>{room.isPrivateFollowersOnly ? 'Followers' : 'Public Room'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenHostProfile(host)}
          className="flex items-center gap-2.5 pt-2 border-t border-white/[0.06] text-left hover:opacity-90 transition-opacity"
        >
          <Avatar name={host.displayName} color={host.avatarColor} size="xs" isLiveRing />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-200 truncate">{host.displayName}</p>
            <p className="text-[11px] text-slate-400 truncate">
              @{host.username} · {host.country}
            </p>
          </div>
        </button>
      </div>
    </article>
  );
};
