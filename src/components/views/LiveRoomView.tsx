import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Armchair,
  Ban,
  Camera,
  Check,
  Cherry,
  Coins,
  Eye,
  Flag,
  Flower2,
  Gamepad2,
  Gift,
  Heart,
  Loader2,
  Lock,
  LogOut,
  MessagesSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  Radio,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Trash2,
  Unlock,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  UserX,
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
  RoomModerator,
  UserProfile,
} from '../../types/app';
import {
  LocalMediaHandle,
  VIDEO_QUALITIES,
  VideoQuality,
  describeMediaError,
  listMediaDevices,
  startLocalMediaCapture,
} from '../../lib/mediaProvider';
import {
  ViewerStreamState,
  joinGuestStream,
  joinViewerStream,
  startGuestBroadcast,
  startHostBroadcast,
} from '../../lib/webrtcBroadcast';
import {
  sendRoomLikesDoc,
  subscribeRoomLikes,
  subscribeRoomModerators,
  subscribeRoomPresence,
} from '../../lib/firestoreService';
import { Avatar } from '../ui/Avatar';
import { MediaImage } from '../ui/MediaImage';
import { GiftArtwork } from '../ui/GiftArtwork';
import { GiftEffectsOverlay, GiftFx } from '../ui/GiftEffectsOverlay';
import { GIFT_BY_ID, giftTier, GiftTier } from '../../data/gifts';
import {
  LUCKY_BY_ID,
  LUCKY_GIFTS,
  LuckyGiftBox,
  LuckyRoll,
  luckyTier,
  rollLucky,
} from '../../data/luckyGifts';
import { FruitManorLiveBoard } from '../games/FruitManorLiveBoard';
import { GoldenFlowerLiveBoard } from '../games/GoldenFlowerLiveBoard';

type LiveMediaPrefs = {
  cameraId: string;
  micId: string;
  quality: VideoQuality;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  mirror: boolean;
};

const MEDIA_PREFS_KEY = 'addabuzz.liveMediaPrefs.v1';
const DEFAULT_MEDIA_PREFS: LiveMediaPrefs = {
  cameraId: '',
  micId: '',
  quality: '720p',
  noiseSuppression: true,
  echoCancellation: true,
  mirror: true,
};

function loadMediaPrefs(): LiveMediaPrefs {
  try {
    const raw = window.localStorage.getItem(MEDIA_PREFS_KEY);
    if (!raw) return DEFAULT_MEDIA_PREFS;
    const parsed = JSON.parse(raw) as Partial<LiveMediaPrefs>;
    return { ...DEFAULT_MEDIA_PREFS, ...parsed };
  } catch {
    return DEFAULT_MEDIA_PREFS;
  }
}

function saveMediaPrefs(prefs: LiveMediaPrefs) {
  try {
    window.localStorage.setItem(MEDIA_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Preferences are a convenience; capture still works without persistence.
  }
}

const CHAT_EMOJIS = ['❤️', '🔥', '👏', '😂', '😮', '💎', '🎉', '👍', '💜', '🥳', '😍', '🙌'];

type FloatingLike = { id: string; offset: number; rotate: number };

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
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Avatar name={name} color={color} size="md" isSpeaking={speaking} />
        </div>
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
  users: UserProfile[];
  currentUser: UserProfile | null;
  isAdminUser: boolean;
  gifts: GiftCatalogItem[];
  coinBalance: number;
  isFollowingHost: boolean;
  isOfflineSimulated: boolean;
  blockedUids: string[];
  followingUids: string[];
  onLeaveRoom: () => void;
  onEndRoom: (roomId: string) => void;
  onToggleFollow: (uid: string) => void;
  onSendComment: (roomId: string, text: string) => void | Promise<void>;
  onSendGift: (roomId: string, gift: GiftCatalogItem, recipientUid?: string) => void;
  onSendLuckyGift: (
    roomId: string,
    box: LuckyGiftBox,
    roll: LuckyRoll,
    recipientUid?: string
  ) => Promise<number | null>;
  onRequestSeat: (roomId: string, seatNumber: number) => void;
  onLeaveSeat: (roomId: string, seatNumber: number) => void;
  onApproveJoinRequest: (roomId: string, request: JoinRequest) => void;
  onRejectJoinRequest: (roomId: string, request: JoinRequest) => void;
  onToggleSeatLock: (roomId: string, seat: GuestSeat) => void;
  onToggleMuteGuest: (roomId: string, seat: GuestSeat) => void;
  onRemoveGuest: (roomId: string, seatNumber: number) => void;
  onKickViewer: (roomId: string, viewerUid: string) => void;
  onDeleteComment: (roomId: string, comment: RoomComment) => void;
  onAddModerator: (roomId: string, uid: string) => void;
  onRemoveModerator: (roomId: string, uid: string) => void;
  onInviteViewer: (uid: string) => void;
  onReportUser: (uid: string) => void;
  onToggleBlock: (uid: string) => void;
  onOpenProfile: (user: UserProfile) => void;
  onOpenAuth: () => void;
}

