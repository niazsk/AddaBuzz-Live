import React from 'react';
import { Bell, Eye, Radio, Search, Users, Play, X } from 'lucide-react';
import { LiveRoom, RoomCategory, RoomMode, UserProfile } from '../../types/app';
import { ROOM_CATEGORIES } from '../../data/previewData';
import { RoomCard } from '../cards/RoomCard';
import { MediaImage } from '../ui/MediaImage';
import { Avatar } from '../ui/Avatar';

interface DiscoverViewProps {
  rooms: LiveRoom[];
  users: UserProfile[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: RoomCategory;
  onSelectCategory: (cat: RoomCategory) => void;
  selectedMode: 'ALL' | RoomMode;
  onSelectMode: (mode: 'ALL' | RoomMode) => void;
  blockedUids: string[];
  onJoinRoom: (room: LiveRoom) => void;
  onOpenUserProfile: (user: UserProfile) => void;
  onOpenNotifications: () => void;
  onOpenGoLive: () => void;
  unreadNotificationsCount: number;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  rooms,
  users,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  selectedMode,
  onSelectMode,
  blockedUids,
  onJoinRoom,
  onOpenUserProfile,
  onOpenNotifications,
  onOpenGoLive,
  unreadNotificationsCount,
}) => {
  const getHost = (hostUid: string): UserProfile =>
    users.find((u) => u.uid === hostUid) ?? {
      uid: hostUid,
      platformId: 'AB-HOST',
      username: 'host',
      displayName: 'Live Host',
      bio: '',
      country: 'USA',
      gender: 'Prefer not to say',
      accountType: 'USER',
      avatarColor: '#6366F1',
      coverGradient: 'linear-gradient(135deg, #2E1065 0%, #1E3A8A 100%)',
      followersCount: 0,
      followingCount: 0,
      visitorsCount: 0,
      isOnline: true,
      showPresence: true,
      lastActiveLabel: 'Live now',
    };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const visibleRooms = rooms.filter((room) => {
    if (blockedUids.includes(room.hostUid)) return false;
    const host = getHost(room.hostUid);
    const matchesCategory =
      selectedCategory === 'All' || room.category === selectedCategory;
    const matchesMode = selectedMode === 'ALL' || room.mode === selectedMode;
    const matchesQuery =
      !normalizedQuery ||
      room.title.toLowerCase().includes(normalizedQuery) ||
      room.category.toLowerCase().includes(normalizedQuery) ||
      host.displayName.toLowerCase().includes(normalizedQuery) ||
      host.username.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesMode && matchesQuery;
  });

  const featuredRoom =
    rooms.find((r) => r.isFeatured && !blockedUids.includes(r.hostUid)) ?? visibleRooms[0];
  const featuredHost = featuredRoom ? getHost(featuredRoom.hostUid) : undefined;

  return (
    <div className="space-y-8 pb-8">
      {/* Desktop Top Utility Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xl">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search live rooms, creators, or categories..."
            aria-label="Search live rooms and creators"
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#111420]/90 border border-white/[0.08] focus:border-sky-400/60 focus:ring-2 focus:ring-sky-500/15 focus:outline-none text-sm text-white placeholder:text-slate-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label="Notifications"
            className="relative h-10 px-3.5 rounded-xl bg-[#111420] border border-white/[0.08] hover:border-white/15 text-slate-200 hover:text-white inline-flex items-center gap-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <Bell className="w-4 h-4 text-sky-400" />
            <span>Alerts</span>
            {unreadNotificationsCount > 0 && (
              <span className="font-mono tabular-nums text-sky-400 font-semibold">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Empty state (only shown when there are 0 live rooms) */}
      {rooms.length === 0 && (
        <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-8 text-center space-y-4">
          <h1 className="font-display text-2xl font-bold text-white">
            No live rooms right now
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Be the first one to go live and start the conversation.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenGoLive}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-500 hover:from-violet-500 hover:via-indigo-500 hover:to-sky-400 text-white text-sm font-medium inline-flex items-center gap-2 shadow-[0_16px_34px_-20px_rgba(99,102,241,0.95)]"
            >
              <Radio className="w-4 h-4" />
              <span>Start First Live Room</span>
            </button>
          </div>
        </section>
      )}

      {/* Hero Featured Live Spotlight */}
      {featuredRoom && featuredHost && !normalizedQuery && selectedCategory === 'All' && (
        <section aria-label="Featured live broadcast">
          <div className="relative rounded-3xl bg-gradient-to-br from-[#151A2B] via-[#111420] to-[#0D101A] border border-white/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch shadow-[0_36px_80px_-52px_rgba(56,189,248,0.55)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
            <div className="lg:col-span-7 relative min-h-[240px] sm:min-h-[300px] lg:min-h-[340px]">
              <MediaImage
                src={featuredRoom.thumbnailUrl}
                alt={featuredRoom.title}
                fallbackGradient={featuredRoom.fallbackGradient}
                fallbackTitle={featuredRoom.title}
                className="w-full h-full object-cover lg:absolute lg:inset-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D14] via-black/30 to-transparent" />
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-violet-600 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/20 shadow-[0_8px_20px_-10px_rgba(244,63,94,0.9)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white live-dot" aria-hidden="true" />
                  <span>Featured Live</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/65 backdrop-blur-sm px-2.5 py-1 text-xs font-mono tabular-nums text-slate-100">
                  <Eye className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  <span>{featuredRoom.viewerCount.toLocaleString()} watching</span>
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 sm:p-7 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{featuredRoom.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {featuredRoom.mode === 'MULTI_GUEST'
                      ? 'Multi-Guest Room'
                      : featuredRoom.mode === 'AUDIO'
                      ? 'Audio Live'
                      : 'Video Live'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{featuredRoom.startedAtLabel}</span>
                </div>

                <h1 className="font-display text-2xl sm:text-3xl font-bold text-gradient leading-tight">
                  {featuredRoom.title}
                </h1>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {featuredRoom.description}
                </p>

                <button
                  type="button"
                  onClick={() => onOpenUserProfile(featuredHost)}
                  className="inline-flex items-center gap-3 pt-1 text-left group"
                >
                  <Avatar
                    name={featuredHost.displayName}
                    color={featuredHost.avatarColor}
                    size="md"
                    isLiveRing
                  />
                  <div>
                    <p className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                      {featuredHost.displayName}
                    </p>
                    <p className="text-xs text-slate-400">
                      @{featuredHost.username} · {featuredHost.country}
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/[0.07]">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Users className="w-4 h-4 text-sky-400" aria-hidden="true" />
                  <span>Up to 8 multi-guest seats</span>
                </div>

                <button
                  type="button"
                  onClick={() => onJoinRoom(featuredRoom)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-500 hover:from-violet-500 hover:via-indigo-500 hover:to-sky-400 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-[0_16px_34px_-20px_rgba(99,102,241,0.95)] ring-1 ring-white/15 transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                  <span>Watch Live</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category & Mode Filters */}
      {rooms.length > 0 && (
        <>
          <section aria-label="Room filters" className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-white flex items-center gap-2.5">
                <span className="h-4 w-1 rounded-full bg-gradient-to-b from-sky-400 to-violet-500" />
                Live Rooms
              </h2>

              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#111420] border border-white/[0.08] self-start sm:self-auto">
                {(
                  [
                    { id: 'ALL', label: 'All Modes' },
                    { id: 'VIDEO', label: 'Video' },
                    { id: 'AUDIO', label: 'Audio' },
                    { id: 'MULTI_GUEST', label: '8-Seat Multi' },
                  ] as const
                ).map((modeTab) => (
                  <button
                    key={modeTab.id}
                    type="button"
                    onClick={() => onSelectMode(modeTab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      selectedMode === modeTab.id
                        ? 'bg-gradient-to-r from-violet-600 to-sky-500 text-white shadow-[0_8px_20px_-12px_rgba(99,102,241,0.9)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {modeTab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {ROOM_CATEGORIES.map((category) => {
                const active = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => onSelectCategory(category)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[38px] ${
                      active
                        ? 'bg-white text-[#08090E] font-semibold'
                        : 'bg-[#111420] text-slate-300 border border-white/[0.08] hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Filtered Live Rooms Grid */}
          <section aria-label="Active live rooms">
            {visibleRooms.length === 0 ? (
              <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-10 text-center space-y-3">
                <p className="font-display text-base font-semibold text-white">
                  No live rooms match your current filter
                </p>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Reset the category or search query to explore all active rooms.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory('All');
                    onSelectMode('ALL');
                    onSearchChange('');
                  }}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
                >
                  Show All Live Rooms
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {visibleRooms.map((room) => (
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
        </>
      )}

    </div>
  );
};
