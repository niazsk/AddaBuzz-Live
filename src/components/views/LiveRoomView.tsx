import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  Gift,
  Lock,
  LogOut,
  Mic,
  MicOff,
  Radio,
  RefreshCw,
  Send,
  Share2,
  ShieldAlert,
  Sparkles,
  Unlock,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import {
  GiftCatalogItem,
  GuestSeat,
  JoinRequest,
  LiveRoom,
  RoomComment,
  UserProfile,
} from '../../types/app';
import {
  LocalMediaHandle,
  requestMediaSessionToken,
  startLocalMediaCapture,
} from '../../lib/mediaProvider';
import { Avatar } from '../ui/Avatar';
import { MediaImage } from '../ui/MediaImage';
import { GiftArtwork } from '../ui/GiftArtwork';

interface LiveRoomViewProps {
  room: LiveRoom;
  seats: GuestSeat[];
  joinRequests: JoinRequest[];
  comments: RoomComment[];
  host: UserProfile;
  currentUser: UserProfile | null;
  isAdminUser: boolean;
  gifts: GiftCatalogItem[];
  coinBalance: number;
  diamondBalance: number;
  isFollowingHost: boolean;
  isOfflineSimulated: boolean;
  onLeaveRoom: () => void;
  onEndRoom: (roomId: string) => void;
  onToggleFollow: (uid: string) => void;
  onSendComment: (roomId: string, text: string) => void;
  onSendGift: (roomId: string, gift: GiftCatalogItem) => void;
  onRequestSeat: (roomId: string, seatNumber: number) => void;
  onLeaveSeat: (roomId: string, seatNumber: number) => void;
  onApproveJoinRequest: (roomId: string, request: JoinRequest) => void;
  onRejectJoinRequest: (roomId: string, request: JoinRequest) => void;
  onToggleSeatLock: (roomId: string, seat: GuestSeat) => void;
  onToggleMuteGuest: (roomId: string, seat: GuestSeat) => void;
  onRemoveGuest: (roomId: string, seatNumber: number) => void;
  onShareRoom: (room: LiveRoom) => void;
  onOpenReportRoom: (room: LiveRoom) => void;
  onOpenProfile: (user: UserProfile) => void;
  onOpenAuth: () => void;
}

