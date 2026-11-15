import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Eye,
  Gift,
  Heart,
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
  Volume2,
  VolumeX,
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
  startLocalMediaCapture,
} from '../../lib/mediaProvider';
import {
  ViewerStreamState,
  joinGuestStream,
  joinViewerStream,
  startGuestBroadcast,
  startHostBroadcast,
} from '../../lib/webrtcBroadcast';
import { Avatar } from '../ui/Avatar';
import { MediaImage } from '../ui/MediaImage';
import { GiftArtwork } from '../ui/GiftArtwork';

const GuestTileMedia: React.FC<{
  stream: MediaStream;
  muted: boolean;
  name: string;
  color?: string;
  speaking?: boolean;
}> = ({ stream, muted, name, color, speaking }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (audioRef.current) audioRef.current.srcObject = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);
  const hasVideo = stream.getVideoTracks().length > 0;
  return (
    <>
      <audio ref={audioRef} autoPlay muted={muted} className="hidden" />
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-12 rounded-lg object-cover bg-black/40"
        />
      ) : (
        <Avatar name={name} color={color} size="sm" isSpeaking={speaking} />
      )}
    </>
  );
};

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
  const isSolo = room.mode !== 'MULTI_GUEST';

  const [likes, setLikes] = useState(0);

  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(room.mode === 'AUDIO');
  const [cameraFacing, setCameraFacing] = useState<'Front' | 'Rear'>('Front');
  const [mediaActive, setMediaActive] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaHandleRef = useRef<LocalMediaHandle | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteMuted, setRemoteMuted] = useState(true);
  const [broadcastState, setBroadcastState] = useState<ViewerStreamState>('connecting');
  const [guestStreams, setGuestStreams] = useState<Record<string, MediaStream>>({});

  const [chatInput, setChatInput] = useState('');
  const [guestPanelOpen, setGuestPanelOpen] = useState(false);
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

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments.length]);

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

  // Auto-start camera/mic once when the host or a seated guest enters the room
  const autoStartedRef = useRef(false);
  useEffect(() => {
    autoStartedRef.current = false;
  }, [room.roomId]);
  useEffect(() => {
    if (
      !canPublishLocalMedia ||
      mediaActive ||
      autoStartedRef.current ||
      isOfflineSimulated
    ) {
      return;
    }
    autoStartedRef.current = true;
    void startOrRestartMedia(cameraFacing);
  }, [canPublishLocalMedia, mediaActive, isOfflineSimulated, room.roomId]);

  // Host: broadcast the local stream to every viewer over WebRTC
  useEffect(() => {
    if (!isOwnerHost || !mediaActive || isOfflineSimulated) return;
    const stream = mediaHandleRef.current?.stream;
    if (!stream) return;
    const stopBroadcast = startHostBroadcast(room.roomId, stream);
    return stopBroadcast;
  }, [isOwnerHost, mediaActive, isOfflineSimulated, room.roomId]);

  // Seated guest: broadcast the local stream to every viewer over WebRTC
  const mySeatUid = mySeat?.occupantUid;
  useEffect(() => {
    if (!mySeatUid || !mediaActive || isOfflineSimulated) return;
    const stream = mediaHandleRef.current?.stream;
    if (!stream) return;
    const stopBroadcast = startGuestBroadcast(room.roomId, mySeatUid, stream);
    return stopBroadcast;
  }, [mySeatUid, mediaActive, isOfflineSimulated, room.roomId]);

  // Everyone except the host receives the host's live stream; every signed-in
  // participant (host, guests, viewers) receives each other guest's stream.
  const receivesHost = Boolean(currentUser) && !isOwnerHost;
  const isParticipant = Boolean(currentUser);
  const viewerUid = currentUser?.uid;
  const [reconnectTick, setReconnectTick] = useState(0);
  const retryAttemptsRef = useRef(0);
  useEffect(() => {
    retryAttemptsRef.current = 0;
  }, [room.roomId]);
  useEffect(() => {
    if (!receivesHost || !viewerUid || room.status !== 'LIVE' || isOfflineSimulated) {
      setRemoteStream(null);
      return;
    }
    setRemoteMuted(true);
    let retryTimer: number | undefined;
    const leave = joinViewerStream(
      room.roomId,
      viewerUid,
      (stream) => {
        if (stream) retryAttemptsRef.current = 0;
        setRemoteStream(stream);
      },
      (state) => {
        setBroadcastState(state);
        if (state === 'ended' && retryAttemptsRef.current < 4) {
          retryAttemptsRef.current += 1;
          retryTimer = window.setTimeout(() => setReconnectTick((t) => t + 1), 3000);
        }
      }
    );
    return () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      leave();
    };
  }, [receivesHost, viewerUid, room.roomId, room.status, isOfflineSimulated, reconnectTick]);

  // Receive each seated guest's live stream for the seat tiles
  const guestUidsKey = useMemo(
    () =>
      seats
        .filter(
          (s) => s.status === 'OCCUPIED' && s.occupantUid && s.occupantUid !== viewerUid
        )
        .map((s) => s.occupantUid as string)
        .join(','),
    [seats, viewerUid]
  );
  useEffect(() => {
    if (!isParticipant || !viewerUid || room.status !== 'LIVE' || isOfflineSimulated) {
      setGuestStreams({});
      return;
    }
    const uids = guestUidsKey ? guestUidsKey.split(',') : [];
    const leaves: Array<() => void> = [];
    uids.forEach((uid) => {
      const leave = joinGuestStream(
        room.roomId,
        uid,
        viewerUid,
        (stream) => {
          setGuestStreams((prev) => {
            const next = { ...prev };
            if (stream) next[uid] = stream;
            else delete next[uid];
            return next;
          });
        },
        () => {}
      );
      leaves.push(leave);
    });
    return () => {
      leaves.forEach((l) => l());
      setGuestStreams({});
    };
  }, [isParticipant, viewerUid, room.roomId, room.status, isOfflineSimulated, guestUidsKey]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, room.mode]);

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

  const hasRemoteVideo = Boolean(remoteStream) && room.mode !== 'AUDIO';
  const showLocalVideo =
    mediaActive && room.mode !== 'AUDIO' && !cameraOff && isOwnerHost;
  const showVideoFeed = showLocalVideo || hasRemoteVideo;
  const showCoverImage = !showVideoFeed && room.mode !== 'AUDIO' && !cameraOff;
  const hostSpeaking = !micMuted && (mediaActive ? audioLevel > 10 : true);

  const railButtonClass =
    'w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 hover:bg-black/65 flex items-center justify-center text-white transition-colors';

  return (
    <div className="fixed inset-0 bg-[#07080D] text-white overflow-hidden">
      {/* Full-screen stage background */}
      <div className="absolute inset-0">
        {remoteStream && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={remoteMuted}
            className={
              room.mode === 'AUDIO'
                ? 'hidden'
                : 'absolute inset-0 w-full h-full object-cover'
            }
          />
        )}
        {showLocalVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${
              cameraFacing === 'Front' ? '-scale-x-100' : ''
            }`}
          />
        ) : showCoverImage ? (
          <MediaImage
            src={room.thumbnailUrl}
            alt={room.title}
            fallbackGradient={room.fallbackGradient}
            fallbackTitle={room.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : !showVideoFeed ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: room.fallbackGradient }}
          >
            <div className="flex flex-col items-center gap-4 text-center px-6 -mt-24">
              <div className="relative">
                {hostSpeaking && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-fuchsia-500/30 animate-ping" />
                    <span className="absolute -inset-3 rounded-full border border-fuchsia-400/40 animate-pulse" />
                  </>
                )}
                <Avatar
                  name={host.displayName}
                  color={host.avatarColor}
                  size="xl"
                  isSpeaking={hostSpeaking}
                  className="relative ring-4 ring-white/20"
                />
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-white">
                  {room.mode === 'AUDIO' ? host.displayName : 'Camera Paused'}
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  {room.mode === 'AUDIO'
                    ? `Audio Live · ${occupiedCount} guests on stage`
                    : `Hosted by ${host.displayName}`}
                </p>
              </div>
            </div>
          </div>
        ) : null}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      </div>

      {/* Top overlay bar */}
      <div className="absolute top-0 inset-x-0 z-20 px-3 sm:px-4 pt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => onOpenProfile(host)}
            className={`flex items-center gap-2 rounded-full backdrop-blur-md pl-1 pr-3 py-1 min-w-0 ${
              isSolo
                ? 'bg-black/55 border-2 border-cyan-400/70'
                : 'bg-black/45 border border-white/10'
            }`}
          >
            <Avatar
              name={host.displayName}
              color={host.avatarColor}
              size="xs"
              isLiveRing
            />
            <span className="min-w-0 text-left">
              <span className="block text-xs font-bold text-white truncate max-w-[130px]">
                {host.displayName}
              </span>
              {isSolo && (
                <span className="block text-[10px] font-medium text-cyan-300">
                  {room.viewerCount.toLocaleString()} Viewers
                </span>
              )}
            </span>
          </button>
          {!isOwnerHost && (
            <button
              type="button"
              onClick={() => onToggleFollow(host.uid)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors shrink-0 ${
                isFollowingHost
                  ? 'bg-white/15 text-slate-200'
                  : 'bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white'
              }`}
            >
              {isFollowingHost ? 'Following' : '+ Follow'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isSolo && (
            <>
              <span className="inline-flex items-center gap-1 rounded-full bg-black/45 backdrop-blur-md border border-white/10 px-2.5 py-1.5 text-[11px] font-mono tabular-nums text-slate-200">
                <Eye className="w-3.5 h-3.5 text-sky-300" aria-hidden="true" />
                <span>{room.viewerCount.toLocaleString()}</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-black/45 backdrop-blur-md border border-white/10 px-2.5 py-1.5 text-[11px] font-mono tabular-nums text-slate-200">
                <Radio className="w-3.5 h-3.5 text-fuchsia-400" aria-hidden="true" />
                <span>{formatDuration(room.durationSeconds)}</span>
              </span>
              <span className="inline-flex items-center rounded-full bg-rose-600 px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-white">
                LIVE
              </span>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              if (isSolo && isOwnerHost) {
                setConfirmEndOpen(true);
                return;
              }
              stopLocalMedia();
              onLeaveRoom();
            }}
            aria-label="Leave live room"
            className={`rounded-full flex items-center justify-center transition-colors ${
              isSolo
                ? 'w-11 h-11 bg-black/70 hover:bg-black/90'
                : 'w-8 h-8 bg-black/45 backdrop-blur-md border border-white/10 hover:bg-black/65'
            }`}
          >
            <X className={isSolo ? 'w-5 h-5' : 'w-4 h-4'} />
          </button>
        </div>
      </div>

      {/* Media error */}
      {mediaError && (
        <div className="absolute top-16 inset-x-0 z-20 flex justify-center px-4">
          <p className="text-xs text-rose-200 bg-rose-950/80 backdrop-blur-md border border-rose-500/40 rounded-full px-4 py-2">
            {mediaError}
          </p>
        </div>
      )}

      {/* Sound toggle + connection status */}
      {isParticipant && (remoteStream || Object.keys(guestStreams).length > 0) && (
        <div className="absolute top-16 inset-x-0 z-20 flex justify-center px-4">
          <button
            type="button"
            onClick={() => setRemoteMuted((m) => !m)}
            className={`inline-flex items-center gap-1.5 rounded-full backdrop-blur-md border px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${
              remoteMuted
                ? 'bg-cyan-500/85 border-cyan-300/50 text-white animate-pulse'
                : 'bg-black/50 border-white/15 text-slate-200'
            }`}
          >
            {remoteMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Tap for sound</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Sound on</span>
              </>
            )}
          </button>
        </div>
      )}
      {receivesHost && !remoteStream && room.status === 'LIVE' && !isOfflineSimulated && (
        <div className="absolute top-16 inset-x-0 z-20 flex justify-center px-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/15 px-3.5 py-1.5 text-[11px] text-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {broadcastState === 'ended' ? 'Stream ended' : 'Connecting to live…'}
          </span>
        </div>
      )}

      {/* Gift celebration banner */}
      {latestGiftBanner && (
        <div className="absolute left-3 top-20 z-20 rounded-2xl bg-gradient-to-r from-fuchsia-600/90 to-violet-600/90 backdrop-blur-md border border-white/20 px-4 py-2.5 shadow-xl flex items-center gap-3 animate-pulse">
          <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
          <div>
            <p className="text-xs font-bold text-white">
              {latestGiftBanner.displayName} sent{' '}
              {latestGiftBanner.giftName ?? 'a gift'}!
            </p>
            <p className="text-[11px] font-mono text-fuchsia-100">
              {latestGiftBanner.giftAmount}{' '}
              {latestGiftBanner.giftCurrency === 'DIAMOND'
                ? 'Diamonds'
                : 'Coins'}
            </p>
          </div>
        </div>
      )}

      {/* Right floating action rail (multi-guest only) */}
      {!isSolo && (
      <div className="absolute right-3 bottom-44 z-20 flex flex-col items-center gap-2.5">
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
          aria-label="Send gift"
          className="w-11 h-11 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 disabled:opacity-45 flex items-center justify-center text-white shadow-lg shadow-fuchsia-600/30 transition-all"
        >
          <Gift className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => onShareRoom(room)}
          aria-label="Share room"
          className={railButtonClass}
        >
          <Share2 className="w-4.5 h-4.5" />
        </button>
        <button
          type="button"
          onClick={() => onOpenReportRoom(room)}
          aria-label="Report room"
          className={railButtonClass}
        >
          <ShieldAlert className="w-4.5 h-4.5 text-amber-300" />
        </button>
        {isOwnerHost && (
          <button
            type="button"
            onClick={() => setConfirmEndOpen(true)}
            aria-label="End live"
            className="w-11 h-11 rounded-full bg-rose-600/85 hover:bg-rose-500 flex items-center justify-center text-white transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        )}
      </div>
      )}

      {/* Bottom stack: seats, chat, controls, input */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2.5 px-3 sm:px-4 pb-3">
        {/* Compact guest seats strip (multi-guest only) */}
        {!isSolo && (
        <div
          aria-label="Multi-guest seats"
          className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {seats.map((seat) => {
            const isOccupied = seat.status === 'OCCUPIED';
            const isLocked = seat.status === 'LOCKED';
            const isRequested = seat.status === 'REQUESTED';
            const isMySeat = Boolean(
              currentUser && isOccupied && seat.occupantUid === currentUser.uid
            );

            return (
              <div
                key={seat.seatNumber}
                className={`w-[76px] shrink-0 rounded-xl backdrop-blur-md border p-2 flex flex-col items-center gap-1 ${
                  isOccupied
                    ? 'bg-violet-600/25 border-violet-400/40'
                    : isLocked
                    ? 'bg-black/40 border-white/10 opacity-70'
                    : isRequested
                    ? 'bg-sky-500/20 border-sky-400/40'
                    : 'bg-black/40 border-white/15'
                }`}
              >
                {isOccupied ? (
                  <>
                    {isMySeat && mediaActive && mediaHandleRef.current ? (
                      <GuestTileMedia
                        stream={mediaHandleRef.current.stream}
                        muted
                        name={seat.occupantName ?? 'Guest'}
                        color={seat.occupantAvatarColor}
                        speaking={seat.isSpeaking && !seat.isMuted}
                      />
                    ) : seat.occupantUid && guestStreams[seat.occupantUid] ? (
                      <GuestTileMedia
                        stream={guestStreams[seat.occupantUid]}
                        muted={remoteMuted || Boolean(seat.isMuted)}
                        name={seat.occupantName ?? 'Guest'}
                        color={seat.occupantAvatarColor}
                        speaking={seat.isSpeaking && !seat.isMuted}
                      />
                    ) : (
                      <Avatar
                        name={seat.occupantName ?? 'Guest'}
                        color={seat.occupantAvatarColor}
                        size="sm"
                        isSpeaking={seat.isSpeaking && !seat.isMuted}
                      />
                    )}
                    <p className="text-[10px] font-medium text-white truncate max-w-full">
                      {seat.occupantName}
                    </p>
                    <div className="flex items-center gap-1">
                      {seat.isMuted ? (
                        <MicOff className="w-3 h-3 text-rose-300" aria-label="Muted" />
                      ) : (
                        <Mic className="w-3 h-3 text-emerald-300" aria-label="Unmuted" />
                      )}
                      {canModerateSeats && (
                        <>
                          <button
                            type="button"
                            onClick={() => onToggleMuteGuest(room.roomId, seat)}
                            aria-label={seat.isMuted ? 'Unmute guest' : 'Mute guest'}
                            className="text-[9px] text-slate-300 hover:text-white"
                          >
                            {seat.isMuted ? 'Unmute' : 'Mute'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveGuest(room.roomId, seat.seatNumber)}
                            aria-label="Remove guest"
                            className="text-rose-300 hover:text-rose-200"
                          >
                            <UserMinus className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {isMySeat && (
                        <button
                          type="button"
                          onClick={() => {
                            stopLocalMedia();
                            onLeaveSeat(room.roomId, seat.seatNumber);
                          }}
                          aria-label="Step down from seat"
                          className="text-rose-300 hover:text-rose-200"
                        >
                          <LogOut className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </>
                ) : isLocked ? (
                  <>
                    <span className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </span>
                    <span className="text-[9px] text-slate-400">Locked</span>
                    {canModerateSeats && (
                      <button
                        type="button"
                        onClick={() => onToggleSeatLock(room.roomId, seat)}
                        className="text-[9px] text-slate-300 hover:text-white inline-flex items-center gap-0.5"
                      >
                        <Unlock className="w-2.5 h-2.5" />
                        <span>Unlock</span>
                      </button>
                    )}
                  </>
                ) : isRequested ? (
                  <>
                    <span className="w-9 h-9 rounded-full bg-sky-500/20 flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-sky-300" />
                    </span>
                    <span className="text-[9px] text-sky-200">Requested</span>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isOfflineSimulated || Boolean(mySeat)}
                      onClick={() => onRequestSeat(room.roomId, seat.seatNumber)}
                      aria-label={`Request seat ${seat.seatNumber}`}
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-fuchsia-500/40 disabled:opacity-40 flex items-center justify-center text-slate-200 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <span className="text-[9px] text-slate-300">
                      Seat {seat.seatNumber}
                    </span>
                    {canModerateSeats && (
                      <button
                        type="button"
                        onClick={() => onToggleSeatLock(room.roomId, seat)}
                        className="text-[9px] text-slate-400 hover:text-white inline-flex items-center gap-0.5"
                      >
                        <Lock className="w-2.5 h-2.5" />
                        <span>Lock</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        )}

        {/* Floating chat overlay */}
        <div
          ref={chatScrollRef}
          className={`overflow-y-auto space-y-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            isSolo ? 'max-h-60 max-w-[85%] sm:max-w-md' : 'max-h-44 sm:max-h-52 max-w-md'
          }`}
        >
          {comments.length === 0 ? (
            <p className="text-xs text-slate-300/80 bg-black/35 backdrop-blur-sm rounded-full px-3 py-1.5 inline-block">
              No messages yet. Say hello!
            </p>
          ) : (
            comments.map((comment) =>
              isSolo ? (
                <div
                  key={comment.id}
                  className={`rounded-2xl px-4 py-2.5 backdrop-blur-sm block w-fit max-w-full ${
                    comment.isGiftEvent
                      ? 'bg-gradient-to-r from-fuchsia-600/70 to-violet-600/70 border border-fuchsia-300/30'
                      : 'bg-black/55'
                  }`}
                >
                  <span className="text-sm font-bold text-cyan-300 mr-2">
                    {comment.displayName}
                  </span>
                  <span className="text-sm text-white leading-relaxed">
                    {comment.text}
                  </span>
                </div>
              ) : (
                <div
                  key={comment.id}
                  className={`rounded-2xl px-3 py-1.5 text-xs leading-relaxed backdrop-blur-sm inline-block max-w-full ${
                    comment.isGiftEvent
                      ? 'bg-gradient-to-r from-fuchsia-600/70 to-violet-600/70 border border-fuchsia-300/30'
                      : 'bg-black/40'
                  }`}
                >
                  <span className="inline-flex items-center rounded-md bg-gradient-to-r from-fuchsia-500 to-violet-500 px-1.5 py-0.5 text-[9px] font-bold text-white mr-1.5 align-middle">
                    {comment.displayName}
                  </span>
                  <span className="text-white align-middle">{comment.text}</span>
                </div>
              )
            )
          )}
        </div>

        {/* Publisher media controls (multi-guest only; solo controls live in the bottom bar) */}
        {canPublishLocalMedia && !isSolo && (
          <div className="flex items-center justify-end gap-2">
            {mediaActive && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-md border border-emerald-400/30 px-2.5 py-1.5 text-[10px] text-emerald-300 mr-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <div className="w-12 h-1 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${micMuted ? 0 : audioLevel}%` }}
                  />
                </div>
              </div>
            )}
            {!mediaActive ? (
              <button
                type="button"
                disabled={isOfflineSimulated}
                onClick={() => {
                  void startOrRestartMedia(cameraFacing);
                }}
                aria-label="Enable camera and microphone"
                className="w-10 h-10 rounded-full bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-45 flex items-center justify-center text-white transition-colors"
              >
                {room.mode === 'AUDIO' ? (
                  <Mic className="w-4.5 h-4.5" />
                ) : (
                  <Video className="w-4.5 h-4.5" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopLocalMedia}
                aria-label="Stop preview"
                className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md border border-white/15 hover:bg-black/65 flex items-center justify-center text-amber-300 transition-colors"
              >
                <VideoOff className="w-4.5 h-4.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleMic}
              aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${
                micMuted
                  ? 'bg-rose-500/70 border-rose-300/40 text-white'
                  : 'bg-black/45 border-white/15 text-white hover:bg-black/65'
              }`}
            >
              {micMuted ? (
                <MicOff className="w-4.5 h-4.5" />
              ) : (
                <Mic className="w-4.5 h-4.5" />
              )}
            </button>
            {room.mode !== 'AUDIO' && (
              <>
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
                  className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${
                    cameraOff
                      ? 'bg-rose-500/70 border-rose-300/40 text-white'
                      : 'bg-black/45 border-white/15 text-white hover:bg-black/65'
                  }`}
                >
                  {cameraOff ? (
                    <VideoOff className="w-4.5 h-4.5" />
                  ) : (
                    <Video className="w-4.5 h-4.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  aria-label="Switch camera"
                  className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md border border-white/15 hover:bg-black/65 flex items-center justify-center text-white transition-colors"
                >
                  <RefreshCw className="w-4.5 h-4.5" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Bottom input bar */}
        <form
          onSubmit={handleSubmitChat}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isOfflineSimulated}
            placeholder={
              !currentUser
                ? 'Sign in to chat...'
                : isOfflineSimulated
                ? 'Reconnect to chat...'
                : isSolo
                ? 'Comment'
                : "What's up..."
            }
            className={`flex-1 min-w-0 h-11 px-4 rounded-full backdrop-blur-md border focus:outline-none text-sm text-white placeholder:text-slate-400 ${
              isSolo
                ? 'bg-[#15163A]/80 border-white/10 focus:border-cyan-400/60'
                : 'bg-black/50 border-white/15 focus:border-fuchsia-400/60'
            }`}
          />
          {isSolo ? (
            <>
              {canPublishLocalMedia && room.mode !== 'AUDIO' && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  aria-label="Switch camera"
                  className="w-11 h-11 rounded-full bg-[#232456]/90 hover:bg-[#2E2F6E] flex items-center justify-center text-white shrink-0 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
              {canPublishLocalMedia && (
                <button
                  type="button"
                  onClick={() => {
                    if (mediaActive) {
                      handleToggleMic();
                    } else {
                      void startOrRestartMedia(cameraFacing);
                    }
                  }}
                  aria-label={
                    !mediaActive
                      ? 'Enable microphone'
                      : micMuted
                      ? 'Unmute microphone'
                      : 'Mute microphone'
                  }
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    micMuted
                      ? 'bg-rose-500/80 text-white'
                      : 'bg-[#232456]/90 hover:bg-[#2E2F6E] text-white'
                  }`}
                >
                  {micMuted ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
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
                aria-label="Send gift"
                className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-amber-400 hover:from-pink-400 hover:to-amber-300 disabled:opacity-45 flex items-center justify-center text-white shrink-0 transition-all"
              >
                <Gift className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setLikes((n) => n + 1)}
                aria-label="Like this live"
                className="relative w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 flex items-center justify-center text-white shrink-0 transition-all active:scale-90"
              >
                <Heart className="w-5 h-5 fill-current" />
                {likes > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-white text-pink-600 text-[10px] font-bold flex items-center justify-center px-1">
                    {likes > 99 ? '99+' : likes}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setGuestPanelOpen(true)}
                aria-label="More options"
                className="w-11 h-11 rounded-full bg-[#232456]/90 hover:bg-[#2E2F6E] flex items-center justify-center text-white shrink-0 transition-colors"
              >
                <Users className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="submit"
                disabled={
                  (currentUser !== null && !chatInput.trim()) || isOfflineSimulated
                }
                aria-label="Send comment"
                className="w-11 h-11 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 disabled:opacity-40 flex items-center justify-center text-white shrink-0 transition-all"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
              <button
                type="button"
                onClick={() => setGuestPanelOpen(true)}
                aria-label="Guests and requests"
                className="relative w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/15 hover:bg-black/70 flex items-center justify-center text-white shrink-0 transition-colors"
              >
                <Users className="w-4.5 h-4.5" />
                {joinRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-[10px] font-bold flex items-center justify-center px-1">
                    {joinRequests.length}
                  </span>
                )}
              </button>
            </>
          )}
        </form>
      </div>

      {/* Gift tray bottom sheet */}
      {showGiftTray && (
        <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-3xl bg-[#121521]/95 backdrop-blur-xl border-t border-fuchsia-500/30 p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-semibold text-white">
                Send Gift
              </h3>
              <p className="text-xs text-slate-400">
                <span className="font-mono text-amber-300">{coinBalance} Coins</span>
                {' · '}
                <span className="font-mono text-sky-300">{diamondBalance} Diamonds</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowGiftTray(false)}
              aria-label="Close gift tray"
              className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-white/[0.14] flex items-center justify-center text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {gifts.map((gift) => (
              <button
                key={gift.giftId}
                type="button"
                disabled={isOfflineSimulated}
                onClick={() => onSendGift(room.roomId, gift)}
                className="rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-fuchsia-400/50 p-3 flex flex-col items-center text-center gap-2 transition-colors disabled:opacity-45"
              >
                <GiftArtwork artworkKey={gift.artworkKey} size={40} />
                <div>
                  <p className="text-xs font-medium text-white truncate max-w-[12ch]">
                    {gift.name}
                  </p>
                  <p className="text-[11px] font-mono tabular-nums text-fuchsia-300 mt-0.5">
                    {gift.price} {gift.currency === 'COIN' ? 'Coins' : 'Diamonds'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Guests & requests bottom sheet */}
      {guestPanelOpen && (
        <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-3xl bg-[#121521]/95 backdrop-blur-xl border-t border-white/15 p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-white">
              Guests & Requests
            </h3>
            <button
              type="button"
              onClick={() => setGuestPanelOpen(false)}
              aria-label="Close guest panel"
              className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-white/[0.14] flex items-center justify-center text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isSolo && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onShareRoom(room)}
                className="flex-1 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Room</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenReportRoom(room)}
                className="flex-1 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-amber-300 inline-flex items-center justify-center gap-2 transition-colors"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Report</span>
              </button>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Pending Requests ({joinRequests.length})</span>
            </h4>
            {joinRequests.length === 0 ? (
              <p className="text-xs text-slate-500">No pending seat requests.</p>
            ) : (
              <div className="space-y-2">
                {joinRequests.map((req) => (
                  <div
                    key={req.requestId}
                    className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-3 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={req.displayName} color={req.avatarColor} size="xs" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {req.displayName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          @{req.username} · Seat {req.preferredSeatNumber ?? 'Any'}
                        </p>
                      </div>
                    </div>
                    {canModerateSeats && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onApproveJoinRequest(room.roomId, req)}
                          aria-label={`Approve ${req.displayName}`}
                          className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/35"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRejectJoinRequest(room.roomId, req)}
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
            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-violet-400" />
              <span>On Stage ({occupiedCount})</span>
            </h4>
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
                          Seat {seat.seatNumber} · {seat.isMuted ? 'Muted' : 'Speaking'}
                        </p>
                      </div>
                    </div>
                    {canModerateSeats && (
                      <button
                        type="button"
                        onClick={() => onRemoveGuest(room.roomId, seat.seatNumber)}
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
              This will mark the room as ended and close the stage for all
              participants.
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