export const LiveRoomView: React.FC<LiveRoomViewProps> = ({
  room,
  seats,
  joinRequests,
  comments,
  host,
  users,
  currentUser,
  isAdminUser,
  gifts,
  coinBalance,
  isFollowingHost,
  isOfflineSimulated,
  blockedUids,
  followingUids,
  onLeaveRoom,
  onEndRoom,
  onToggleFollow,
  onSendComment,
  onSendGift,
  onSendLuckyGift,
  onRequestSeat,
  onLeaveSeat,
  onApproveJoinRequest,
  onRejectJoinRequest,
  onToggleSeatLock,
  onToggleMuteGuest,
  onRemoveGuest,
  onKickViewer,
  onDeleteComment,
  onAddModerator,
  onRemoveModerator,
  onInviteViewer,
  onReportUser,
  onToggleBlock,
  onOpenProfile,
  onOpenAuth,
}) => {
  const isOwnerHost = Boolean(currentUser && room.hostUid === currentUser.uid);
  const [moderators, setModerators] = useState<RoomModerator[]>([]);
  useEffect(() => {
    if (!currentUser) {
      setModerators([]);
      return;
    }
    return subscribeRoomModerators(room.roomId, setModerators);
  }, [room.roomId, currentUser?.uid]);
  const isModerator = Boolean(
    currentUser && moderators.some((m) => m.uid === currentUser.uid)
  );
  const canModerate = isOwnerHost || isAdminUser || isModerator;
  const canModerateSeats = canModerate;
  const allowGuestRequests = room.allowGuestRequests !== false;
  const allowViewerComments = room.allowViewerComments !== false;
  const allowGifts = room.allowGifts !== false;
  const hostApprovalForGuests = room.hostApprovalForGuests !== false;
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
  const isSolo = room.mode === 'VIDEO';

  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(room.mode === 'AUDIO');
  const [cameraFacing, setCameraFacing] = useState<'Front' | 'Rear'>('Front');
  const [mediaActive, setMediaActive] = useState(false);
  const [mediaStarting, setMediaStarting] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [mediaPrefs, setMediaPrefs] = useState<LiveMediaPrefs>(loadMediaPrefs);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [peerCount, setPeerCount] = useState(0);

  const [viewerUids, setViewerUids] = useState<string[]>([]);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [kickTargetUid, setKickTargetUid] = useState<string | null>(null);

  const [likeServerTotal, setLikeServerTotal] = useState(0);
  const [likeLocalPending, setLikeLocalPending] = useState(0);
  const [floatingLikes, setFloatingLikes] = useState<FloatingLike[]>([]);
  const pendingLikesRef = useRef(0);
  const likeFlushTimerRef = useRef<number | null>(null);
  const lastServerLikeTotalRef = useRef<number | null>(null);
  const floatingLikeSeqRef = useRef(0);

  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);

  const mediaHandleRef = useRef<LocalMediaHandle | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteMuted, setRemoteMuted] = useState(true);
  const [broadcastState, setBroadcastState] = useState<ViewerStreamState>('connecting');
  const [guestStreams, setGuestStreams] = useState<Record<string, MediaStream>>({});

  const [chatInput, setChatInput] = useState('');
  const [boardTab, setBoardTab] = useState<'chat' | 'fruit' | 'golden'>('chat');
  const [showGamesModal, setShowGamesModal] = useState(false);
  const [showGiftTray, setShowGiftTray] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<string>(gifts[0]?.giftId ?? '');
  const [giftTab, setGiftTab] = useState<'all' | GiftTier | 'lucky'>('all');
  const [giftTargetUid, setGiftTargetUid] = useState<string>('');
  const [luckyBoxId, setLuckyBoxId] = useState<string>(LUCKY_GIFTS[0].giftId);
  const [luckyQty, setLuckyQty] = useState<1 | 5 | 10>(1);
  const [luckyBusy, setLuckyBusy] = useState(false);
  const [luckyDraws, setLuckyDraws] = useState<Array<LuckyRoll & { key: string }>>([]);
  const luckyBox = LUCKY_GIFTS.find((b) => b.giftId === luckyBoxId) ?? LUCKY_GIFTS[0];
  const selectedGift = gifts.find((g) => g.giftId === selectedGiftId) ?? null;
  const visibleGifts =
    giftTab === 'all' ? gifts : giftTab === 'lucky' ? [] : gifts.filter((g) => giftTier(g.price) === giftTab);

  // Gift targets: the host plus everyone currently seated in a multi-guest room.
  // You never gift yourself, so the signed-in user is excluded from the list.
  const giftTargets = useMemo(() => {
    const list: Array<{
      uid: string;
      name: string;
      username: string;
      avatarColor?: string;
      isHost: boolean;
    }> = [];

    if (host.uid !== currentUser?.uid) {
      list.push({
        uid: host.uid,
        name: host.displayName,
        username: host.username,
        avatarColor: host.avatarColor,
        isHost: true,
      });
    }

    seats.forEach((seat) => {
      if (
        seat.status === 'OCCUPIED' &&
        seat.occupantUid &&
        seat.occupantUid !== host.uid &&
        seat.occupantUid !== currentUser?.uid &&
        !list.some((t) => t.uid === seat.occupantUid)
      ) {
        list.push({
          uid: seat.occupantUid,
          name: seat.occupantName ?? 'Guest',
          username: seat.occupantUsername ?? 'guest',
          avatarColor: seat.occupantAvatarColor,
          isHost: false,
        });
      }
    });
    return list;
  }, [host, seats, currentUser?.uid]);

  const selectedGiftTarget =
    giftTargets.find((t) => t.uid === giftTargetUid) ?? giftTargets[0];

  // Diamonds each participant has received from gifts in this room.
  const giftEarnings = useMemo(() => {
    const totals = new Map<string, number>();
    comments.forEach((comment) => {
      if (!comment.isGiftEvent || !comment.giftRecipientUid) return;
      const amount = Number(comment.giftRecipientDiamonds ?? 0);
      totals.set(comment.giftRecipientUid, (totals.get(comment.giftRecipientUid) ?? 0) + amount);
    });
    return totals;
  }, [comments]);

  const visibleComments = useMemo(
    () => comments.filter((c) => !blockedUids.includes(c.uid)),
    [comments, blockedUids]
  );
  const canComment = allowViewerComments || canModerate;
  const giftsAllowed = allowGifts || isOwnerHost || isAdminUser;

  useEffect(() => {
    if (showGiftTray && !giftTargets.some((t) => t.uid === giftTargetUid)) {
      setGiftTargetUid(giftTargets[0]?.uid ?? '');
    }
  }, [showGiftTray, giftTargets, giftTargetUid]);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  // Gift effect queue — every new gift event in room chat drives an overlay effect
  const [giftFx, setGiftFx] = useState<GiftFx[]>([]);
  const [receivedNotice, setReceivedNotice] = useState<string | null>(null);
  const seenGiftIdRef = useRef<string | null>(null);
  const receivedTimerRef = useRef<number | null>(null);
  const comboRef = useRef<{ giftId: string; uid: string; ts: number; count: number } | null>(null);

  useEffect(() => {
    const giftEvents = comments.filter((c) => c.isGiftEvent);
    const newest = giftEvents[giftEvents.length - 1];
    if (seenGiftIdRef.current === null) {
      seenGiftIdRef.current = newest?.id ?? '';
      return;
    }
    if (!newest) return;
    if (newest.id !== seenGiftIdRef.current) {
      seenGiftIdRef.current = newest.id;
      const gift =
        (newest.giftId ? GIFT_BY_ID.get(newest.giftId) : undefined) ??
        (newest.giftId ? LUCKY_BY_ID.get(newest.giftId) : undefined) ??
        gifts.find((g) => g.name === newest.giftName);
      if (!gift) return;

      // Let the recipient see exactly how many Diamonds they received.
      if (
        currentUser &&
        newest.giftRecipientUid === currentUser.uid &&
        (newest.giftRecipientDiamonds ?? 0) > 0
      ) {
        setReceivedNotice(
          `+${Number(newest.giftRecipientDiamonds).toLocaleString()} Diamonds`
        );
        if (receivedTimerRef.current) window.clearTimeout(receivedTimerRef.current);
        receivedTimerRef.current = window.setTimeout(() => setReceivedNotice(null), 4500);
      }

      const now = Date.now();
      const prev = comboRef.current;
      const combo =
        prev && prev.giftId === gift.giftId && prev.uid === newest.uid && now - prev.ts < 5000
          ? prev.count + 1
          : 1;
      comboRef.current = { giftId: gift.giftId, uid: newest.uid, ts: now, count: combo };
      setGiftFx((prevFx) => [
        ...prevFx.slice(-3),
        { key: newest.id, gift, senderName: newest.displayName, combo },
      ]);
    }
  }, [comments, gifts, currentUser]);

  useEffect(() => {
    return () => {
      if (receivedTimerRef.current) window.clearTimeout(receivedTimerRef.current);
    };
  }, []);

  const handleGiftFxExpire = (key: string) => {
    setGiftFx((prev) => prev.filter((f) => f.key !== key));
  };

  // Poppo-style Lucky open: each roll is its own gift transaction, so a x10
  // batch is sent sequentially and stops the moment one fails (e.g. funds).
  const openLucky = async () => {
    if (!currentUser || luckyBusy || isOfflineSimulated || !selectedGiftTarget) return;
    if (coinBalance < luckyBox.price * luckyQty) return;
    setLuckyBusy(true);
    for (let i = 0; i < luckyQty; i += 1) {
      const roll = rollLucky(luckyBox);
      const diamonds = await onSendLuckyGift(room.roomId, luckyBox, roll, selectedGiftTarget.uid);
      if (diamonds === null) break;
      setLuckyDraws((prev) =>
        [{ ...roll, diamonds, key: `d${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}` }, ...prev].slice(
          0,
          12
        )
      );
      if (i < luckyQty - 1) {
        await new Promise((resolve) => setTimeout(resolve, 380));
      }
    }
    setLuckyBusy(false);
  };

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments.length]);

  const spawnLikeHearts = (count: number) => {    if (count <= 0) return;
    const items: FloatingLike[] = Array.from({ length: count }, () => ({
      id: `like_${Date.now()}_${floatingLikeSeqRef.current++}`,
      offset: Math.round(Math.random() * 30) - 15,
      rotate: Math.round(Math.random() * 44) - 22,
    }));
    setFloatingLikes((prev) => [...prev.slice(-12), ...items]);
    window.setTimeout(() => {
      setFloatingLikes((prev) =>
        prev.filter((f) => !items.some((item) => item.id === f.id))
      );
    }, 1600);
  };

  const refreshDevices = async () => {
    const { cameras, mics } = await listMediaDevices();
    setCameraDevices(cameras);
    setMicDevices(mics);
  };

  // Real connected viewers: viewers keep one signaling doc in rtc/{uid} while
  // they receive the stream, so this list is a live presence feed.
  useEffect(() => {
    if (!currentUser || isOfflineSimulated) {
      setViewerUids([]);
      return;
    }
    return subscribeRoomPresence(room.roomId, setViewerUids);
  }, [room.roomId, currentUser?.uid, isOfflineSimulated]);

  // Real-time likes: the client sums every viewer's additive counter doc.
  useEffect(() => {
    if (isOfflineSimulated) return;
    return subscribeRoomLikes(room.roomId, (total) => {
      setLikeServerTotal(total);
      const prev = lastServerLikeTotalRef.current;
      lastServerLikeTotalRef.current = total;
      if (prev !== null && total > prev) {
        spawnLikeHearts(Math.min(3, total - prev));
      }
    });
  }, [room.roomId, isOfflineSimulated]);

  // Camera / microphone device lists; refresh after permission and on hot-plug.
  useEffect(() => {
    void refreshDevices();
    if (!navigator.mediaDevices?.addEventListener) return;
    const onChange = () => void refreshDevices();
    navigator.mediaDevices.addEventListener('devicechange', onChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (likeFlushTimerRef.current) window.clearTimeout(likeFlushTimerRef.current);
    };
  }, [room.roomId]);

  useEffect(() => {
    if (!canPublishLocalMedia && mediaActive) {
      stopLocalMedia();
    }
  }, [canPublishLocalMedia, mediaActive]);

  const applyMediaPrefs = async (patch: Partial<LiveMediaPrefs>, restart = true) => {
    const next = { ...mediaPrefs, ...patch };
    setMediaPrefs(next);
    saveMediaPrefs(next);
    if (restart && mediaActive) {
      await startOrRestartMedia(cameraFacing, next);
    }
  };

  const startOrRestartMedia = async (
    facing: 'Front' | 'Rear',
    prefsOverride?: LiveMediaPrefs
  ) => {
    const prefs = prefsOverride ?? mediaPrefs;
    setMediaError(null);
    setMediaStarting(true);
    stopLocalMedia();
    try {
      const handle = await startLocalMediaCapture({
        mode: room.mode,
        facingMode: facing === 'Front' ? 'user' : 'environment',
        cameraDeviceId: prefs.cameraId || undefined,
        micDeviceId: prefs.micId || undefined,
        quality: prefs.quality,
        noiseSuppression: prefs.noiseSuppression,
        echoCancellation: prefs.echoCancellation,
        onAudioLevel: (lvl) => setAudioLevel(lvl),
      });
      handle.setAudioMuted(micMuted);
      handle.setVideoEnabled(!cameraOff);
      mediaHandleRef.current = handle;
      setMediaActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = handle.stream;
      }
      void refreshDevices();
    } catch (err) {
      // A stale saved deviceId should not brick capture — retry once with the
      // default device before surfacing the error.
      const staleDevice =
        (prefs.cameraId || prefs.micId) &&
        err instanceof Error &&
        ['OverconstrainedError', 'NotFoundError', 'DevicesNotFoundError'].includes(err.name);
      if (staleDevice) {
        const cleared = { ...prefs, cameraId: '', micId: '' };
        setMediaPrefs(cleared);
        saveMediaPrefs(cleared);
        try {
          const handle = await startLocalMediaCapture({
            mode: room.mode,
            facingMode: facing === 'Front' ? 'user' : 'environment',
            quality: cleared.quality,
            noiseSuppression: cleared.noiseSuppression,
            echoCancellation: cleared.echoCancellation,
            onAudioLevel: (lvl) => setAudioLevel(lvl),
          });
          handle.setAudioMuted(micMuted);
          handle.setVideoEnabled(!cameraOff);
          mediaHandleRef.current = handle;
          setMediaActive(true);
          if (videoRef.current) videoRef.current.srcObject = handle.stream;
          void refreshDevices();
          return;
        } catch (retryErr) {
          setMediaError(describeMediaError(retryErr));
        }
      } else {
        setMediaError(describeMediaError(err));
      }
      setMediaActive(false);
    } finally {
      setMediaStarting(false);
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
    if (!isOwnerHost || !mediaActive || isOfflineSimulated) {
      setPeerCount(0);
      return;
    }
    const stream = mediaHandleRef.current?.stream;
    if (!stream) return;
    const stopBroadcast = startHostBroadcast(room.roomId, stream, setPeerCount);
    return () => {
      stopBroadcast();
      setPeerCount(0);
    };
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

  // A host without camera/mic never publishes a stream — don't wait forever.
  const waitingForHostStream =
    receivesHost && !remoteStream && room.status === 'LIVE' && !isOfflineSimulated;
  const [hostStreamWaitExpired, setHostStreamWaitExpired] = useState(false);
  useEffect(() => {
    if (!waitingForHostStream) {
      setHostStreamWaitExpired(false);
      return;
    }
    const timer = window.setTimeout(() => setHostStreamWaitExpired(true), 15000);
    return () => window.clearTimeout(timer);
  }, [waitingForHostStream]);

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
    if (!mediaActive) {
      void startOrRestartMedia(cameraFacing);
      return;
    }
    const next = !micMuted;
    setMicMuted(next);
    mediaHandleRef.current?.setAudioMuted(next);
  };

  const handleToggleCamera = () => {
    if (!canPublishLocalMedia || room.mode === 'AUDIO') return;
    if (!mediaActive) {
      // Camera "on" while capture is stopped must actually start the device,
      // not just flip a flag on a dead stream.
      setCameraOff(false);
      void startOrRestartMedia(cameraFacing);
      return;
    }
    const next = !cameraOff;
    setCameraOff(next);
    mediaHandleRef.current?.setVideoEnabled(!next);
  };

  const handleSwitchCamera = () => {
    const next = cameraFacing === 'Front' ? 'Rear' : 'Front';
    setCameraFacing(next);
    const cleared = { ...mediaPrefs, cameraId: '' };
    if (mediaPrefs.cameraId) {
      setMediaPrefs(cleared);
      saveMediaPrefs(cleared);
    }
    if (mediaActive && room.mode !== 'AUDIO') {
      void startOrRestartMedia(next, cleared);
    }
  };

  const handleReconnect = () => {
    if (canPublishLocalMedia) {
      void startOrRestartMedia(cameraFacing);
      return;
    }
    retryAttemptsRef.current = 0;
    setBroadcastState('connecting');
    setReconnectTick((t) => t + 1);
  };

  const focusChat = () => {
    if (boardTab !== 'chat') setBoardTab('chat');
    window.setTimeout(() => chatInputRef.current?.focus(), 60);
  };

  const likeTotal = likeServerTotal + likeLocalPending;

  const flushLikes = async () => {
    likeFlushTimerRef.current = null;
    const delta = pendingLikesRef.current;
    pendingLikesRef.current = 0;
    if (!currentUser || delta <= 0) return;
    try {
      await sendRoomLikesDoc(room.roomId, currentUser.uid, Math.min(delta, 500));
      setLikeLocalPending((n) => Math.max(0, n - delta));
    } catch {
      setLikeLocalPending(0);
    }
  };

  const handleLike = () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (isOfflineSimulated) return;
    setLikeLocalPending((n) => n + 1);
    spawnLikeHearts(1);
    pendingLikesRef.current += 1;
    if (likeFlushTimerRef.current === null) {
      likeFlushTimerRef.current = window.setTimeout(() => void flushLikes(), 700);
    }
  };

  const handleKickViewer = (viewerUid: string) => {
    if (kickTargetUid !== viewerUid) {
      setKickTargetUid(viewerUid);
      return;
    }
    setKickTargetUid(null);
    onKickViewer(room.roomId, viewerUid);
    setViewerUids((prev) => prev.filter((uid) => uid !== viewerUid));
  };

  const handleMuteAllGuests = () => {
    seats.forEach((seat) => {
      if (seat.status === 'OCCUPIED' && !seat.isMuted) onToggleMuteGuest(room.roomId, seat);
    });
  };

  const handleLockAllSeats = () => {
    seats.forEach((seat) => {
      if (seat.status === 'AVAILABLE') onToggleSeatLock(room.roomId, seat);
    });
  };

  const handleUnlockAllSeats = () => {
    seats.forEach((seat) => {
      if (seat.status === 'LOCKED') onToggleSeatLock(room.roomId, seat);
    });
  };

  const occupiedCount = seats.filter((s) => s.status === 'OCCUPIED').length;

  // Real connected viewers with their public profiles resolved where possible.
  const viewerProfiles = useMemo(() => {
    const byUid = new Map<string, UserProfile>();
    users.forEach((u) => byUid.set(u.uid, u));
    return viewerUids.map((uid) => {
      const profile = byUid.get(uid);
      const comment = comments.find((c) => c.uid === uid);
      return {
        uid,
        profile,
        displayName: profile?.displayName ?? comment?.displayName ?? 'Viewer',
        username: profile?.username ?? comment?.username ?? `viewer_${uid.slice(0, 6)}`,
        avatarColor: profile?.avatarColor ?? '#6366F1',
        avatarUrl: profile?.avatarUrl,
      };
    });
  }, [viewerUids, users, comments]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSubmitChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!canComment) return;
    if (!chatInput.trim() || isOfflineSimulated || sendingChat) return;
    const text = chatInput.trim();
    setChatInput('');
    setSendingChat(true);
    try {
      await onSendComment(room.roomId, text);
    } finally {
      setSendingChat(false);
    }
  };

  const hasRemoteVideo = Boolean(remoteStream) && room.mode !== 'AUDIO';
  // Without an active capture there is no video/mic, even if the flags were never flipped.
  const cameraInactive = !mediaActive || cameraOff;
  const micInactive = !mediaActive || micMuted;
  const showLocalVideo =
    mediaActive && room.mode !== 'AUDIO' && !cameraOff && isOwnerHost;
  const showVideoFeed = showLocalVideo || hasRemoteVideo;
  const showCoverImage = !showVideoFeed && room.mode !== 'AUDIO' && !cameraOff;
  const hostSpeaking = isOwnerHost
    ? mediaActive && !micMuted && audioLevel > 10
    : !micMuted && (mediaActive ? audioLevel > 10 : true);

  // Never claim LIVE unless the actual media path is up: the host is capturing
  // and publishing, or the viewer has a connected peer stream.
  const viewerStreamLive = broadcastState === 'live' || Boolean(remoteStream);
  const streamIsLive = isOwnerHost ? mediaActive : viewerStreamLive;
  const statusBadge = streamIsLive
    ? {
        label: 'LIVE',
        className:
          'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-[0_4px_18px_-6px_rgba(244,63,94,0.85)]',
      }
    : isOwnerHost
      ? mediaStarting
        ? { label: 'STARTING', className: 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/40' }
        : { label: 'OFF AIR', className: 'bg-white/[0.06] text-slate-200 ring-1 ring-white/10' }
      : broadcastState === 'ended'
        ? { label: 'STREAM ENDED', className: 'bg-slate-600 text-white' }
        : hostStreamWaitExpired
          ? { label: 'LIVE · CHAT', className: 'bg-white/[0.06] text-slate-100 ring-1 ring-white/10' }
          : {
              label: 'CONNECTING',
              className: 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/40 animate-pulse',
            };

  // Fit the whole stage (host + every seat) on one screen: larger rooms get more,
  // smaller tiles instead of a scrolling grid.
  const compactStage = seats.length > 10;
  const stageGridCols =
    seats.length > 20 ? 'grid-cols-8' : seats.length > 14 ? 'grid-cols-7' : seats.length > 10 ? 'grid-cols-6' : 'grid-cols-4';

  // Gradient-ring icon badges for the seat tiles.
  const seatBadgeTone = {
    gold: {
      ring: 'from-amber-200/95 via-yellow-400/55 to-amber-600/85',
      glow: 'shadow-[0_8px_24px_-8px_rgba(251,191,36,0.75)]',
      icon: 'text-amber-100',
    },
    violet: {
      ring: 'from-violet-400/90 via-fuchsia-400/50 to-sky-400/80',
      glow: 'shadow-[0_8px_22px_-8px_rgba(168,85,247,0.85)]',
      icon: 'text-violet-100',
    },
    amber: {
      ring: 'from-amber-300/80 via-orange-400/40 to-amber-500/70',
      glow: 'shadow-[0_8px_22px_-8px_rgba(245,158,11,0.6)]',
      icon: 'text-amber-200',
    },
    sky: {
      ring: 'from-sky-300/90 via-cyan-400/50 to-sky-500/80',
      glow: 'shadow-[0_8px_22px_-8px_rgba(56,189,248,0.75)]',
      icon: 'text-sky-100',
    },
    slate: {
      ring: 'from-white/35 via-white/[0.1] to-white/25',
      glow: '',
      icon: 'text-slate-300',
    },
  } as const;

  // Boards are shared between the solo dock and the multi-guest stage area.
  const gameBoardContent = !currentUser ? (
    <button
      type="button"
      onClick={onOpenAuth}
      className="block w-full px-3 py-4 text-left"
    >
      <span className="text-xs font-semibold text-white">Sign in to play the live boards</span>
      <span className="mt-0.5 block text-[10px] text-slate-400">
        Fruit Manor and Golden Flower run live with everyone in this room.
      </span>
    </button>
  ) : boardTab === 'fruit' ? (
    <FruitManorLiveBoard
      currentUser={currentUser}
      coinBalance={coinBalance}
      isOffline={isOfflineSimulated}
      onBack={() => setBoardTab('chat')}
    />
  ) : (
    <GoldenFlowerLiveBoard
      currentUser={currentUser}
      coinBalance={coinBalance}
      isOffline={isOfflineSimulated}
      onBack={() => setBoardTab('chat')}
    />
  );

  return (
    <div className={`theme-dark-stage fixed inset-0 bg-[#07080D] text-white overflow-hidden ${isSolo ? '' : 'flex flex-col'}`}>
      {/* Stage background: solo = full-screen host feed; multi-guest = ambient gradient (host lives in Seat 1) */}
      <div className="absolute inset-0">
        {isSolo ? (
          <>
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
                  cameraFacing === 'Front' && mediaPrefs.mirror ? '-scale-x-100' : ''
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
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: room.fallbackGradient }}>
            <div className="absolute inset-0 bg-[#07080D]/55" />
            <div className="absolute -top-28 -left-24 h-96 w-96 rounded-full bg-violet-600/30 blur-[110px]" />
            <div className="absolute -bottom-32 -right-20 h-[420px] w-[420px] rounded-full bg-sky-500/20 blur-[120px]" />
            <div className="absolute left-1/2 top-1/3 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-fuchsia-600/15 blur-[130px]" />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
                backgroundSize: '52px 52px',
              }}
            />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      </div>

      {/* Media start loading overlay (host) */}
      {isSolo && isOwnerHost && mediaStarting && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-black/60 px-6 py-5 backdrop-blur-md border border-white/10">
            <Loader2 className="w-7 h-7 animate-spin text-cyan-300" />
            <p className="text-xs font-semibold text-white">Starting camera &amp; microphone…</p>
          </div>
        </div>
      )}

      {/* Multi-guest stage: host in Seat 1 + guest seats in an adaptive tile grid */}
      {!isSolo && (
        <div className="relative order-2 flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-2 sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {boardTab !== 'chat' ? (
            <div className="flex h-full min-h-0 flex-col gap-2">
              {/* Focus mode: compact seat strip stays visible above the game board */}
              <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => onOpenProfile(host)}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] pl-1 pr-2.5 ring-1 ring-white/10 backdrop-blur"
                >
                  <Avatar
                    name={host.displayName}
                    color={host.avatarColor}
                    avatarUrl={host.avatarUrl}
                    size="xs"
                    isLiveRing={streamIsLive}
                  />
                  <span className="text-[9px] font-bold tracking-[0.12em] text-white/85">HOST</span>
                </button>
                {seats.map((seat) => (
                  <div
                    key={seat.seatNumber}
                    title={`Seat ${seat.seatNumber}`}
                    className={`flex h-8 shrink-0 items-center gap-1 rounded-full pl-1 pr-1.5 ring-1 backdrop-blur ${
                      seat.status === 'OCCUPIED'
                        ? 'bg-violet-500/15 ring-violet-300/25'
                        : seat.status === 'LOCKED'
                          ? 'bg-white/[0.03] ring-white/[0.08] opacity-70'
                          : seat.status === 'REQUESTED'
                            ? 'bg-sky-500/15 ring-sky-300/25'
                            : 'bg-white/[0.05] ring-white/10'
                    }`}
                  >
                    {seat.status === 'OCCUPIED' ? (
                      <Avatar
                        name={seat.occupantName ?? 'Guest'}
                        color={seat.occupantAvatarColor}
                        size="xs"
                        isSpeaking={seat.isSpeaking && !seat.isMuted}
                      />
                    ) : seat.status === 'REQUESTED' ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-400/15">
                        <UserCheck className="w-3 h-3 text-sky-200" />
                      </span>
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full">
                        <Armchair
                          className={`w-3 h-3 ${
                            seat.status === 'LOCKED' ? 'text-amber-200/60' : 'text-amber-200/80'
                          }`}
                        />
                      </span>
                    )}
                    <span className="text-[8px] font-semibold tabular-nums text-white/45">
                      {seat.seatNumber}
                    </span>
                  </div>
                ))}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-[#0B0D16]/90 shadow-2xl backdrop-blur-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {gameBoardContent}
              </div>
            </div>
          ) : (
          <div
            className={`mx-auto grid max-w-2xl ${compactStage ? 'gap-1.5 sm:gap-2' : 'gap-2.5 sm:gap-3.5'} ${stageGridCols}`}
          >
            {/* Seat 1 — Host */}
            <div
              className={`group relative col-span-2 row-span-2 rounded-[28px] p-px transition-all duration-300 ${
                hostSpeaking
                  ? 'bg-gradient-to-br from-fuchsia-400/80 via-violet-400/30 to-sky-400/50 shadow-[0_0_0_1px_rgba(217,70,239,0.25),0_30px_70px_-28px_rgba(217,70,239,0.55)]'
                  : 'bg-gradient-to-br from-white/25 via-white/[0.07] to-white/15 shadow-[0_30px_70px_-36px_rgba(0,0,0,0.95)]'
              }`}
            >
              <div className="relative h-full w-full overflow-hidden rounded-[27px] bg-[#0B0D16]">
              <span className="pointer-events-none absolute inset-x-8 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              {isOwnerHost && mediaActive && !cameraOff && room.mode !== 'AUDIO' ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${
                    cameraFacing === 'Front' && mediaPrefs.mirror ? '-scale-x-100' : ''
                  }`}
                />
              ) : remoteStream && room.mode !== 'AUDIO' ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted={remoteMuted}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <>
                  {remoteStream && (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      muted={remoteMuted}
                      className="hidden"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Avatar
                      name={host.displayName}
                      color={host.avatarColor}
                      size="lg"
                      isSpeaking={hostSpeaking}
                    />
                  </div>
                </>
              )}
              <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[9px] font-bold tracking-[0.14em] text-white/90 ring-1 ring-white/15 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]" />
                HOST
              </span>
              {!isOwnerHost && giftsAllowed && (
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      onOpenAuth();
                      return;
                    }
                    setGiftTargetUid(host.uid);
                    setShowGiftTray(true);
                  }}
                  aria-label={`Send a gift to ${host.displayName}`}
                  className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[9px] font-bold text-amber-300 ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-amber-500/85 hover:text-[#1A1206]"
                >
                  <Gift className="w-3 h-3" />
                  <span>Gift</span>
                </button>
              )}
              <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 ring-1 ring-white/10 backdrop-blur-md">
                <p className="flex-1 truncate text-[10.5px] font-semibold text-white">
                  {host.displayName}
                </p>
                {(giftEarnings.get(host.uid) ?? 0) > 0 && (
                  <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-cyan-500/25 px-1.5 py-px text-[9px] font-bold text-cyan-100 tabular-nums">
                    💎 {(giftEarnings.get(host.uid) ?? 0).toLocaleString()}
                  </span>
                )}
                {micMuted && isOwnerHost ? (
                  <MicOff className="w-3 h-3 text-rose-300 shrink-0" />
                ) : (
                  <Mic className="w-3 h-3 text-emerald-300 shrink-0" />
                )}
              </div>
              </div>
            </div>

            {/* Seats 1-8 — guests */}
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
                  className={`group relative aspect-square overflow-hidden rounded-[20px] backdrop-blur-md transition-all duration-300 ${
                    isOccupied
                      ? seat.isSpeaking && !seat.isMuted
                        ? 'border border-fuchsia-400/60 bg-gradient-to-b from-violet-500/[0.18] to-white/[0.02] shadow-[0_0_0_1px_rgba(217,70,239,0.3),0_18px_36px_-22px_rgba(217,70,239,0.65)]'
                        : 'border border-white/10 bg-gradient-to-b from-violet-400/[0.12] to-white/[0.02]'
                      : isLocked
                        ? compactStage
                          ? 'border border-white/[0.07] bg-white/[0.035] opacity-90'
                          : 'border border-white/[0.05] bg-white/[0.02] opacity-60'
                        : isRequested
                          ? 'border border-sky-400/40 bg-gradient-to-b from-sky-500/[0.14] to-white/[0.02]'
                          : 'border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.01] hover:border-violet-300/40 hover:from-violet-500/[0.1] hover:to-white/[0.02]'
                  }`}
                >
                  <span className="pointer-events-none absolute inset-x-5 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                  {compactStage && !isOccupied && (
                    <span className="pointer-events-none absolute left-1.5 top-1 z-10 text-[8px] font-semibold tabular-nums text-white/35">
                      {seat.seatNumber}
                    </span>
                  )}
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
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Avatar
                            name={seat.occupantName ?? 'Guest'}
                            color={seat.occupantAvatarColor}
                            size={compactStage ? 'sm' : 'md'}
                            isSpeaking={seat.isSpeaking && !seat.isMuted}
                          />
                        </div>
                      )}
                      <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-black/45 px-2 py-0.5 text-[9px] font-semibold text-white/75 ring-1 ring-white/10 backdrop-blur-sm">
                        {seat.seatNumber}
                      </span>
                      <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1">
                        {canModerateSeats && (
                          <>
                            {!compactStage && (
                              <button
                                type="button"
                                onClick={() => onToggleMuteGuest(room.roomId, seat)}
                                aria-label={seat.isMuted ? 'Unmute guest' : 'Mute guest'}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-black/45 text-slate-200 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-black/65"
                              >
                                {seat.isMuted ? (
                                  <MicOff className="w-3 h-3" />
                                ) : (
                                  <Mic className="w-3 h-3" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onRemoveGuest(room.roomId, seat.seatNumber)}
                              aria-label="Remove guest"
                              className={`flex items-center justify-center rounded-full bg-black/45 text-rose-300 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-rose-600/70 ${
                                compactStage ? 'h-5 w-5' : 'h-6 w-6'
                              }`}
                            >
                              <UserMinus className={compactStage ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                            </button>
                          </>
                        )}
                        {!isMySeat && seat.occupantUid && giftsAllowed && !compactStage && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!currentUser) {
                                onOpenAuth();
                                return;
                              }
                              setGiftTargetUid(seat.occupantUid!);
                              setShowGiftTray(true);
                            }}
                            aria-label={`Send a gift to ${seat.occupantName ?? 'guest'}`}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-black/45 text-amber-300 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-amber-500/70"
                          >
                            <Gift className="w-3 h-3" />
                          </button>
                        )}
                        {isMySeat && (
                          <button
                            type="button"
                            onClick={() => {
                              stopLocalMedia();
                              onLeaveSeat(room.roomId, seat.seatNumber);
                            }}
                            aria-label="Step down from seat"
                            className={`flex items-center justify-center rounded-full bg-black/45 text-rose-300 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-rose-600/70 ${
                              compactStage ? 'h-5 w-5' : 'h-6 w-6'
                            }`}
                          >
                            <LogOut className={compactStage ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                          </button>
                        )}
                      </div>
                      <div
                        className={`absolute inset-x-1.5 bottom-1.5 flex items-center gap-1 rounded-full bg-black/45 ring-1 ring-white/10 backdrop-blur-md ${
                          compactStage ? 'px-1.5 py-px' : 'px-2 py-0.5'
                        }`}
                      >
                        <p
                          className={`flex-1 truncate font-semibold text-white ${
                            compactStage ? 'text-[8px]' : 'text-[9.5px]'
                          }`}
                        >
                          {seat.occupantName}
                        </p>
                        {seat.occupantUid && (giftEarnings.get(seat.occupantUid) ?? 0) > 0 && (
                          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-cyan-500/25 px-1.5 py-px text-[8px] font-bold text-cyan-100 tabular-nums">
                            {(giftEarnings.get(seat.occupantUid) ?? 0).toLocaleString()}
                          </span>
                        )}
                        {seat.isMuted ? (
                          <MicOff
                            className={`shrink-0 text-rose-300 ${compactStage ? 'w-2.5 h-2.5' : 'w-3 h-3'}`}
                          />
                        ) : (
                          <Mic
                            className={`shrink-0 text-emerald-300 ${compactStage ? 'w-2.5 h-2.5' : 'w-3 h-3'}`}
                          />
                        )}
                      </div>
                    </>
                  ) : isLocked ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                      <span
                        className={`relative flex items-center justify-center rounded-full p-px ${seatBadgeTone.gold.glow} ${
                          compactStage ? 'h-8 w-8' : 'h-11 w-11'
                        }`}
                      >
                        <span
                          className={`absolute inset-0 rounded-full bg-gradient-to-br ${seatBadgeTone.gold.ring} opacity-55`}
                        />
                        <span className="relative flex h-full w-full items-center justify-center rounded-full bg-[#0E0C1B]/90 ring-1 ring-white/10">
                          <Armchair
                            className={`${seatBadgeTone.gold.icon} ${compactStage ? 'h-3.5 w-3.5' : 'h-5 w-5'}`}
                          />
                        </span>
                        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black/85 ring-1 ring-white/20">
                          <Lock className="w-2 h-2 text-slate-200" />
                        </span>
                      </span>
                      {!compactStage && (
                        <span className="text-[9px] font-medium text-slate-400">Locked</span>
                      )}
                      {canModerateSeats &&
                        (compactStage ? (
                          <button
                            type="button"
                            onClick={() => onToggleSeatLock(room.roomId, seat)}
                            aria-label={`Unlock seat ${seat.seatNumber}`}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.06] text-slate-300 ring-1 ring-white/10 transition-colors hover:text-white"
                          >
                            <Unlock className="w-2.5 h-2.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onToggleSeatLock(room.roomId, seat)}
                            className="inline-flex items-center gap-0.5 rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] text-slate-300 ring-1 ring-white/10 transition-colors hover:text-white"
                          >
                            <Unlock className="w-2.5 h-2.5" />
                            <span>Unlock</span>
                          </button>
                        ))}
                    </div>
                  ) : isRequested ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                      <span
                        className={`relative flex animate-pulse items-center justify-center rounded-full p-px ${seatBadgeTone.sky.glow} ${
                          compactStage ? 'h-8 w-8' : 'h-11 w-11'
                        }`}
                      >
                        <span
                          className={`absolute inset-0 rounded-full bg-gradient-to-br ${seatBadgeTone.sky.ring}`}
                        />
                        <span className="relative flex h-full w-full items-center justify-center rounded-full bg-[#0E0C1B]/90 ring-1 ring-white/10">
                          <UserCheck
                            className={`${seatBadgeTone.sky.icon} ${compactStage ? 'w-3 h-3' : 'w-4 h-4'}`}
                          />
                        </span>
                      </span>
                      {!compactStage && (
                        <span className="text-[9px] font-medium text-sky-200">Requested</span>
                      )}
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                      {isOwnerHost ? (
                        <>
                          <span
                            className={`relative flex items-center justify-center rounded-full p-px ${seatBadgeTone.gold.glow} ${
                              compactStage ? 'h-8 w-8' : 'h-11 w-11'
                            }`}
                          >
                            <span
                              className={`absolute inset-0 rounded-full bg-gradient-to-br ${seatBadgeTone.gold.ring} opacity-80`}
                            />
                            <span className="relative flex h-full w-full items-center justify-center rounded-full bg-[#0E0C1B]/90 ring-1 ring-white/10">
                              <Armchair
                                className={`${seatBadgeTone.gold.icon} ${compactStage ? 'h-3.5 w-3.5' : 'h-5 w-5'}`}
                              />
                            </span>
                          </span>
                          {!compactStage && (
                            <span className="text-[9px] font-medium text-slate-500">
                              Seat {seat.seatNumber}
                            </span>
                          )}
                        </>
                      ) : allowGuestRequests || canModerateSeats ? (
                        <>
                          <button
                            type="button"
                            disabled={isOfflineSimulated || Boolean(mySeat)}
                            onClick={() => onRequestSeat(room.roomId, seat.seatNumber)}
                            aria-label={
                              canModerateSeats
                                ? `Take seat ${seat.seatNumber}`
                                : `Request seat ${seat.seatNumber}${
                                    hostApprovalForGuests
                                      ? ', host approval required'
                                      : ', instant join'
                                  }`
                            }
                            title={
                              canModerateSeats
                                ? 'Take this seat'
                                : hostApprovalForGuests
                                  ? 'Request seat — the host approves guests'
                                  : 'Join seat instantly'
                            }
                            className={`group relative flex items-center justify-center rounded-full p-px transition-all hover:scale-105 active:scale-95 disabled:opacity-40 ${
                              seatBadgeTone.gold.glow
                            } ${compactStage ? 'h-8 w-8' : 'h-11 w-11'}`}
                          >
                            <span
                              className={`absolute inset-0 rounded-full bg-gradient-to-br ${seatBadgeTone.gold.ring} opacity-90 transition-opacity group-hover:opacity-100`}
                            />
                            <span className="relative flex h-full w-full items-center justify-center rounded-full bg-[#0E0C1B]/90 ring-1 ring-white/10">
                              <Armchair
                                className={`${seatBadgeTone.gold.icon} ${compactStage ? 'h-3.5 w-3.5' : 'h-5 w-5'}`}
                              />
                            </span>
                            <span
                              className={`pointer-events-none absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 font-bold text-white ring-1 ring-black/50 ${
                                compactStage ? 'h-3 w-3 text-[7px]' : 'h-4 w-4 text-[9px]'
                              }`}
                            >
                              +
                            </span>
                          </button>
                          {!compactStage && (
                            <span className="text-[9px] font-medium text-slate-400">
                              Seat {seat.seatNumber}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span
                            className={`relative flex items-center justify-center rounded-full p-px ${
                              compactStage ? 'h-8 w-8' : 'h-11 w-11'
                            }`}
                          >
                            <span
                              className={`absolute inset-0 rounded-full bg-gradient-to-br ${seatBadgeTone.slate.ring}`}
                            />
                            <span className="relative flex h-full w-full items-center justify-center rounded-full bg-[#0E0C1B]/90 ring-1 ring-white/[0.08]">
                              <Armchair
                                className={`${seatBadgeTone.slate.icon} ${compactStage ? 'h-3.5 w-3.5' : 'h-5 w-5'}`}
                              />
                            </span>
                          </span>
                          {!compactStage && (
                            <span className="text-[9px] font-medium text-slate-500">Requests off</span>
                          )}
                        </>
                      )}
                      {canModerateSeats &&
                        (compactStage ? (
                          <button
                            type="button"
                            onClick={() => onToggleSeatLock(room.roomId, seat)}
                            aria-label={`Lock seat ${seat.seatNumber}`}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.06] text-slate-400 ring-1 ring-white/10 transition-colors hover:text-white"
                          >
                            <Lock className="w-2.5 h-2.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onToggleSeatLock(room.roomId, seat)}
                            className="inline-flex items-center gap-0.5 rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] text-slate-400 ring-1 ring-white/10 transition-colors hover:text-white"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            <span>Lock</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* Top overlay bar */}
      <div className={`${isSolo ? 'absolute top-0 inset-x-0' : 'relative order-1 shrink-0'} z-20 px-3 sm:px-4 ${
        isSolo ? 'pt-[calc(env(safe-area-inset-top)+0.75rem)]' : 'pt-3'
      } flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => onOpenProfile(host)}
            className={`flex min-w-0 items-center gap-2 py-1 pl-1 pr-3 backdrop-blur-xl ${
              isSolo
                ? 'rounded-full border-2 border-cyan-400/70 bg-black/55'
                : 'rounded-2xl bg-white/[0.06] ring-1 ring-white/10 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)]'
            }`}
          >
            <Avatar
              name={host.displayName}
              color={host.avatarColor}
              avatarUrl={host.avatarUrl}
              size="xs"
              isLiveRing={streamIsLive}
            />
            <span className="min-w-0 text-left">
              <span className="block text-xs font-bold text-white truncate max-w-[130px]">
                {host.displayName}
              </span>
              <span className="block text-[10px] font-medium text-slate-300 truncate max-w-[130px]">
                @{host.username}
                {isOwnerHost ? ' · You' : ''}
              </span>
            </span>
          </button>
          {!isOwnerHost && (
            <button
              type="button"
              onClick={() => onToggleFollow(host.uid)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                isFollowingHost
                  ? 'bg-white/10 text-slate-200 ring-1 ring-white/15'
                  : 'bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-violet-950/40'
              }`}
            >
              {isFollowingHost ? 'Following' : '+ Follow'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setViewersOpen(true)}
            title="View connected viewers"
            aria-label={`Viewer list, ${room.viewerCount.toLocaleString()} watching`}
            className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-semibold tabular-nums text-white/85 ring-1 ring-white/10 backdrop-blur-xl transition-colors hover:bg-white/[0.1]"
          >
            <Eye className="w-3.5 h-3.5 text-sky-300" aria-hidden="true" />
            <span>{room.viewerCount.toLocaleString()}</span>
          </button>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-1.5 text-[10px] font-semibold tabular-nums text-white/85 ring-1 ring-white/10 backdrop-blur-xl sm:px-2.5 sm:text-[11px]">
            <Radio className="w-3.5 h-3.5 text-fuchsia-400" aria-hidden="true" />
            <span>{formatDuration(room.durationSeconds)}</span>
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold tracking-wider ${statusBadge.className}`}
          >
            {streamIsLive && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
            )}
            {statusBadge.label}
          </span>
          <button
            type="button"
            onClick={() => {
              if (isOwnerHost) {
                setConfirmEndOpen(true);
                return;
              }
              stopLocalMedia();
              onLeaveRoom();
            }}
            aria-label={isOwnerHost ? 'End live room' : 'Leave live room'}
            title={isOwnerHost ? 'End live' : 'Leave room'}
            className={`rounded-full flex items-center justify-center transition-colors ${
              isSolo
                ? 'w-10 h-10 bg-black/70 hover:bg-black/90 border border-white/10'
                : 'w-9 h-9 bg-white/[0.05] ring-1 ring-white/10 backdrop-blur-xl hover:bg-white/[0.12]'
            }`}
          >
            <X className={isSolo ? 'w-5 h-5' : 'w-4 h-4'} />
          </button>
        </div>
      </div>

      {/* Room title + category */}
      <div
        className={`${
          isSolo
            ? 'absolute top-[calc(env(safe-area-inset-top)+3.5rem)] inset-x-0'
            : 'relative order-1 shrink-0'
        } z-20 px-3 sm:px-4 pb-1 flex items-center gap-1.5 min-w-0`}
      >
        <p className="min-w-0 truncate text-[11.5px] font-medium text-white/75 sm:text-[12.5px]">
          {room.title}
        </p>
        <span className="shrink-0 rounded-full bg-white/[0.05] px-2 py-0.5 text-[9px] font-semibold text-slate-300 ring-1 ring-white/[0.08]">
          {room.category}
        </span>
        {room.isPrivateFollowersOnly && (
          <span className="shrink-0 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-violet-100 ring-1 ring-violet-300/30">
            Followers only
          </span>
        )}
        {room.mode === 'MULTI_GUEST' && (
          <span className="shrink-0 rounded-full bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-100 ring-1 ring-cyan-300/30">
            {seats.length} seats
          </span>
        )}
      </div>

      {/* Media error with retry */}
      {mediaError && (
        <div className="absolute top-16 inset-x-0 z-20 flex justify-center px-4">
          <div className="flex max-w-[94%] items-center gap-2 rounded-2xl border border-rose-400/25 bg-[#0B0E17]/85 py-1.5 pl-3 pr-1.5 text-[11px] text-rose-100 shadow-[0_14px_34px_-14px_rgba(244,63,94,0.5)] backdrop-blur-xl">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
            <span className="truncate">{mediaError}</span>
            <button
              type="button"
              onClick={() => void startOrRestartMedia(cameraFacing)}
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-rose-500/90 px-2.5 py-1 text-[10px] font-bold text-white transition-colors hover:bg-rose-400"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Sound toggle + connection status */}
      {isParticipant && (remoteStream || Object.keys(guestStreams).length > 0) && (
        <div className="absolute top-16 inset-x-0 z-20 flex justify-center px-4">
          <button
            type="button"
            onClick={() => setRemoteMuted((m) => !m)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold ring-1 backdrop-blur-xl transition-colors ${
              remoteMuted
                ? 'bg-cyan-500/85 text-white ring-cyan-300/50 animate-pulse'
                : 'bg-white/[0.07] text-slate-200 ring-white/10'
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
      {receivesHost && !remoteStream && room.status === 'LIVE' && !isOfflineSimulated && !hostStreamWaitExpired && (
        <div className="absolute top-16 inset-x-0 z-20 flex justify-center px-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[11px] text-slate-200 ring-1 ring-white/10 backdrop-blur-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {broadcastState === 'ended' ? 'Stream ended' : 'Connecting to live…'}
          </span>
        </div>
      )}

      {/* Gift effects overlay (particles + banners + cinematic gifts) */}
      <GiftEffectsOverlay fx={giftFx} onExpire={handleGiftFxExpire} />

      {/* Recipient feedback: exact Diamonds earned */}
      {receivedNotice && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-30 flex justify-center px-4">
          <div className="gfx-sheet rounded-full border border-cyan-300/40 bg-gradient-to-r from-cyan-500/25 via-sky-500/20 to-fuchsia-500/25 px-4 py-2 text-center shadow-[0_8px_30px_-12px_rgba(34,211,238,0.8)] backdrop-blur-md">
            <p className="text-sm font-extrabold text-white">
              💎 {receivedNotice}
            </p>
            <p className="text-[10px] font-medium text-cyan-100/80">gift received</p>
          </div>
        </div>
      )}

      {/* Floating like hearts (local taps + real-time room likes) */}
      {floatingLikes.length > 0 && (
        <div className="pointer-events-none absolute right-10 bottom-44 z-30 flex flex-col items-center">
          {floatingLikes.map((heart) => (
            <Heart
              key={heart.id}
              className="live-like-heart absolute w-6 h-6 fill-pink-500 text-pink-400 drop-shadow-[0_2px_8px_rgba(236,72,153,0.6)]"
              style={
                {
                  marginLeft: heart.offset,
                  '--like-rotate': `${heart.rotate}deg`,
                } as React.CSSProperties
              }
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {/* Bottom stack: chat, controls, input */}
      <div className={`${isSolo ? 'absolute inset-x-0 bottom-0' : 'relative order-3 shrink-0'} z-10 flex flex-col gap-2.5 px-3 sm:px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]`}>
        {/* Live game board header (solo rooms; multi-guest shows the seat strip instead) */}
        {boardTab !== 'chat' && isSolo && (
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-bold text-violet-300 flex items-center gap-1.5">
              <Gamepad2 className="w-3.5 h-3.5" />
              {boardTab === 'fruit' ? 'Fruit Manor Live' : 'Golden Flower Live'}
            </span>
            <button
              type="button"
              onClick={() => setBoardTab('chat')}
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-white flex items-center gap-1 transition-colors"
            >
              <MessagesSquare className="w-3 h-3" />
              <span>Back to Chat</span>
            </button>
          </div>
        )}

        {boardTab === 'chat' ? (
        <div
          ref={chatScrollRef}
          className={`overflow-y-auto space-y-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            isSolo
              ? 'max-h-60 max-w-[85%] sm:max-w-md'
              : 'absolute inset-x-3 bottom-full z-20 mb-3 max-h-40 [mask-image:linear-gradient(to_top,#000_72%,transparent)] sm:inset-x-4'
          }`}
        >
          {visibleComments.length === 0 ? (
            <p className="inline-block rounded-2xl bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400 ring-1 ring-white/[0.07] backdrop-blur-md">
              No messages yet. Say hello!
            </p>
          ) : (
            visibleComments.map((comment) => {
              const isOwnMessage = Boolean(
                currentUser && comment.uid === currentUser.uid
              );
              const canDeleteMessage =
                !comment.isGiftEvent && (canModerate || isOwnMessage);
              const canFlagUser =
                !comment.isGiftEvent && Boolean(currentUser) && !isOwnMessage;
              const menuOpen = messageMenuId === comment.id;
              return (
                <div key={comment.id} className="flex flex-col items-start gap-1">
                  <div
                    className={
                      isSolo
                        ? `rounded-2xl px-4 py-2.5 backdrop-blur-sm block w-fit max-w-full ${
                            comment.isGiftEvent
                              ? 'bg-gradient-to-r from-amber-500/70 to-orange-600/60 border border-amber-300/30'
                              : 'bg-black/55'
                          }`
                        : `inline-block max-w-full rounded-2xl px-3 py-1.5 text-xs leading-relaxed backdrop-blur-md ring-1 ${
                            comment.isGiftEvent
                              ? 'bg-gradient-to-r from-amber-500/70 to-orange-600/60 ring-amber-300/30'
                              : 'bg-white/[0.06] ring-white/[0.08]'
                          }`
                    }
                  >
                    <span
                      className={
                        isSolo
                          ? 'text-sm font-bold text-cyan-300 mr-2'
                          : `mr-1.5 align-middle text-[10px] font-bold ${
                              comment.isGiftEvent ? 'text-white' : 'text-amber-300'
                            }`
                      }
                    >
                      {comment.displayName}
                    </span>
                    {comment.isGiftEvent &&
                      comment.giftId &&
                      (GIFT_BY_ID.get(comment.giftId) ??
                        LUCKY_BY_ID.get(comment.giftId)) && (
                        <GiftArtwork
                          src={
                            (GIFT_BY_ID.get(comment.giftId) ??
                              LUCKY_BY_ID.get(comment.giftId))!.imageUrl
                          }
                          size={isSolo ? 22 : 16}
                          className={
                            isSolo
                              ? 'inline-block align-middle mr-1.5'
                              : 'inline-block align-middle mr-1'
                          }
                        />
                      )}
                    <span
                      className={
                        isSolo
                          ? 'text-sm text-white leading-relaxed'
                          : 'text-white align-middle'
                      }
                    >
                      {comment.text}
                    </span>
                    <span
                      className={
                        isSolo
                          ? 'ml-2 align-middle text-[10px] tabular-nums text-white/45'
                          : 'ml-1.5 align-middle text-[9px] tabular-nums text-white/45'
                      }
                    >
                      {comment.timestampLabel}
                    </span>
                    {(canDeleteMessage || canFlagUser) && (
                      <button
                        type="button"
                        onClick={() => setMessageMenuId(menuOpen ? null : comment.id)}
                        aria-label={`Actions for message from ${comment.displayName}`}
                        aria-expanded={menuOpen}
                        className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full align-middle text-white/45 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {menuOpen && (
                    <div className="flex flex-wrap items-center gap-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 px-1.5 py-1">
                      {canDeleteMessage && (
                        <button
                          type="button"
                          onClick={() => {
                            setMessageMenuId(null);
                            onDeleteComment(room.roomId, comment);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      )}
                      {canFlagUser && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setMessageMenuId(null);
                              onReportUser(comment.uid);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors"
                          >
                            <Flag className="w-3 h-3" />
                            Report user
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMessageMenuId(null);
                              onToggleBlock(comment.uid);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/10 transition-colors"
                          >
                            <Ban className="w-3 h-3" />
                            Block user
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        ) : isSolo ? (
          <div className="w-full max-w-md max-h-[50vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0B0D16]/90 shadow-2xl backdrop-blur-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {!currentUser ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="block w-full px-3 py-4 text-left"
              >
                <span className="text-xs font-semibold text-white">Sign in to play the live boards</span>
                <span className="mt-0.5 block text-[10px] text-slate-400">
                  Fruit Manor and Golden Flower run live with everyone in this room.
                </span>
              </button>
            ) : boardTab === 'fruit' ? (
              <FruitManorLiveBoard
                currentUser={currentUser}
                coinBalance={coinBalance}
                isOffline={isOfflineSimulated}
                onBack={() => setBoardTab('chat')}
              />
            ) : (
              <GoldenFlowerLiveBoard
                currentUser={currentUser}
                coinBalance={coinBalance}
                isOffline={isOfflineSimulated}
                onBack={() => setBoardTab('chat')}
              />
            )}
          </div>
        ) : null}

        {/* Publisher media controls (multi-guest chat mode; game mode uses the compact row) */}
        {canPublishLocalMedia && !isSolo && boardTab === 'chat' && (
          <div className="flex items-center justify-end gap-2">
            {mediaActive && (
              <div className="mr-auto inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1.5 text-[10px] text-emerald-300 ring-1 ring-white/[0.08] backdrop-blur-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <div className="w-12 h-1 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-75"
                    style={{ width: `${micMuted ? 0 : audioLevel}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/35 p-1 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl">
              {!mediaActive ? (
                <button
                  type="button"
                  disabled={isOfflineSimulated}
                  onClick={() => {
                    void startOrRestartMedia(cameraFacing);
                  }}
                  aria-label={
                    room.mode === 'AUDIO'
                      ? 'Enable microphone'
                      : 'Enable camera and microphone'
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white transition-all hover:from-emerald-400 hover:to-teal-500 disabled:opacity-45"
                >
                  {room.mode === 'AUDIO' ? (
                    <Mic className="w-4 h-4" />
                  ) : (
                    <Video className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopLocalMedia}
                  aria-label="Stop preview"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-amber-300 backdrop-blur-xl transition-colors hover:bg-white/[0.12]"
                >
                  {room.mode === 'AUDIO' ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <VideoOff className="w-4 h-4" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={handleToggleMic}
                aria-label={!mediaActive ? 'Start microphone' : micMuted ? 'Unmute microphone' : 'Mute microphone'}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  micInactive
                    ? 'bg-rose-500/90 text-white shadow-[0_6px_18px_-8px_rgba(244,63,94,0.9)]'
                    : 'text-white/85 hover:bg-white/[0.08]'
                }`}
              >
                {micInactive ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
              {room.mode !== 'AUDIO' && (
                <>
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    aria-label={!mediaActive ? 'Start camera' : cameraOff ? 'Turn camera on' : 'Turn camera off'}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                      cameraInactive
                        ? 'bg-rose-500/90 text-white shadow-[0_6px_18px_-8px_rgba(244,63,94,0.9)]'
                        : 'text-white/85 hover:bg-white/[0.08]'
                    }`}
                  >
                    {cameraInactive ? (
                      <VideoOff className="w-4 h-4" />
                    ) : (
                      <Video className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    aria-label="Switch camera"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/[0.08]"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Bottom input + live toolbar (chat mode; game mode uses the compact row below) */}
        {(isSolo || boardTab === 'chat') && (
        <form onSubmit={handleSubmitChat} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isOfflineSimulated || !canComment}
                maxLength={400}
                placeholder={
                  !currentUser
                    ? 'Sign in to chat...'
                    : isOfflineSimulated
                    ? 'Reconnect to chat...'
                    : !allowViewerComments
                    ? 'Chat is turned off by the host'
                    : isSolo
                    ? 'Comment'
                    : "What's up..."
                }
                className={`h-11 w-full rounded-full border pl-4 pr-12 text-sm text-white backdrop-blur-xl placeholder:text-slate-400 focus:outline-none ${
                  isSolo
                    ? 'bg-[#15163A]/80 border-white/10 focus:border-cyan-400/60'
                    : 'border-white/[0.08] bg-white/[0.05] focus:border-fuchsia-400/40 focus:ring-2 focus:ring-fuchsia-500/15'
                }`}
              />
              <button
                type="button"
                onClick={() => setEmojiOpen((open) => !open)}
                aria-label="Insert emoji"
                title="Emoji"
                aria-expanded={emojiOpen}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  emojiOpen
                    ? 'bg-fuchsia-500/30 text-fuchsia-200'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <Smile className="w-4.5 h-4.5" />
              </button>
            </div>
            <button
              type="submit"
              disabled={
                (currentUser !== null && !chatInput.trim()) ||
                isOfflineSimulated ||
                !canComment ||
                sendingChat
              }
              aria-label="Send comment"
              className="w-11 h-11 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 disabled:opacity-40 flex items-center justify-center text-white shrink-0 shadow-lg shadow-fuchsia-950/40 transition-all active:scale-95"
            >
              {sendingChat ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <Send className="w-4.5 h-4.5" />
              )}
            </button>
          </div>

          {emojiOpen && (
            <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.06] p-1.5 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CHAT_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setChatInput((text) => `${text}${emoji}`.slice(0, 400));
                    chatInputRef.current?.focus();
                  }}
                  aria-label={`Insert ${emoji}`}
                  className="w-9 h-9 shrink-0 rounded-lg hover:bg-white/10 text-lg leading-none transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="mx-auto flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/30 p-1 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {isSolo && canPublishLocalMedia && room.mode !== 'AUDIO' && (
              <button
                type="button"
                onClick={handleToggleCamera}
                aria-label={!mediaActive ? 'Start camera' : cameraOff ? 'Turn camera on' : 'Turn camera off'}
                title={!mediaActive ? 'Start camera' : cameraOff ? 'Turn camera on' : 'Camera off'}
                className={`relative w-10 h-10 shrink-0 rounded-2xl backdrop-blur-md border flex items-center justify-center transition-all active:scale-95 ${
                  cameraInactive
                    ? 'bg-rose-500/80 border-rose-300/40 text-white'
                    : 'bg-[#232456]/90 border-white/15 text-white hover:bg-[#2E2F6E]'
                }`}
              >
                {cameraInactive ? (
                  <VideoOff className="w-4.5 h-4.5" />
                ) : (
                  <Video className="w-4.5 h-4.5" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleReconnect}
              aria-label="Reconnect stream"
              title={canPublishLocalMedia ? 'Restart camera & broadcast' : 'Reconnect to stream'}
              className="relative w-10 h-10 shrink-0 rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.08] backdrop-blur-xl hover:bg-white/[0.1] flex items-center justify-center text-white transition-all active:scale-95"
            >
              <RefreshCw className="w-4.5 h-4.5" />
            </button>

            {isSolo && canPublishLocalMedia && (
              <button
                type="button"
                onClick={handleToggleMic}
                aria-label={!mediaActive ? 'Start microphone' : micMuted ? 'Unmute microphone' : 'Mute microphone'}
                title={!mediaActive ? 'Start microphone' : micMuted ? 'Unmute mic' : 'Mute mic'}
                className={`relative w-10 h-10 shrink-0 rounded-2xl border flex items-center justify-center transition-all active:scale-95 ${
                  micInactive
                    ? 'bg-rose-500/80 border-rose-300/40 text-white'
                    : 'bg-[#232456]/90 border-white/15 text-white hover:bg-[#2E2F6E]'
                }`}
              >
                {micInactive ? (
                  <MicOff className="w-4.5 h-4.5" />
                ) : (
                  <Mic className="w-4.5 h-4.5" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={focusChat}
              aria-label="Live chat"
              title="Live chat"
              aria-pressed={boardTab === 'chat'}
              className={`relative w-10 h-10 shrink-0 rounded-2xl ring-1 flex items-center justify-center transition-all active:scale-95 ${
                boardTab === 'chat'
                  ? 'bg-cyan-500/20 ring-cyan-300/40 text-cyan-100'
                  : 'bg-white/[0.07] text-white ring-white/10 hover:bg-white/[0.14]'
              }`}
            >
              <MessagesSquare className="w-4.5 h-4.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (!currentUser) {
                  onOpenAuth();
                  return;
                }
                if (!giftsAllowed || giftTargets.length === 0) return;
                setGiftTargetUid((uid) =>
                  giftTargets.some((t) => t.uid === uid) ? uid : giftTargets[0]?.uid ?? ''
                );
                setShowGiftTray((tray) => !tray);
              }}
              disabled={
                isOfflineSimulated ||
                !giftsAllowed ||
                (currentUser !== null && giftTargets.length === 0)
              }
              aria-label="Send gift"
              title={
                !giftsAllowed
                  ? 'Gifts are turned off for this room'
                  : giftTargets.length === 0
                  ? 'No one else on stage to gift yet'
                  : 'Send a gift'
              }
              className={`relative w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 ${
                showGiftTray
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-[#1A1206]'
                  : 'bg-gradient-to-br from-pink-500 to-amber-400 hover:from-pink-400 hover:to-amber-300 text-white'
              }`}
            >
              <Gift className="w-4.5 h-4.5" />
            </button>

            <button
              type="button"
              onClick={handleLike}
              aria-label="Like this live"
              title="Like"
              className="relative w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 flex items-center justify-center text-white transition-all active:scale-90"
            >
              <Heart className="w-4.5 h-4.5 fill-current" />
              {likeTotal > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-white text-pink-600 text-[10px] font-bold flex items-center justify-center px-1 tabular-nums">
                  {likeTotal > 9999 ? `${Math.floor(likeTotal / 1000)}k` : likeTotal}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowGamesModal(true)}
              aria-label="Mini games"
              title="Mini games"
              className="relative w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 flex items-center justify-center text-white transition-colors shadow-lg shadow-violet-900/30 active:scale-95"
            >
              <Gamepad2 className="w-4.5 h-4.5 text-violet-100" />
            </button>

            <button
              type="button"
              onClick={() => setViewersOpen(true)}
              aria-label="Viewer list"
              title="Viewers"
              className="relative w-10 h-10 shrink-0 rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.08] backdrop-blur-xl hover:bg-white/[0.1] flex items-center justify-center text-white transition-colors active:scale-95"
            >
              <Users className="w-4.5 h-4.5" />
              {viewerProfiles.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-sky-500 text-[10px] font-bold flex items-center justify-center px-1 tabular-nums">
                  {viewerProfiles.length > 99 ? '99+' : viewerProfiles.length}
                </span>
              )}
            </button>

            {!isSolo && canModerateSeats && (
              <button
                type="button"
                onClick={() => setViewersOpen(true)}
                aria-label="Invite viewers"
                title="Invite viewers"
                className="relative w-10 h-10 shrink-0 rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.08] backdrop-blur-xl hover:bg-white/[0.1] flex items-center justify-center text-white transition-colors active:scale-95"
              >
                <UserPlus className="w-4.5 h-4.5 text-cyan-300" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Live settings"
              title="Live settings"
              className="relative w-10 h-10 shrink-0 rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.08] backdrop-blur-xl hover:bg-white/[0.1] flex items-center justify-center text-white transition-colors active:scale-95"
            >
              <SlidersHorizontal className="w-4.5 h-4.5" />
            </button>
          </div>
        </form>
        )}

        {/* Game mode: tiny option strip so the board keeps the space */}
        {!isSolo && boardTab !== 'chat' && (
          <div className="flex items-center justify-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {canPublishLocalMedia && (
              <>
                <button
                  type="button"
                  onClick={handleToggleMic}
                  aria-label={!mediaActive ? 'Start microphone' : micMuted ? 'Unmute microphone' : 'Mute microphone'}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 backdrop-blur transition-colors ${
                    micInactive
                      ? 'bg-rose-500/90 text-white ring-rose-300/40'
                      : 'bg-white/[0.06] text-white/85 ring-white/10 hover:bg-white/[0.12]'
                  }`}
                >
                  {micInactive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
                {room.mode !== 'AUDIO' && (
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    aria-label={!mediaActive ? 'Start camera' : cameraOff ? 'Turn camera on' : 'Turn camera off'}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 backdrop-blur transition-colors ${
                      cameraInactive
                        ? 'bg-rose-500/90 text-white ring-rose-300/40'
                        : 'bg-white/[0.06] text-white/85 ring-white/10 hover:bg-white/[0.12]'
                    }`}
                  >
                    {cameraInactive ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                  </button>
                )}
                <span className="mx-0.5 h-5 w-px shrink-0 bg-white/10" aria-hidden="true" />
              </>
            )}
            <button
              type="button"
              onClick={() => setBoardTab('chat')}
              aria-label="Back to chat"
              className="flex h-8 items-center gap-1 rounded-xl bg-white/[0.06] px-2.5 text-[10px] font-semibold text-white ring-1 ring-white/10 backdrop-blur transition-colors hover:bg-white/[0.12]"
            >
              <MessagesSquare className="w-3.5 h-3.5" />
              Chat
            </button>
            <button
              type="button"
              onClick={() => {
                if (!currentUser) {
                  onOpenAuth();
                  return;
                }
                if (!giftsAllowed || giftTargets.length === 0) return;
                setGiftTargetUid((uid) =>
                  giftTargets.some((t) => t.uid === uid) ? uid : giftTargets[0]?.uid ?? ''
                );
                setShowGiftTray((tray) => !tray);
              }}
              disabled={
                isOfflineSimulated ||
                !giftsAllowed ||
                (currentUser !== null && giftTargets.length === 0)
              }
              aria-label="Send gift"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-40 ${
                showGiftTray
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-[#1A1206]'
                  : 'bg-gradient-to-br from-pink-500 to-amber-400 text-white'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleLike}
              aria-label="Like this live"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white active:scale-90"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => setShowGamesModal(true)}
              aria-label="Mini games"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-violet-100 active:scale-95"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Live settings"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/85 ring-1 ring-white/10 backdrop-blur hover:bg-white/[0.12]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Gift tray bottom sheet */}
      {showGiftTray && (
        <div className="gfx-sheet absolute inset-x-0 bottom-0 z-30 rounded-t-2xl bg-[#0b0e17]/95 backdrop-blur-2xl border-t border-white/10 flex flex-col max-h-[56vh]">
          <span
            className="absolute inset-x-0 top-0 h-px rounded-t-2xl"
            style={{
              background:
                'linear-gradient(90deg, transparent, #FBBF24 22%, #EC4899 52%, #22D3EE 80%, transparent)',
            }}
          />
          <span className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-white/15" />
          <div className="flex items-center justify-between gap-2 px-3 pt-1.5 pb-1.5">
            <h3 className="flex items-center gap-1.5 font-display text-xs font-bold text-white tracking-wide">
              <Coins className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              Gifts
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-1">
                <span className="h-2 w-2 rounded-full bg-gradient-to-br from-amber-300 to-orange-500" />
                <span className="font-mono text-[11px] font-bold text-amber-200 tabular-nums">
                  {coinBalance.toLocaleString()}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setShowGiftTray(false)}
                aria-label="Close gift tray"
                className="w-7 h-7 rounded-full bg-white/[0.07] hover:bg-white/[0.14] flex items-center justify-center text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto px-3 pb-2">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Send to
            </span>
            {giftTargets.length === 0 ? (
              <span className="text-[10px] text-slate-400">
                No one else is on stage yet — invite a guest to send gifts.
              </span>
            ) : (
              giftTargets.map((target) => {
              const active = selectedGiftTarget?.uid === target.uid;
              return (
                <button
                  key={target.uid}
                  type="button"
                  onClick={() => setGiftTargetUid(target.uid)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors ${
                    active
                      ? 'border-fuchsia-400/60 bg-fuchsia-500/20 text-white'
                      : 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <Avatar
                    name={target.name}
                    color={target.avatarColor}
                    size="xs"
                  />
                  <span className="max-w-[92px] truncate">{target.name}</span>
                  {target.isHost ? (
                    <span className="rounded bg-amber-400/20 px-1 text-[8px] font-bold text-amber-200">
                      HOST
                    </span>
                  ) : (
                    <span className="rounded bg-sky-400/15 px-1 text-[8px] font-bold text-sky-200">
                      GUEST
                    </span>
                  )}
                  {(giftEarnings.get(target.uid) ?? 0) > 0 && (
                    <span className="text-[8px] font-bold text-cyan-200 tabular-nums">
                      💎{(giftEarnings.get(target.uid) ?? 0).toLocaleString()}
                    </span>
                  )}
                </button>
              );
              })
            )}
          </div>

          <div className="gift-tabs flex items-center gap-1 px-3 pb-2 overflow-x-auto">
            {(
              [
                ['all', 'All'],
                ['classic', 'Classic'],
                ['premium', 'Premium'],
                ['luxury', 'Luxury'],
                ['lucky', 'Lucky'],
              ] as const
            ).map(([key, label]) => {
              const active = giftTab === key;
              const count =
                key === 'all'
                  ? gifts.length
                  : key === 'lucky'
                    ? LUCKY_GIFTS.length
                    : gifts.filter((g) => giftTier(g.price) === key).length;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGiftTab(key)}
                  aria-label={`Show ${label} gifts`}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                    active
                      ? key === 'luxury' || key === 'lucky'
                        ? 'bg-gradient-to-r from-amber-400 to-pink-500 text-[#1A1206] shadow-[0_0_12px_rgba(236,72,153,0.45)]'
                        : 'bg-white/[0.12] text-white border border-white/20'
                      : key === 'lucky'
                        ? 'bg-fuchsia-500/10 text-fuchsia-200 border border-fuchsia-300/30 hover:bg-fuchsia-500/20'
                        : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-slate-200'
                  }`}
                >
                  {key === 'lucky' && (
                    <Sparkles className="mr-0.5 inline h-2.5 w-2.5 align-[-1px]" aria-hidden="true" />
                  )}
                  {label}
                  <span className={`ml-0.5 font-mono text-[9px] tabular-nums ${active ? 'opacity-70' : 'opacity-50'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-2">
            {giftTab === 'lucky' ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-300/25 bg-[linear-gradient(120deg,rgba(251,191,36,0.14),rgba(236,72,153,0.10)_55%,rgba(34,211,238,0.10))] px-2.5 py-1.5">
                  <p className="text-[10px] font-semibold text-amber-100/90">
                    Open a box — a random gift pops out, up to ×520 value.
                  </p>
                  <span className="shrink-0 text-[9px] font-bold text-fuchsia-200">
                    {selectedGiftTarget ? `to ${selectedGiftTarget.name}` : 'pick a target'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {LUCKY_GIFTS.map((box) => {
                    const selected = box.giftId === luckyBoxId;
                    const affordable = box.price <= coinBalance;
                    return (
                      <button
                        key={box.giftId}
                        type="button"
                        disabled={luckyBusy}
                        onClick={() => setLuckyBoxId(box.giftId)}
                        aria-label={`Select ${box.name}, ${box.price} coins`}
                        className={`group relative flex flex-col items-center rounded-xl border p-2 transition-all disabled:opacity-60 ${
                          selected
                            ? 'border-amber-300/70 bg-white/[0.08] shadow-[0_0_14px_rgba(251,191,36,0.35)]'
                            : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07]'
                        }`}
                      >
                        <GiftArtwork
                          src={box.imageUrl}
                          alt={box.name}
                          size={42}
                          className={`transition-transform duration-150 group-hover:scale-110 ${
                            affordable ? '' : 'opacity-40 saturate-50'
                          }`}
                        />
                        <p className="mt-1.5 w-full truncate text-center text-[10px] font-bold text-white">
                          {box.name}
                        </p>
                        <p className="flex items-center gap-1 font-mono text-[9px] font-bold tabular-nums text-amber-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600" />
                          {box.price.toLocaleString()}
                        </p>
                        <span className="mt-0.5 rounded-full bg-fuchsia-500/15 px-1.5 text-[8px] font-black tracking-wide text-fuchsia-200">
                          {box.tagline}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  {([1, 5, 10] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={luckyBusy}
                      onClick={() => setLuckyQty(q)}
                      className={`h-9 w-10 shrink-0 rounded-lg border font-mono text-[11px] font-bold tabular-nums transition-colors ${
                        luckyQty === q
                          ? 'border-amber-300/60 bg-amber-400/20 text-amber-100'
                          : 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      ×{q}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={
                      !currentUser ||
                      luckyBusy ||
                      isOfflineSimulated ||
                      !selectedGiftTarget ||
                      coinBalance < luckyBox.price * luckyQty
                    }
                    onClick={() => void openLucky()}
                    className="relative h-9 flex-1 overflow-hidden rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-xs font-extrabold text-[#1A1206] shadow-[0_4px_16px_rgba(249,115,22,0.4)] transition-all hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {luckyBusy
                      ? 'Opening…'
                      : `Open ×${luckyQty} · ${(luckyBox.price * luckyQty).toLocaleString()}`}
                  </button>
                </div>

                {coinBalance < luckyBox.price * luckyQty && (
                  <p className="text-[10px] text-rose-300">
                    Need {(luckyBox.price * luckyQty - coinBalance).toLocaleString()} more coins
                    for this open.
                  </p>
                )}

                {luckyDraws.length > 0 && (
                  <div className="space-y-1">
                    {luckyDraws.slice(0, 6).map((d) => {
                      const tier = luckyTier(d.multiplier);
                      return (
                        <div
                          key={d.key}
                          className={`flex items-center justify-between rounded-lg border px-2.5 py-1 text-[10px] ${
                            tier === 'jackpot' || tier === 'mega'
                              ? 'border-amber-300/50 bg-gradient-to-r from-amber-400/20 to-pink-500/15 text-amber-100'
                              : tier === 'big'
                                ? 'border-fuchsia-300/40 bg-fuchsia-500/10 text-fuchsia-100'
                                : tier === 'nice'
                                  ? 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100'
                                  : 'border-white/[0.06] bg-white/[0.03] text-slate-300'
                          }`}
                        >
                          <span className="font-mono font-black tabular-nums">
                            ×{d.multiplier}
                            {tier === 'jackpot' && (
                              <span className="ml-1 rounded bg-gradient-to-r from-amber-400 to-pink-500 px-1 text-[7px] font-black tracking-wider text-[#1A1206]">
                                JACKPOT
                              </span>
                            )}
                          </span>
                          <span className="font-mono tabular-nums">
                            {d.value.toLocaleString()} gift · +{d.diamonds.toLocaleString()} Diamonds
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
            <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 gap-1.5">
              {visibleGifts.map((gift) => {
                const selected = gift.giftId === selectedGiftId;
                const affordable = gift.price <= coinBalance;
                const luxury = giftTier(gift.price) === 'luxury';
                return (
                  <button
                    key={gift.giftId}
                    type="button"
                    disabled={isOfflineSimulated}
                    onClick={() => setSelectedGiftId(gift.giftId)}
                    aria-label={`Select ${gift.name}, ${gift.price} coins`}
                    title={gift.name}
                    className={`group relative rounded-xl border p-1.5 pb-1 flex flex-col items-center transition-all duration-150 disabled:opacity-45 hover:-translate-y-px ${
                      selected
                        ? 'bg-white/[0.08]'
                        : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07]'
                    }`}
                    style={
                      selected
                        ? {
                            borderColor: gift.accentHex,
                            boxShadow: `0 0 0 1px ${gift.accentHex}, 0 4px 14px ${gift.accentHex}45`,
                          }
                        : undefined
                    }
                  >
                    <span
                      className={`pointer-events-none absolute inset-x-2 top-1 h-9 rounded-full blur-lg transition-opacity ${
                        selected ? 'opacity-55' : 'opacity-0 group-hover:opacity-30'
                      }`}
                      style={{ background: gift.accentHex }}
                    />
                    <span className="relative grid place-items-center">
                      <GiftArtwork
                        src={gift.imageUrl}
                        alt={gift.name}
                        size={38}
                        className={`relative transition-transform duration-150 group-hover:scale-110 ${
                          affordable ? '' : 'opacity-40 saturate-50'
                        }`}
                      />
                      <span
                        className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full bg-black/65 backdrop-blur px-1.5 py-px text-[9px] font-mono tabular-nums whitespace-nowrap ${
                          affordable ? 'text-amber-200' : 'text-rose-300/80'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600" />
                        {gift.price.toLocaleString()}
                      </span>
                    </span>
                    <p className="mt-2 w-full truncate text-center text-[9px] font-medium text-slate-300">
                      {gift.name}
                    </p>
                    {luxury && (
                      <span className="absolute top-0.5 right-0.5 grid h-3 place-items-center rounded-full bg-gradient-to-r from-amber-400 to-pink-500 px-1 text-[7px] font-black tracking-wider text-[#1A1206]">
                        LUX
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            )}
          </div>

          {giftTab !== 'lucky' && selectedGift && coinBalance < selectedGift.price && (
            <p className="px-3 pb-1 text-[10px] text-rose-300">
              Need {(selectedGift.price - coinBalance).toLocaleString()} more coins for this gift.
            </p>
          )}

          {giftTab !== 'lucky' && (
          <div className="border-t border-white/[0.08] p-2.5 flex items-center gap-2.5 bg-[#080a12]/90">
            {selectedGift ? (
              <>
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border"
                  style={{
                    borderColor: `${selectedGift.accentHex}66`,
                    background: `radial-gradient(circle at 50% 40%, ${selectedGift.accentHex}33, rgba(10,13,22,0.7))`,
                  }}
                >
                  <GiftArtwork src={selectedGift.imageUrl} alt={selectedGift.name} size={32} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{selectedGift.name}</p>
                  {selectedGiftTarget && (
                    <p className="truncate text-[9px] text-slate-400">
                      to {selectedGiftTarget.name}
                      {selectedGiftTarget.isHost ? ' · Host' : ' · Guest'}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300 tabular-nums">
                    {selectedGift.price.toLocaleString()} coins
                    <span
                      className={`rounded-full px-1 text-[8px] font-sans font-bold tracking-wider ${
                        giftTier(selectedGift.price) === 'luxury'
                          ? 'bg-gradient-to-r from-amber-400/25 to-pink-500/25 text-amber-200 border border-amber-300/30'
                          : giftTier(selectedGift.price) === 'premium'
                            ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-300/25'
                            : 'bg-white/[0.07] text-slate-300 border border-white/10'
                      }`}
                    >
                      {giftTier(selectedGift.price).toUpperCase()}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!currentUser || isOfflineSimulated || coinBalance < selectedGift.price}
                  onClick={() => {
                    if (!selectedGiftTarget) return;
                    onSendGift(room.roomId, selectedGift, selectedGiftTarget.uid);
                  }}
                  className="relative overflow-hidden h-9 px-4 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-extrabold text-[#1A1206] inline-flex items-center gap-1.5 transition-all active:scale-[0.97] shadow-[0_4px_16px_rgba(249,115,22,0.4)]"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Send</span>
                  <span
                    className="gfx-shine-loop pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)',
                    }}
                  />
                </button>
              </>
            ) : (
              <p className="text-xs text-slate-400 py-1.5">Pick a gift to send.</p>
            )}
          </div>
          )}
        </div>
      )}

      {/* Viewers bottom sheet (real connected viewers) */}
      {viewersOpen && (
        <div className="gfx-sheet absolute inset-x-0 bottom-0 z-40 rounded-t-3xl bg-[#0F111D]/95 backdrop-blur-2xl border-t border-white/15 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] max-h-[65vh] overflow-y-auto space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-sky-300" />
                Viewers
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                {room.viewerCount.toLocaleString()} watching · {viewerProfiles.length} connected to stream
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setViewersOpen(false);
                setKickTargetUid(null);
              }}
              aria-label="Close viewer list"
              className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-white/[0.14] flex items-center justify-center text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 flex items-center gap-2.5">
            <Avatar name={host.displayName} color={host.avatarColor} avatarUrl={host.avatarUrl} size="xs" isLiveRing={streamIsLive} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{host.displayName}</p>
              <p className="text-[10px] text-slate-400 truncate">@{host.username}</p>
            </div>
            <span className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-2 py-0.5 text-[9px] font-bold text-white">
              HOST
            </span>
          </div>

          {canModerateSeats && joinRequests.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-sky-300" />
                  Seat requests
                </span>
                <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] tabular-nums text-slate-300">
                  {joinRequests.length}
                </span>
              </p>
              {joinRequests.map((req) => {
                const isMine = currentUser?.uid === req.uid;
                return (
                  <div
                    key={req.requestId}
                    className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={req.displayName} color={req.avatarColor} size="xs" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{req.displayName}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          @{req.username} · Seat {req.preferredSeatNumber ?? 'Any'}
                        </p>
                      </div>
                    </div>
                    {isMine ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-300/90">
                          Yours
                        </span>
                        <button
                          type="button"
                          onClick={() => onRejectJoinRequest(room.roomId, req)}
                          aria-label="Cancel your seat request"
                          title="Cancel your seat request"
                          className="p-1.5 rounded-lg bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
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
                );
              })}
            </div>
          )}

          {canModerateSeats && viewerProfiles.length > 0 && (
            <p className="text-[10px] text-slate-500">
              Tap the send icon to invite a viewer. Followers get notified instantly.
            </p>
          )}

          {viewerProfiles.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">
              No one is receiving the stream yet. Viewers appear here as soon as they connect.
            </p>
          ) : (
            <div className="space-y-2">
              {viewerProfiles
                .filter((viewer) => !blockedUids.includes(viewer.uid))
                .map((viewer) => {
                  const viewerIsMod = moderators.some((m) => m.uid === viewer.uid);
                  const isSelf = viewer.uid === currentUser?.uid;
                  const isFollowed = followingUids.includes(viewer.uid);
                  return (
                    <div
                      key={viewer.uid}
                      className="rounded-xl bg-white/[0.03] px-3 py-2.5 flex items-center justify-between gap-2"
                    >
                      <button
                        type="button"
                        disabled={!viewer.profile}
                        onClick={() => {
                          if (viewer.profile) {
                            onOpenProfile(viewer.profile);
                            setViewersOpen(false);
                          }
                        }}
                        className="flex items-center gap-2.5 min-w-0 text-left disabled:cursor-default"
                      >
                        <Avatar name={viewer.displayName} color={viewer.avatarColor} avatarUrl={viewer.avatarUrl} size="xs" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate flex items-center gap-1">
                            <span className="truncate">{viewer.displayName}</span>
                            {isSelf && (
                              <span className="text-[9px] text-slate-400">(you)</span>
                            )}
                            {viewerIsMod && (
                              <span className="rounded bg-cyan-500/20 px-1 py-0.5 text-[8px] font-bold text-cyan-200">
                                MOD
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">@{viewer.username}</p>
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => onToggleFollow(viewer.uid)}
                            aria-pressed={isFollowed}
                            aria-label={
                              isFollowed
                                ? `Unfollow ${viewer.displayName}`
                                : `Follow ${viewer.displayName}`
                            }
                            title={isFollowed ? 'Following' : 'Follow'}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isFollowed
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]'
                            }`}
                          >
                            {isFollowed ? (
                              <UserCheck className="w-3.5 h-3.5" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        {canModerateSeats && !isSelf && (
                          <button
                            type="button"
                            onClick={() => onInviteViewer(viewer.uid)}
                            aria-label={`Invite ${viewer.displayName} to this room`}
                            title="Invite to room"
                            className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-300 hover:bg-sky-500/30 flex items-center justify-center transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(isOwnerHost || isAdminUser) && !isSelf && (
                          <button
                            type="button"
                            onClick={() =>
                              viewerIsMod
                                ? onRemoveModerator(room.roomId, viewer.uid)
                                : onAddModerator(room.roomId, viewer.uid)
                            }
                            aria-pressed={viewerIsMod}
                            aria-label={
                              viewerIsMod
                                ? `Remove ${viewer.displayName} as moderator`
                                : `Make ${viewer.displayName} a moderator`
                            }
                            title={viewerIsMod ? 'Remove moderator' : 'Make moderator'}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              viewerIsMod
                                ? 'bg-cyan-500/25 text-cyan-200'
                                : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canModerateSeats && !isSelf && (
                          <button
                            type="button"
                            onClick={() => handleKickViewer(viewer.uid)}
                            aria-label={`Remove ${viewer.displayName} from the room`}
                            className={`shrink-0 rounded-lg px-2 py-1.5 text-[10px] font-semibold transition-colors ${
                              kickTargetUid === viewer.uid
                                ? 'bg-rose-600 text-white'
                                : 'bg-rose-600/15 text-rose-300 hover:bg-rose-600/30'
                            }`}
                          >
                            {kickTargetUid === viewer.uid ? 'Confirm' : (
                              <span className="inline-flex items-center gap-1">
                                <UserX className="w-3 h-3" />
                                Remove
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Live settings bottom sheet */}
      {settingsOpen && (
        <div className="gfx-sheet absolute inset-x-0 bottom-0 z-40 rounded-t-3xl bg-[#0F111D]/95 backdrop-blur-2xl border-t border-violet-500/25 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] max-h-[80vh] overflow-y-auto space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-violet-300" />
                Live settings
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Changes apply to this device only.</p>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              aria-label="Close settings"
              className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-white/[0.14] flex items-center justify-center text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {canPublishLocalMedia && (
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-cyan-300" /> Devices
              </h4>

              {room.mode !== 'AUDIO' && (
                <label className="block">
                  <span className="text-[11px] font-medium text-slate-300">Camera</span>
                  <select
                    value={mediaPrefs.cameraId}
                    onChange={(e) => void applyMediaPrefs({ cameraId: e.target.value })}
                    disabled={isOfflineSimulated}
                    className="mt-1 w-full h-10 rounded-xl bg-black/45 border border-white/15 px-3 text-xs text-white focus:outline-none focus:border-cyan-400/60"
                  >
                    <option value="">Auto (front camera)</option>
                    {cameraDevices.map((device, idx) => (
                      <option key={device.deviceId || idx} value={device.deviceId}>
                        {device.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block">
                <span className="text-[11px] font-medium text-slate-300">Microphone</span>
                <select
                  value={mediaPrefs.micId}
                  onChange={(e) => void applyMediaPrefs({ micId: e.target.value })}
                  disabled={isOfflineSimulated}
                  className="mt-1 w-full h-10 rounded-xl bg-black/45 border border-white/15 px-3 text-xs text-white focus:outline-none focus:border-cyan-400/60"
                >
                  <option value="">Auto (default microphone)</option>
                  {micDevices.map((device, idx) => (
                    <option key={device.deviceId || idx} value={device.deviceId}>
                      {device.label || `Microphone ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </label>

              {(cameraDevices.length === 0 || micDevices.some((d) => !d.label)) && (
                <p className="text-[10px] text-amber-200/90">
                  Device names appear after you allow camera / microphone access.
                </p>
              )}

              {room.mode !== 'AUDIO' && (
                <div>
                  <span className="text-[11px] font-medium text-slate-300">Video quality</span>
                  <div className="mt-1 grid grid-cols-4 gap-1.5">
                    {VIDEO_QUALITIES.map((quality) => (
                      <button
                        key={quality}
                        type="button"
                        onClick={() => void applyMediaPrefs({ quality })}
                        className={`h-9 rounded-lg border text-[11px] font-bold transition-colors ${
                          mediaPrefs.quality === quality
                            ? 'border-cyan-300/60 bg-cyan-400/20 text-cyan-100'
                            : 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                        }`}
                      >
                        {quality}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Switching quality restarts the stream briefly.</p>
                </div>
              )}

              <div className="space-y-1.5">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 pt-1">Audio</h4>
                <button
                  type="button"
                  onClick={() =>
                    void applyMediaPrefs({ noiseSuppression: !mediaPrefs.noiseSuppression })
                  }
                  aria-pressed={mediaPrefs.noiseSuppression}
                  className="w-full h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] px-3 flex items-center justify-between transition-colors"
                >
                  <span className="text-xs text-slate-200">Noise suppression</span>
                  <span
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      mediaPrefs.noiseSuppression ? 'bg-emerald-500' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                        mediaPrefs.noiseSuppression ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void applyMediaPrefs({ echoCancellation: !mediaPrefs.echoCancellation })
                  }
                  aria-pressed={mediaPrefs.echoCancellation}
                  className="w-full h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] px-3 flex items-center justify-between transition-colors"
                >
                  <span className="text-xs text-slate-200">Echo cancellation</span>
                  <span
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      mediaPrefs.echoCancellation ? 'bg-emerald-500' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                        mediaPrefs.echoCancellation ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
                {room.mode !== 'AUDIO' && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...mediaPrefs, mirror: !mediaPrefs.mirror };
                      setMediaPrefs(next);
                      saveMediaPrefs(next);
                    }}
                    aria-pressed={mediaPrefs.mirror}
                    className="w-full h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] px-3 flex items-center justify-between transition-colors"
                  >
                    <span className="text-xs text-slate-200">Mirror self-view</span>
                    <span
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        mediaPrefs.mirror ? 'bg-emerald-500' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                          mediaPrefs.mirror ? 'left-[18px]' : 'left-0.5'
                        }`}
                      />
                    </span>
                  </button>
                )}
              </div>

              {mediaError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 px-3 py-2 space-y-2">
                  <p className="text-[11px] text-rose-200">{mediaError}</p>
                  <button
                    type="button"
                    onClick={() => void startOrRestartMedia(cameraFacing)}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-500 hover:bg-rose-400 px-3 py-1.5 text-[11px] font-bold text-white"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {isParticipant && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Playback</h4>
              <button
                type="button"
                onClick={() => setRemoteMuted((m) => !m)}
                className="w-full h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] px-3 flex items-center justify-between transition-colors"
              >
                <span className="text-xs text-slate-200">Room sound</span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${remoteMuted ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {remoteMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  {remoteMuted ? 'Muted' : 'On'}
                </span>
              </button>
            </div>
          )}

          {canModerateSeats && !isSolo && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Stage controls</h4>
              <button
                type="button"
                onClick={handleMuteAllGuests}
                disabled={!seats.some((s) => s.status === 'OCCUPIED' && !s.isMuted)}
                className="w-full h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 border border-white/[0.07] px-3 flex items-center justify-between transition-colors"
              >
                <span className="text-xs text-slate-200">Mute all guests</span>
                <MicOff className="w-3.5 h-3.5 text-rose-300" />
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleLockAllSeats}
                  disabled={!seats.some((s) => s.status === 'AVAILABLE')}
                  className="h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 border border-white/[0.07] text-[11px] font-semibold text-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" /> Lock seats
                </button>
                <button
                  type="button"
                  onClick={handleUnlockAllSeats}
                  disabled={!seats.some((s) => s.status === 'LOCKED')}
                  className="h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 border border-white/[0.07] text-[11px] font-semibold text-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Unlock className="w-3.5 h-3.5" /> Unlock seats
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Room</h4>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 space-y-1.5 text-[11px] text-slate-300">
              <p className="flex items-center justify-between gap-2">
                <span>Privacy</span>
                <span className="font-semibold text-white">
                  {room.isPrivateFollowersOnly ? 'Followers only' : 'Public'}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span>Mode</span>
                <span className="font-semibold text-white">
                  {room.mode === 'VIDEO'
                    ? 'Video live'
                    : room.mode === 'AUDIO'
                    ? 'Audio board'
                    : 'Multi-guest board'}
                </span>
              </p>
              {!isSolo && (
                <>
                  <p className="flex items-center justify-between gap-2">
                    <span>Seats</span>
                    <span className="font-semibold text-white">
                      {occupiedCount}/{seats.length} occupied
                    </span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span>Guest requests</span>
                    <span className={`font-semibold ${allowGuestRequests ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {allowGuestRequests ? 'Allowed' : 'Closed'}
                    </span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span>Seat approval</span>
                    <span className="font-semibold text-white">
                      {hostApprovalForGuests ? 'Host approval' : 'Instant join'}
                    </span>
                  </p>
                </>
              )}
              <p className="flex items-center justify-between gap-2">
                <span>Viewer chat</span>
                <span className={`font-semibold ${allowViewerComments ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {allowViewerComments ? 'Allowed' : 'Read only'}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span>Gifts</span>
                <span className={`font-semibold ${allowGifts ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {allowGifts ? 'Allowed' : 'Disabled'}
                </span>
              </p>
              {canModerateSeats && (
                <p className="flex items-center justify-between gap-2">
                  <span>Moderators</span>
                  <span className="font-semibold text-white">
                    {moderators.length === 0 ? 'None yet' : `${moderators.length} assigned`}
                  </span>
                </p>
              )}
              <p className="text-[10px] text-slate-500 pt-0.5">
                Room settings are chosen when the room is created. Report abuse from the room
                rail — repeated violations may remove live access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Games Selection Modal */}
      {showGamesModal && (
        <div className="absolute inset-x-0 bottom-0 z-40 rounded-t-3xl bg-[#0F111D]/95 backdrop-blur-2xl border-t border-violet-500/20 p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-violet-600/20 text-violet-300">
                <Gamepad2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display text-sm font-bold text-white">Live Room Games</h3>
                <p className="text-[11px] text-slate-400">Play multiplayer games right inside the live stage</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGamesModal(false)}
              aria-label="Close games panel"
              className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setBoardTab('fruit');
                setShowGamesModal(false);
              }}
              className="flex items-start gap-3 p-3 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[#101420] to-[#0D101A] border border-emerald-500/30 hover:border-emerald-400/60 text-left transition-all group"
            >
              <span className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 group-hover:scale-105 transition-transform shrink-0">
                <Cherry className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Fruit Manor</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">Pick fruit multipliers with live room</p>
                <span className="inline-block mt-2 px-1.5 py-0.5 rounded-md bg-emerald-400/10 text-emerald-300 text-[9px] font-semibold">
                  Live Multiplayer
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setBoardTab('golden');
                setShowGamesModal(false);
              }}
              className="flex items-start gap-3 p-3 rounded-2xl bg-gradient-to-br from-amber-950/40 via-[#101420] to-[#0D101A] border border-amber-500/30 hover:border-amber-400/60 text-left transition-all group"
            >
              <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 group-hover:scale-105 transition-transform shrink-0">
                <Flower2 className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">Golden Flower</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">Dragon vs Phoenix live cards battle</p>
                <span className="inline-block mt-2 px-1.5 py-0.5 rounded-md bg-amber-400/10 text-amber-300 text-[9px] font-semibold">
                  Live Multiplayer
                </span>
              </div>
            </button>
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
            <p className="text-[11px] text-slate-400">
              Playing inside the live room allows host, guests and viewers to bet together with instant win alerts!
            </p>
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