export const LiveRoomView: React.FC<LiveRoomViewProps> = ({
  room,
  seats,
  joinRequests,
  comments,
  host,
  currentUser,
  isAdminUser,
  gifts,
  coinBalance,
  diamondBalance,
  isFollowingHost,
  isOfflineSimulated,
  onLeaveRoom,
  onEndRoom,
  onToggleFollow,
  onSendComment,
  onSendGift,
  onRequestSeat,
  onLeaveSeat,
  onApproveJoinRequest,
  onRejectJoinRequest,
  onToggleSeatLock,
  onToggleMuteGuest,
  onRemoveGuest,
  onShareRoom,
  onOpenReportRoom,
  onOpenProfile,
  onOpenAuth,
}) => {
  const isOwnerHost = Boolean(currentUser && room.hostUid === currentUser.uid);
  const canModerateSeats = isOwnerHost || isAdminUser;
  const mySeat = useMemo(
    () =>
      currentUser
        ? seats.find(
            (s) => s.status === 'OCCUPIED' && s.occupantUid === currentUser.uid
          )
        : undefined,
    [seats, currentUser]
  );
  const canPublishLocalMedia = Boolean(isOwnerHost || mySeat);

  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(room.mode === 'AUDIO');
  const [cameraFacing, setCameraFacing] = useState<'Front' | 'Rear'>('Front');
  const [mediaActive, setMediaActive] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaModeLabel, setMediaModeLabel] = useState('Firestore Sync');
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaHandleRef = useRef<LocalMediaHandle | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [chatInput, setChatInput] = useState('');
  const [rightTab, setRightTab] = useState<'chat' | 'guests'>('chat');
  const [showGiftTray, setShowGiftTray] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  // Gift celebration overlay tracking
  const [latestGiftBanner, setLatestGiftBanner] = useState<RoomComment | null>(
    null
  );
  const seenGiftIdRef = useRef<string | null>(null);

  useEffect(() => {
    const giftEvents = comments.filter((c) => c.isGiftEvent);
    const newest = giftEvents[giftEvents.length - 1];
    if (!newest) return;
    if (seenGiftIdRef.current === null) {
      seenGiftIdRef.current = newest.id;
      return;
    }
    if (newest.id !== seenGiftIdRef.current) {
      seenGiftIdRef.current = newest.id;
      setLatestGiftBanner(newest);
      const timer = window.setTimeout(() => {
        setLatestGiftBanner(null);
      }, 4200);
      return () => window.clearTimeout(timer);
    }
  }, [comments]);

  // Clean up local WebRTC media when leaving or losing publisher role
  const stopLocalMedia = () => {
    if (mediaHandleRef.current) {
      mediaHandleRef.current.stop();
      mediaHandleRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setMediaActive(false);
    setAudioLevel(0);
  };

  useEffect(() => {
    return () => {
      if (mediaHandleRef.current) {
        mediaHandleRef.current.stop();
        mediaHandleRef.current = null;
      }
    };
  }, [room.roomId]);

  useEffect(() => {
    if (!canPublishLocalMedia && mediaActive) {
      stopLocalMedia();
    }
  }, [canPublishLocalMedia, mediaActive]);

  // Negotiate server token capability on room entry
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    const role = isOwnerHost ? 'host' : mySeat ? 'guest' : 'viewer';
    void requestMediaSessionToken({
      roomId: room.roomId,
      uid: currentUser.uid,
      displayName: currentUser.displayName,
      role,
    }).then((res) => {
      if (!cancelled) {
        setMediaModeLabel(
          res.mode === 'openvidu'
            ? 'OpenVidu SFU Token Ready'
            : 'Device Stage Preview + Firestore Sync'
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [room.roomId, currentUser?.uid, isOwnerHost, Boolean(mySeat)]);

  const startOrRestartMedia = async (facing: 'Front' | 'Rear') => {
    setMediaError(null);
    stopLocalMedia();
    try {
      const handle = await startLocalMediaCapture({
        mode: room.mode,
        facingMode: facing === 'Front' ? 'user' : 'environment',
        onAudioLevel: (lvl) => setAudioLevel(lvl),
      });
      handle.setAudioMuted(micMuted);
      handle.setVideoEnabled(!cameraOff);
      mediaHandleRef.current = handle;
      setMediaActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = handle.stream;
      }
    } catch (err) {
      setMediaError(
        err instanceof Error
          ? err.message
          : 'Camera/microphone permission was denied.'
      );
      setMediaActive(false);
    }
  };

  useEffect(() => {
    if (mediaActive && videoRef.current && mediaHandleRef.current) {
      videoRef.current.srcObject = mediaHandleRef.current.stream;
    }
  }, [mediaActive, cameraOff]);

  const handleToggleMic = () => {
    const next = !micMuted;
    setMicMuted(next);
    mediaHandleRef.current?.setAudioMuted(next);
  };

  const handleToggleCamera = () => {
    const next = !cameraOff;
    setCameraOff(next);
    mediaHandleRef.current?.setVideoEnabled(!next);
  };

  const handleSwitchCamera = () => {
    const next = cameraFacing === 'Front' ? 'Rear' : 'Front';
    setCameraFacing(next);
    if (mediaActive && room.mode !== 'AUDIO') {
      void startOrRestartMedia(next);
    }
  };

  const occupiedCount = seats.filter((s) => s.status === 'OCCUPIED').length;

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!chatInput.trim() || isOfflineSimulated) return;
    onSendComment(room.roomId, chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="min-h-screen bg-[#07080D] text-white flex flex-col">
      {/* Room Top Header */}
      <header className="sticky top-0 z-20 bg-[#0A0C13]/95 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              stopLocalMedia();
              onLeaveRoom();
            }}
            aria-label="Leave live room"
            className="min-h-[40px] min-w-[40px] rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onOpenProfile(host)}
            className="flex items-center gap-2.5 min-w-0 text-left"
          >
            <Avatar
              name={host.displayName}
              color={host.avatarColor}
              size="sm"
              isLiveRing
            />
            <div className="min-w-0">
              <span className="font-display text-sm font-semibold text-white truncate block">
                {room.title}
              </span>
              <p className="text-xs text-slate-400 truncate">
                {host.displayName} · @{host.username} · {room.category}
              </p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-slate-300 bg-white/[0.05] px-2.5 py-1.5 rounded-lg">
            <Radio className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />
            <span>{formatDuration(room.durationSeconds)}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-slate-200 bg-white/[0.05] px-2.5 py-1.5 rounded-lg">
            <Eye className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span>{room.viewerCount.toLocaleString()}</span>
          </span>

          {!isOwnerHost && (
            <button
              type="button"
              onClick={() => onToggleFollow(host.uid)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                isFollowingHost
                  ? 'bg-white/[0.08] text-slate-200 hover:bg-white/[0.14]'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}
            >
              {isFollowingHost ? 'Following' : 'Follow Host'}
            </button>
          )}
        </div>
      </header>

      {/* Main Split Room Workspace */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-6">
        {/* Left: Stage + 8-Seat Multi-Guest Grid + Controls */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Primary Media Stage */}
          <div className="relative rounded-2xl overflow-hidden bg-[#10131F] border border-white/[0.08] min-h-[280px] sm:min-h-[360px] flex flex-col justify-between">
            {mediaActive && room.mode !== 'AUDIO' && !cameraOff ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${
                    cameraFacing === 'Front' ? '-scale-x-100' : ''
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08090E]/90 via-transparent to-black/45" />
              </>
            ) : room.mode !== 'AUDIO' && !cameraOff ? (
              <>
                <MediaImage
                  src={room.thumbnailUrl}
                  alt={room.title}
                  fallbackGradient={room.fallbackGradient}
                  fallbackTitle={room.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08090E]/90 via-black/25 to-black/45" />
              </>
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: room.fallbackGradient }}
              >
                <div className="flex flex-col items-center gap-4 text-center px-6">
                  <Avatar
                    name={host.displayName}
                    color={host.avatarColor}
                    size="xl"
                    isSpeaking={
                      !micMuted && (mediaActive ? audioLevel > 10 : true)
                    }
                  />
                  <div>
                    <p className="font-display text-lg font-semibold text-white">
                      {room.mode === 'AUDIO'
                        ? 'Audio Live Stage'
                        : 'Camera Paused'}
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                      Hosted by {host.displayName} · {occupiedCount} guests on
                      stage
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Top Stage Status & Audio Level Meter */}
            <div className="relative z-10 p-4 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 rounded-lg bg-black/65 backdrop-blur-sm px-3 py-1.5 text-xs text-slate-200 border border-white/10">
                <span className="font-semibold text-violet-300">
                  {room.mode === 'MULTI_GUEST'
                    ? 'Multi-Guest Room'
                    : room.mode === 'AUDIO'
                    ? 'Audio Live'
                    : 'Video Live'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300">{mediaModeLabel}</span>
              </div>

              {mediaActive && (
                <div className="inline-flex items-center gap-2 rounded-lg bg-black/65 backdrop-blur-sm px-3 py-1.5 text-xs text-emerald-300 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live Mic</span>
                  <div className="w-14 h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${micMuted ? 0 : audioLevel}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Live Gift Celebration Banner */}
            {latestGiftBanner && (
              <div className="relative z-10 mx-4 my-auto self-start rounded-xl bg-gradient-to-r from-violet-600/90 to-blue-600/90 backdrop-blur-md border border-white/20 px-4 py-2.5 shadow-xl flex items-center gap-3 animate-pulse">
                <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">
                    {latestGiftBanner.displayName} sent{' '}
                    {latestGiftBanner.giftName ?? 'a gift'}!
                  </p>
                  <p className="text-[11px] font-mono text-sky-100">
                    {latestGiftBanner.giftAmount}{' '}
                    {latestGiftBanner.giftCurrency === 'DIAMOND'
                      ? 'Diamonds'
                      : 'Coins'}
                  </p>
                </div>
              </div>
            )}

            <div className="relative z-10 p-4 flex items-end justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-300">
                  Host · {host.displayName} ({cameraFacing} cam)
                </p>
                <p className="text-sm text-slate-100 max-w-xl">
                  {room.description}
                </p>
                {mediaError && (
                  <p className="text-xs text-rose-300 bg-rose-950/70 border border-rose-500/30 rounded-lg px-2.5 py-1 inline-block mt-1">
                    {mediaError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 8-Seat Multi-Guest Grid */}
          <section
            aria-label="Multi-guest seats"
            className="rounded-2xl bg-[#10131F] border border-white/[0.08] p-4 sm:p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold text-white">
                  Guest Seats ({occupiedCount}/8 Occupied)
                </h2>
                <p className="text-xs text-slate-400">
                  Maximum 8 guest seats enforced by Firestore Security Rules &
                  transactions.
                </p>
              </div>

              {joinRequests.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRightTab('guests')}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-medium whitespace-nowrap"
                >
                  {joinRequests.length} Pending Request
                  {joinRequests.length > 1 ? 's' : ''}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {seats.map((seat) => {
                const isOccupied = seat.status === 'OCCUPIED';
                const isLocked = seat.status === 'LOCKED';
                const isRequested = seat.status === 'REQUESTED';
                const isMySeat = Boolean(
                  currentUser &&
                    isOccupied &&
                    seat.occupantUid === currentUser.uid
                );

                return (
                  <div
                    key={seat.seatNumber}
                    className={`rounded-xl p-3 border flex flex-col justify-between gap-2.5 min-h-[124px] transition-colors ${
                      isOccupied
                        ? 'bg-[#161A29] border-violet-500/30'
                        : isLocked
                        ? 'bg-[#0C0E16] border-white/[0.05] opacity-75'
                        : isRequested
                        ? 'bg-sky-950/30 border-sky-500/40'
                        : 'bg-[#121624] border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono tabular-nums text-slate-400">
                        Seat {seat.seatNumber}
                      </span>
                      {isOccupied && (
                        <span className="text-slate-300">
                          {seat.isMuted ? (
                            <MicOff
                              className="w-3.5 h-3.5 text-rose-400"
                              aria-label="Muted"
                            />
                          ) : (
                            <Mic
                              className="w-3.5 h-3.5 text-sky-400"
                              aria-label="Unmuted"
                            />
                          )}
                        </span>
                      )}
                      {isLocked && (
                        <Lock
                          className="w-3.5 h-3.5 text-slate-500"
                          aria-label="Locked"
                        />
                      )}
                    </div>

                    {isOccupied ? (
                      <div className="flex flex-col items-center text-center gap-1.5">
                        <Avatar
                          name={seat.occupantName ?? 'Guest'}
                          color={seat.occupantAvatarColor}
                          size="sm"
                          isSpeaking={seat.isSpeaking && !seat.isMuted}
                        />
                        <p className="text-xs font-medium text-white truncate max-w-full">
                          {seat.occupantName}
                        </p>
                      </div>
                    ) : isLocked ? (
                      <div className="flex flex-col items-center text-center gap-1 my-auto">
                        <span className="text-xs text-slate-500">
                          Locked by Host
                        </span>
                      </div>
                    ) : isRequested ? (
                      <div className="flex flex-col items-center text-center gap-1 my-auto">
                        <span className="text-xs font-medium text-sky-300">
                          Requested
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Awaiting host
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isOfflineSimulated || Boolean(mySeat)}
                        onClick={() => onRequestSeat(room.roomId, seat.seatNumber)}
                        className="my-auto flex flex-col items-center gap-1.5 text-slate-300 hover:text-sky-300 disabled:opacity-45 transition-colors"
                      >
                        <UserPlus className="w-5 h-5" />
                        <span className="text-xs font-medium">
                          {mySeat ? 'Seated' : 'Request Seat'}
                        </span>
                      </button>
                    )}

                    {canModerateSeats ? (
                      <div className="flex items-center justify-center gap-1 pt-1 border-t border-white/[0.06]">
                        {isOccupied ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onToggleMuteGuest(room.roomId, seat)}
                              className="px-2 py-1 rounded-md text-[11px] text-slate-300 hover:bg-white/[0.08]"
                            >
                              {seat.isMuted ? 'Unmute' : 'Mute'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onRemoveGuest(room.roomId, seat.seatNumber)
                              }
                              className="px-2 py-1 rounded-md text-[11px] text-rose-400 hover:bg-rose-500/10"
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onToggleSeatLock(room.roomId, seat)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-300 hover:bg-white/[0.08]"
                          >
                            {isLocked ? (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>Unlock</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>Lock</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ) : isMySeat ? (
                      <div className="flex items-center justify-center pt-1 border-t border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => {
                            stopLocalMedia();
                            onLeaveSeat(room.roomId, seat.seatNumber);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-rose-300 hover:bg-rose-500/15"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Step Down</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bottom Action Dock */}
          <div className="rounded-2xl bg-[#10131F] border border-white/[0.08] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {canPublishLocalMedia && (
                <>
                  {!mediaActive ? (
                    <button
                      type="button"
                      disabled={isOfflineSimulated}
                      onClick={() => {
                        void startOrRestartMedia(cameraFacing);
                      }}
                      className="h-10 px-3.5 rounded-xl bg-emerald-600/20 border border-emerald-500/35 text-emerald-200 hover:bg-emerald-600/30 disabled:opacity-45 text-xs font-medium inline-flex items-center gap-2 transition-colors"
                    >
                      {room.mode === 'AUDIO' ? (
                        <Mic className="w-4 h-4" />
                      ) : (
                        <Video className="w-4 h-4" />
                      )}
                      <span>
                        {room.mode === 'AUDIO'
                          ? 'Enable Mic Preview'
                          : 'Enable Cam & Mic'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopLocalMedia}
                      className="h-10 px-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-slate-200 text-xs font-medium inline-flex items-center gap-2 transition-colors"
                    >
                      <VideoOff className="w-4 h-4 text-amber-300" />
                      <span>Stop Preview</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleToggleMic}
                    className={`h-10 px-3.5 rounded-xl text-xs font-medium inline-flex items-center gap-2 transition-colors ${
                      micMuted
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-white/[0.07] text-white hover:bg-white/[0.12]'
                    }`}
                  >
                    {micMuted ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                    <span>{micMuted ? 'Mic Muted' : 'Mic On'}</span>
                  </button>

                  {room.mode !== 'AUDIO' && (
                    <>
                      <button
                        type="button"
                        onClick={handleToggleCamera}
                        className={`h-10 px-3.5 rounded-xl text-xs font-medium inline-flex items-center gap-2 transition-colors ${
                          cameraOff
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-white/[0.07] text-white hover:bg-white/[0.12]'
                        }`}
                      >
                        {cameraOff ? (
                          <VideoOff className="w-4 h-4" />
                        ) : (
                          <Video className="w-4 h-4" />
                        )}
                        <span>{cameraOff ? 'Cam Off' : 'Cam On'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSwitchCamera}
                        className="h-10 px-3 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-xs font-medium inline-flex items-center gap-1.5 text-slate-200"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{cameraFacing}</span>
                      </button>
                    </>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    onOpenAuth();
                    return;
                  }
                  setShowGiftTray((s) => !s);
                }}
                disabled={isOfflineSimulated}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-45 text-white text-xs font-medium inline-flex items-center gap-2 transition-all"
              >
                <Gift className="w-4 h-4" />
                <span>Send Gift</span>
              </button>

              <button
                type="button"
                onClick={() => onShareRoom(room)}
                className="h-10 px-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-xs font-medium inline-flex items-center gap-2 text-slate-200"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenReportRoom(room)}
                className="h-10 px-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-xs font-medium inline-flex items-center gap-2 text-slate-300"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Report</span>
              </button>
            </div>

            {canModerateSeats ? (
              <button
                type="button"
                onClick={() => setConfirmEndOpen(true)}
                className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
              >
                End Live
              </button>
            ) : mySeat ? (
              <button
                type="button"
                onClick={() => {
                  stopLocalMedia();
                  onLeaveSeat(room.roomId, mySeat.seatNumber);
                }}
                className="h-10 px-4 rounded-xl bg-rose-600/20 border border-rose-500/35 hover:bg-rose-600/30 text-rose-200 text-xs font-medium transition-colors"
              >
                Step Down (Seat {mySeat.seatNumber})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  stopLocalMedia();
                  onLeaveRoom();
                }}
                className="h-10 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 text-xs font-medium transition-colors"
              >
                Leave Room
              </button>
            )}
          </div>

          {/* Virtual Gift Tray (Coins & Diamonds — Strictly NO Top-up) */}
          {showGiftTray && (
            <div className="rounded-2xl bg-[#10131F] border border-violet-500/30 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm font-semibold text-white">
                    Send Virtual Gift
                  </h3>
                  <p className="text-xs text-slate-400">
                    Balances:{' '}
                    <span className="font-mono text-amber-300">
                      {coinBalance} Coins
                    </span>{' '}
                    ·{' '}
                    <span className="font-mono text-sky-300">
                      {diamondBalance} Diamonds
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGiftTray(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {gifts.map((gift) => (
                  <button
                    key={gift.giftId}
                    type="button"
                    disabled={isOfflineSimulated}
                    onClick={() => onSendGift(room.roomId, gift)}
                    className="rounded-xl bg-[#161A29] border border-white/[0.08] hover:border-sky-400/50 p-3 flex flex-col items-center text-center gap-2 transition-colors disabled:opacity-45"
                  >
                    <GiftArtwork artworkKey={gift.artworkKey} size={40} />
                    <div>
                      <p className="text-xs font-medium text-white truncate max-w-[12ch]">
                        {gift.name}
                      </p>
                      <p className="text-[11px] font-mono tabular-nums text-sky-300 mt-0.5">
                        {gift.price}{' '}
                        {gift.currency === 'COIN' ? 'Coins' : 'Diamonds'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Real-Time Firestore Room Chat & Guest Queue */}
        <aside className="lg:col-span-4 rounded-2xl bg-[#10131F] border border-white/[0.08] flex flex-col h-[520px] lg:h-[calc(100vh-110px)] lg:sticky lg:top-[76px]">
          <div className="p-3 border-b border-white/[0.08] grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setRightTab('chat')}
              className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                rightTab === 'chat'
                  ? 'bg-white/[0.09] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Room Chat ({comments.length})
            </button>
            <button
              type="button"
              onClick={() => setRightTab('guests')}
              className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                rightTab === 'guests'
                  ? 'bg-white/[0.09] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Guests & Requests ({joinRequests.length})
            </button>
          </div>

          {rightTab === 'chat' ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">
                    No messages in this room yet. Say hello!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`rounded-xl p-3 text-xs leading-relaxed ${
                        comment.isGiftEvent
                          ? 'bg-violet-600/15 border border-violet-500/30'
                          : 'bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-slate-100">
                          {comment.displayName}{' '}
                          <span className="font-normal text-slate-400">
                            @{comment.username}
                          </span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {comment.timestampLabel}
                        </span>
                      </div>
                      <p className="text-slate-200">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={handleSubmitChat}
                className="p-3 border-t border-white/[0.08] flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isOfflineSimulated}
                  placeholder={
                    !currentUser
                      ? 'Sign in to chat in this room...'
                      : isOfflineSimulated
                      ? 'Reconnect to send comments...'
                      : 'Say something in the room...'
                  }
                  className="flex-1 h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.08] focus:border-sky-500/60 focus:outline-none text-xs text-white placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={
                    (currentUser !== null && !chatInput.trim()) ||
                    isOfflineSimulated
                  }
                  aria-label="Send comment"
                  className="h-10 w-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center text-white shrink-0 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Pending Guest Requests</span>
                </h3>
                {joinRequests.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No pending seat requests right now.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {joinRequests.map((req) => (
                      <div
                        key={req.requestId}
                        className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-3 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            name={req.displayName}
                            color={req.avatarColor}
                            size="xs"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate">
                              {req.displayName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              @{req.username} · Seat{' '}
                              {req.preferredSeatNumber ?? 'Any'}
                            </p>
                          </div>
                        </div>

                        {canModerateSeats && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                onApproveJoinRequest(room.roomId, req)
                              }
                              aria-label={`Approve ${req.displayName}`}
                              className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/35"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onRejectJoinRequest(room.roomId, req)
                              }
                              aria-label={`Reject ${req.displayName}`}
                              className="p-1.5 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/35"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-violet-400" />
                  <span>Active Stage Speakers ({occupiedCount})</span>
                </h3>
                <div className="space-y-2">
                  {seats
                    .filter((s) => s.status === 'OCCUPIED')
                    .map((seat) => (
                      <div
                        key={seat.seatNumber}
                        className="rounded-xl bg-white/[0.03] px-3 py-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            name={seat.occupantName ?? 'Guest'}
                            color={seat.occupantAvatarColor}
                            size="xs"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate">
                              {seat.occupantName}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              Seat {seat.seatNumber} ·{' '}
                              {seat.isMuted ? 'Muted' : 'Speaking'}
                            </p>
                          </div>
                        </div>

                        {canModerateSeats && (
                          <button
                            type="button"
                            onClick={() =>
                              onRemoveGuest(room.roomId, seat.seatNumber)
                            }
                            aria-label={`Remove ${seat.occupantName}`}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* End Live Confirmation Dialog */}
      {confirmEndOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="end-live-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#121521] border border-white/12 p-6 space-y-4">
            <h3
              id="end-live-title"
              className="font-display text-lg font-bold text-white"
            >
              End live broadcast?
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              This will mark the room as ended in Firestore and close the stage
              for all participants.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmEndOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white"
              >
                Keep Streaming
              </button>
              <button
                type="button"
                onClick={() => {
                  stopLocalMedia();
                  onEndRoom(room.roomId);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white"
              >
                End Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
