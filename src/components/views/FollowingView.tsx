import React from 'react';
import { Compass } from 'lucide-react';
import { LiveRoom, UserProfile } from '../../types/app';
import { RoomCard } from '../cards/RoomCard';
import { StreamerCard } from '../cards/StreamerCard';

interface FollowingViewProps {
  rooms: LiveRoom[];
  users: UserProfile[];
  followingUids: string[];
  blockedUids: string[];
  onToggleFollow: (uid: string) => void;
  onJoinRoom: (room: LiveRoom) => void;
  onOpenUserProfile: (user: UserProfile) => void;
  onGoToDiscover: () => void;
}

export const FollowingView: React.FC<FollowingViewProps> = ({
  rooms,
  users,
  followingUids,
  blockedUids,
  onToggleFollow,
  onJoinRoom,
  onOpenUserProfile,
  onGoToDiscover,
}) => {
  const followedUsers = users.filter(
    (u) => followingUids.includes(u.uid) && !blockedUids.includes(u.uid)
  );
  const followedLiveRooms = rooms.filter(
    (r) => followingUids.includes(r.hostUid) && !blockedUids.includes(r.hostUid)
  );

  const getHost = (uid: string) => users.find((u) => u.uid === uid) ?? users[0];

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Friends Feed</h1>
          <p className="text-sm text-slate-400 mt-1">
            Live rooms and creators you follow across AddaBuzz Live.
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-400">
          {followedUsers.length} friends · {followedLiveRooms.length} live now
        </span>
      </div>

      {followedUsers.length === 0 ? (
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-10 text-center space-y-4">
          <p className="font-display text-lg font-semibold text-white">
            Your Friends feed is empty
          </p>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Follow hosts in Home to see their live broadcasts, multi-guest rooms, and creator updates here.
          </p>
          <button
            type="button"
            onClick={onGoToDiscover}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>Explore Creators</span>
          </button>
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="font-display text-base font-semibold text-white">
              Live From People You Follow
            </h2>
            {followedLiveRooms.length === 0 ? (
              <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-6 text-sm text-slate-400">
                None of the creators you follow are broadcasting right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {followedLiveRooms.map((room) => (
                  <RoomCard
                    key={room.roomId}
                    room={room}
                    host={getHost(room.hostUid)}
                    onJoinRoom={onJoinRoom}
                    onOpenHostProfile={onOpenUserProfile}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-base font-semibold text-white">
              Followed Creators
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {followedUsers.map((creator) => (
                <StreamerCard
                  key={creator.uid}
                  user={creator}
                  isFollowing={true}
                  onToggleFollow={onToggleFollow}
                  onOpenProfile={onOpenUserProfile}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
