import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Eye,
  Mic,
  Power,
  Radio,
  Search,
  ShieldAlert,
  Trash2,
  User,
  Users,
  Video,
  X,
} from 'lucide-react';
import { adminDeleteRoom, adminForceEndRoom } from '../../lib/firestoreService';
import { LiveRoom, UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';
import { AdminSharedProps, getThemeClasses } from './adminTypes';

export const AdminLiveRoomsTab: React.FC<AdminSharedProps> = ({
  theme,
  currentUser,
  users,
  rooms,
  reports,
  onToast,
  onConfirm,
  onWatchRoom,
  onOpenUserProfile,
}) => {
  const t = getThemeClasses(theme);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'ENDED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<LiveRoom | null>(null);
  const [inlineAction, setInlineAction] = useState<{
    roomId: string;
    type: 'END' | 'DELETE';
  } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Map host UID to UserProfile for rich host display
  const userMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    users.forEach((u) => map.set(u.uid, u));
    return map;
  }, [users]);

  // Categories extracted from active rooms
  const categories = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [rooms]);

  const filtered = useMemo(() => {
    return rooms.filter((r) => {
      if (statusFilter === 'LIVE' && r.status !== 'LIVE') return false;
      if (statusFilter === 'ENDED' && r.status === 'LIVE') return false;
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const host = userMap.get(r.hostUid);
        return (
          r.title?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.roomId?.toLowerCase().includes(q) ||
          r.hostUid?.toLowerCase().includes(q) ||
          host?.displayName?.toLowerCase().includes(q) ||
          host?.username?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rooms, search, statusFilter, categoryFilter, userMap]);

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return 'Just started';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  const getRoomReports = (roomId: string) => {
    return reports.filter(
      (rep) =>
        rep.targetId === roomId ||
        rep.targetLabel?.includes(roomId) ||
        (rep.targetType === 'ROOM' && rep.targetId === roomId)
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className={`${t.card} p-3.5 flex flex-wrap items-center justify-between gap-2.5`}>
        <div className="relative flex-1 min-w-[220px]">
          <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search live rooms by title, host, category, or ID..."
            className={`${t.input} pl-8`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`${t.input} w-auto min-w-[120px]`}
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Status Buttons */}
          <div className="flex items-center gap-1">
            {(['ALL', 'LIVE', 'ENDED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={statusFilter === f ? t.btnPrimary : t.btnGhost}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {filtered.length === 0 ? (
          <div className={`${t.card} p-10 text-center col-span-full ${t.textMuted}`}>
            <Radio className="w-8 h-8 mx-auto mb-2 opacity-40 text-violet-400" />
            <p className="text-sm font-semibold">No live rooms found</p>
            <p className="text-xs mt-1">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          filtered.map((room) => {
            const host = userMap.get(room.hostUid);
            const occupiedSeats = room.seats?.filter(
              (s) => s.status === 'OCCUPIED' || Boolean(s.occupantUid)
            ).length || 0;
            const roomReports = getRoomReports(room.roomId);

            return (
              <div
                key={room.roomId}
                className={`${t.card} p-4 flex flex-col justify-between space-y-3.5 hover:border-violet-500/30 transition-all`}
              >
                {/* Header: Title, Category & Live Status */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/20">
                          {room.category}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          {room.mode === 'AUDIO' ? (
                            <Mic className="w-3 h-3 text-cyan-400" />
                          ) : room.mode === 'MULTI_GUEST' ? (
                            <Users className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Video className="w-3 h-3 text-pink-400" />
                          )}
                          {room.mode}
                        </span>
                      </div>
                      <h4
                        className={`text-sm font-bold truncate ${t.textPrimary}`}
                        title={room.title}
                      >
                        {room.title}
                      </h4>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                        room.status === 'LIVE'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                          : 'bg-white/5 text-slate-400 border border-white/5'
                      }`}
                    >
                      <Radio className="w-2.5 h-2.5" />
                      {room.status}
                    </span>
                  </div>

                  {/* Host Information Card */}
                  <div className="mt-3 flex items-center justify-between gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar
                        src={host?.avatarUrl}
                        name={host?.displayName || 'Host'}
                        color={host?.avatarColor}
                        size="xs"
                        isLiveRing={room.status === 'LIVE'}
                      />
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${t.textPrimary}`}>
                          {host?.displayName || 'Unknown Host'}
                        </p>
                        <p className={`text-[10px] truncate ${t.textSecondary}`}>
                          @{host?.username || room.hostUid.slice(0, 10)}
                        </p>
                      </div>
                    </div>
                    {host && (
                      <button
                        onClick={() => onOpenUserProfile(host)}
                        className="text-[10px] font-semibold text-violet-400 hover:text-violet-300 shrink-0 px-2 py-1 rounded-md hover:bg-violet-500/10 transition-colors"
                      >
                        Profile
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics: Viewers, Seats, Duration, Reports */}
                <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                  <div className={`${t.subCard} p-2 text-center`}>
                    <p className={`text-[10px] ${t.textMuted} flex items-center justify-center gap-1`}>
                      <Eye className="w-3 h-3 text-cyan-400" /> Viewers
                    </p>
                    <p className={`font-bold mt-0.5 ${t.textPrimary}`}>
                      {(room.viewerCount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className={`${t.subCard} p-2 text-center`}>
                    <p className={`text-[10px] ${t.textMuted} flex items-center justify-center gap-1`}>
                      <Users className="w-3 h-3 text-emerald-400" /> Seats
                    </p>
                    <p className={`font-bold mt-0.5 ${t.textPrimary}`}>
                      {occupiedSeats} / {room.seatCount || 8}
                    </p>
                  </div>
                  <div className={`${t.subCard} p-2 text-center`}>
                    <p className={`text-[10px] ${t.textMuted} flex items-center justify-center gap-1`}>
                      <Clock className="w-3 h-3 text-amber-400" /> Duration
                    </p>
                    <p className={`font-bold mt-0.5 ${t.textPrimary} truncate`}>
                      {formatDuration(room.durationSeconds)}
                    </p>
                  </div>
                </div>

                {/* Warning if reports exist */}
                {roomReports.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {roomReports.length} report{roomReports.length > 1 ? 's' : ''} against this room
                    </span>
                  </div>
                )}

                {/* Administrative Actions */}
                <div className="pt-2 border-t border-white/[0.05]">
                  {inlineAction?.roomId === room.roomId ? (
                    <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-2 animate-fadeIn">
                      <span className="text-[11px] font-semibold text-rose-300">
                        {inlineAction.type === 'END' ? 'End this room?' : 'Delete permanently?'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => setInlineAction(null)}
                          className="px-2 py-1 rounded text-[10px] font-medium bg-white/10 hover:bg-white/15 text-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={async () => {
                            setActionBusy(true);
                            try {
                              if (inlineAction.type === 'END') {
                                await adminForceEndRoom(currentUser!, room.roomId);
                                onToast('Room terminated', room.title, 'warning');
                              } else {
                                await adminDeleteRoom(currentUser!, room.roomId);
                                onToast('Room deleted', room.title, 'success');
                              }
                              setInlineAction(null);
                            } catch (err) {
                              onToast(
                                'Action failed',
                                err instanceof Error ? err.message : 'Error',
                                'error'
                              );
                            } finally {
                              setActionBusy(false);
                            }
                          }}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white"
                        >
                          {actionBusy ? '...' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onWatchRoom(room.roomId)}
                        className={`${t.btnGhost} flex-1`}
                        title="Open live monitoring stage"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Monitor</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRoom(room)}
                        className={t.btnGhost}
                        title="View details & participants"
                      >
                        Details
                      </button>

                      {room.status === 'LIVE' && (
                        <button
                          type="button"
                          onClick={() => setInlineAction({ roomId: room.roomId, type: 'END' })}
                          className={t.btnDanger}
                          title="End room"
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>End</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setInlineAction({ roomId: room.roomId, type: 'DELETE' })}
                        className={t.btnGhost}
                        title="Delete room"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Room Details Modal / Drawer */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className={`${t.card} w-full max-w-xl max-h-[85vh] overflow-y-auto p-5 space-y-4`}>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                  Live Room Details
                </span>
                <h3 className={`text-base font-bold ${t.textPrimary}`}>{selectedRoom.title}</h3>
              </div>
              <button
                onClick={() => setSelectedRoom(null)}
                className={`p-1.5 rounded-lg ${t.textSecondary} hover:bg-white/5`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className={`${t.subCard} p-3 space-y-1`}>
                <p className={t.textMuted}>Room ID</p>
                <p className={`font-mono text-[11px] truncate ${t.textPrimary}`}>
                  {selectedRoom.roomId}
                </p>
              </div>
              <div className={`${t.subCard} p-3 space-y-1`}>
                <p className={t.textMuted}>Category & Mode</p>
                <p className={`font-semibold ${t.textPrimary}`}>
                  {selectedRoom.category} ({selectedRoom.mode})
                </p>
              </div>
              <div className={`${t.subCard} p-3 space-y-1`}>
                <p className={t.textMuted}>Viewer Count</p>
                <p className={`font-semibold ${t.textPrimary}`}>
                  {selectedRoom.viewerCount || 0} active viewers
                </p>
              </div>
              <div className={`${t.subCard} p-3 space-y-1`}>
                <p className={t.textMuted}>Duration</p>
                <p className={`font-semibold ${t.textPrimary}`}>
                  {formatDuration(selectedRoom.durationSeconds)}
                </p>
              </div>
            </div>

            {/* Host Details */}
            {(() => {
              const h = userMap.get(selectedRoom.hostUid);
              return (
                <div className={`${t.subCard} p-3.5 space-y-2`}>
                  <p className={`text-xs font-bold ${t.textPrimary}`}>Room Host</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={h?.avatarUrl}
                        name={h?.displayName || 'Host'}
                        color={h?.avatarColor}
                        size="sm"
                      />
                      <div>
                        <p className={`text-xs font-semibold ${t.textPrimary}`}>
                          {h?.displayName || 'Unknown Host'}
                        </p>
                        <p className={`text-[10px] ${t.textSecondary}`}>
                          @{h?.username || '—'} · UID: {selectedRoom.hostUid}
                        </p>
                      </div>
                    </div>
                    {h && (
                      <button
                        onClick={() => {
                          setSelectedRoom(null);
                          onOpenUserProfile(h);
                        }}
                        className={t.btnGhost}
                      >
                        <User className="w-3.5 h-3.5" /> View Profile
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Guest Participants List */}
            <div className={`${t.subCard} p-3.5 space-y-2.5`}>
              <div className="flex items-center justify-between">
                <p className={`text-xs font-bold ${t.textPrimary}`}>
                  Guest Seats ({selectedRoom.seats?.filter((s) => s.status === 'OCCUPIED' || s.occupantUid).length || 0} / {selectedRoom.seatCount || 8})
                </p>
              </div>

              {selectedRoom.seats && selectedRoom.seats.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {selectedRoom.seats.map((seat) => {
                    const occupant = seat.occupantUid ? userMap.get(seat.occupantUid) : null;
                    const isOccupied = seat.status === 'OCCUPIED' || Boolean(seat.occupantUid);

                    return (
                      <div
                        key={seat.seatNumber}
                        className={`p-2 rounded-lg border text-center text-xs ${
                          isOccupied
                            ? 'bg-violet-500/10 border-violet-500/25'
                            : 'bg-white/[0.02] border-white/[0.05] opacity-60'
                        }`}
                      >
                        <p className="text-[10px] text-slate-400">Seat #{seat.seatNumber}</p>
                        <p className={`text-xs font-semibold truncate mt-1 ${isOccupied ? 'text-white' : 'text-slate-500'}`}>
                          {seat.occupantName || occupant?.displayName || (isOccupied ? seat.occupantUid?.slice(0, 8) : 'Empty')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={`text-xs ${t.textMuted}`}>No guest seats configured for this room.</p>
              )}
            </div>

            {/* Associated Reports */}
            {(() => {
              const reps = getRoomReports(selectedRoom.roomId);
              if (reps.length === 0) return null;
              return (
                <div className={`${t.subCard} p-3.5 space-y-2 border-rose-500/30 bg-rose-500/5`}>
                  <p className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Reports for this room ({reps.length})
                  </p>
                  <div className="space-y-1.5 text-xs">
                    {reps.map((rep) => (
                      <div key={rep.reportId} className="flex items-center justify-between">
                        <span className="truncate">{rep.reason}</span>
                        <span className="text-[10px] font-bold text-rose-400">{rep.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.07]">
              <button onClick={() => setSelectedRoom(null)} className={t.btnGhost}>
                Close
              </button>
              <button
                onClick={() => {
                  const id = selectedRoom.roomId;
                  setSelectedRoom(null);
                  onWatchRoom(id);
                }}
                className={t.btnPrimary}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Go to Room</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
