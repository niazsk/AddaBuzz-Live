import React from 'react';
import { UsersRound } from 'lucide-react';
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
}

export const FollowingView: React.FC<FollowingViewProps> = ({
  rooms,
  users,
  followingUids,
  blockedUids,
  onToggleFollow,
  onJoinRoom,
  onOpenUserProfile,
}) => {
  const followedUsers = users.filter(
    (u) => followingUids.includes(u.uid) && !blockedUids.includes(u.uid)
  );
  const followedLiveRooms = rooms.filter(
    (r) => followingUids.includes(r.hostUid) && !blockedUids.includes(r.hostUid)
  );
  const recommendedCreators = users
    .filter(
      (u) =>
        !blockedUids.includes(u.uid) &&
        !followingUids.includes(u.uid) &&
        (u.isNewCreator || u.followersCount < 7000)
    )
    .slice(0, 4);

  const getHost = (uid: string) => users.find((u) => u.uid === uid) ?? users[0];

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-300 via-pink-500 to-fuchsia-600 ring-1 ring-white/25 shadow-lg shadow-rose-500/40">
            <UsersRound className="h-5 w-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-white">Friends</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live rooms and creators you follow across AddaBuzz Live.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold tabular-nums text-slate-300">
          {followedUsers.length} friends · {followedLiveRooms.length} live
        </span>
      </div>

      {followedUsers.length === 0 && (
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-8 text-center space-y-3">
          <p className="font-display text-lg font-semibold text-white">
            Your Friends feed is empty
          </p>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Follow creators from the recommendations below to see their live broadcasts, multi-guest rooms, and updates here.
          </p>
        </div>
      )}

      {followedUsers.length > 0 && (
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

      {recommendedCreators.length > 0 && (
        <section aria-label="New streamers" className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Recommended & New Creators
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recommendedCreators.map((creator) => (
              <StreamerCard
                key={creator.uid}
                user={creator}
                isFollowing={false}
                onToggleFollow={onToggleFollow}
                onOpenProfile={onOpenUserProfile}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
