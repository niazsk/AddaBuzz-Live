import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  Globe,
  Loader2,
  Lock,
  Mic,
  MicOff,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  X,
} from 'lucide-react';
import { CreateLiveRoomPayload, RoomCategory, RoomMode } from '../../types/app';
import { ROOM_CATEGORIES } from '../../data/previewData';
import {
  LocalMediaHandle,
  describeMediaError,
  listMediaDevices,
  startLocalMediaCapture,
} from '../../lib/mediaProvider';

interface GoLiveModalProps {
  open: boolean;
  onClose: () => void;
  onStartLiveRoom: (payload: CreateLiveRoomPayload) => Promise<boolean> | boolean;
}

const SEAT_OPTIONS = [8, 12, 16, 24] as const;

type PreviewState = 'idle' | 'starting' | 'ready' | 'error';

interface ToggleRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  hint,
  checked,
  onChange,
  disabled,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`w-full rounded-2xl border px-3.5 py-3 flex items-center justify-between gap-3 text-left transition-colors disabled:opacity-45 ${
      checked
        ? 'border-violet-400/35 bg-violet-500/[0.08]'
        : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
    }`}
  >
    <span className="min-w-0">
      <span className="block text-xs font-semibold text-slate-200">{label}</span>
      {hint && <span className="mt-0.5 block text-[10px] text-slate-500">{hint}</span>}
    </span>
    <span
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' : 'bg-white/20'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </span>
  </button>
);

export const GoLiveModal: React.FC<GoLiveModalProps> = ({
  open,
  onClose,
  onStartLiveRoom,
}) => {
  const [mode, setMode] = useState<'VIDEO' | 'MULTI_GUEST'>('MULTI_GUEST');
  const [board, setBoard] = useState<'VIDEO' | 'AUDIO'>('VIDEO');
  const [category, setCategory] = useState<Exclude<RoomCategory, 'All'>>('Music');
  const [seatCount, setSeatCount] = useState<number>(8);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'followers'>('public');
  const [allowGuestRequests, setAllowGuestRequests] = useState(true);
  const [allowViewerComments, setAllowViewerComments] = useState(true);
  const [allowGifts, setAllowGifts] = useState(true);
  const [hostApproval, setHostApproval] = useState(true);
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [cameraId, setCameraId] = useState('');
  const [micId, setMicId] = useState('');
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [previewState, setPreviewState] = useState<PreviewState>('idle');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewHasVideo, setPreviewHasVideo] = useState(false);
  const [previewHasAudio, setPreviewHasAudio] = useState(false);
  const [deviceNote, setDeviceNote] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<LocalMediaHandle | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const startedModeRef = useRef<RoomMode | null>(null);

  const effectiveMode: RoomMode =
    mode === 'VIDEO' ? 'VIDEO' : board === 'AUDIO' ? 'AUDIO' : 'MULTI_GUEST';
  const wantsVideo = effectiveMode !== 'AUDIO';

  const selectableCategories = ROOM_CATEGORIES.filter(
    (c): c is Exclude<RoomCategory, 'All'> => c !== 'All'
  );

  const modeSummary =
    effectiveMode === 'AUDIO'
      ? 'Audio board · mic only'
      : effectiveMode === 'MULTI_GUEST'
        ? `Video board · ${seatCount} guest seats`
        : 'Solo video broadcast';

  const refreshDevices = async () => {
    const { cameras, mics } = await listMediaDevices();
    setCameraDevices(cameras);
    setMicDevices(mics);
  };

  const stopPreview = () => {
    if (previewRef.current) {
      previewRef.current.stop();
      previewRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setPreviewHasVideo(false);
    setPreviewHasAudio(false);
    setMicLevel(0);
    setPreviewState('idle');
  };

  const applyHandle = (handle: LocalMediaHandle) => {
    if (!openRef.current) {
      handle.stop();
      return;
    }
    handle.setAudioMuted(micMuted);
    previewRef.current = handle;
    setPreviewHasVideo(handle.stream.getVideoTracks().length > 0);
    setPreviewHasAudio(handle.stream.getAudioTracks().length > 0);
    if (videoRef.current) videoRef.current.srcObject = handle.stream;
    setPreviewState('ready');
    setPreviewError(null);
    setPreviewKey((k) => k + 1);
    void refreshDevices();
  };

  const startPreview = async (opts?: {
    mode?: RoomMode;
    cameraId?: string;
    micId?: string;
    facing?: 'user' | 'environment';
  }) => {
    const targetMode = opts?.mode ?? effectiveMode;
    const targetCamera = opts?.cameraId ?? cameraId;
    const targetMic = opts?.micId ?? micId;
    const targetFacing = opts?.facing ?? facing;
    setPreviewState('starting');
    setPreviewError(null);
    previewRef.current?.stop();
    previewRef.current = null;

    const capture = (useSaved: boolean) =>
      startLocalMediaCapture({
        mode: targetMode,
        facingMode: targetFacing,
        cameraDeviceId: useSaved && targetCamera ? targetCamera : undefined,
        micDeviceId: useSaved && targetMic ? targetMic : undefined,
        quality: '720p',
        onAudioLevel: setMicLevel,
      });

    try {
      applyHandle(await capture(true));
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      const staleDevice =
        (targetCamera || targetMic) &&
        ['OverconstrainedError', 'NotFoundError', 'DevicesNotFoundError'].includes(name);
      if (staleDevice) {
        setCameraId('');
        setMicId('');
        setDeviceNote('Saved device was unavailable — switched to the default device.');
        try {
          applyHandle(await capture(false));
          return;
        } catch (retryErr) {
          setPreviewState('error');
          setPreviewError(describeMediaError(retryErr));
          return;
        }
      }
      setPreviewState('error');
      setPreviewError(describeMediaError(err));
    }
  };

  // Reset the form each time the sheet opens so stale config never leaks between rooms.
  useEffect(() => {
    if (!open) return;
    setMode('MULTI_GUEST');
    setBoard('VIDEO');
    setCategory('Music');
    setSeatCount(8);
    setTitle('');
    setDescription('');
    setPrivacy('public');
    setAllowGuestRequests(true);
    setAllowViewerComments(true);
    setAllowGifts(true);
    setHostApproval(true);
    setConsent(false);
    setFormError(null);
    setSubmitting(false);
    setDeviceNote(null);
    setMicMuted(false);
    setMicLevel(0);
    setCameraId('');
    setMicId('');
    setFacing('user');
    setPreviewState('idle');
    setPreviewError(null);
  }, [open]);

  // Auto-start the real device preview when the sheet opens or the board changes.
  useEffect(() => {
    if (!open) {
      startedModeRef.current = null;
      return;
    }
    if (startedModeRef.current === effectiveMode) return;
    const isInitial = startedModeRef.current === null;
    startedModeRef.current = effectiveMode;
    void startPreview(
      isInitial
        ? { mode: effectiveMode, cameraId: '', micId: '', facing: 'user' }
        : { mode: effectiveMode }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, effectiveMode]);

  // Release every preview track when the sheet closes or unmounts.
  useEffect(() => {
    if (!open) {
      stopPreview();
      return;
    }
    return () => {
      if (previewRef.current) {
        previewRef.current.stop();
        previewRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Refresh the device list when cameras/mics are plugged or removed.
  useEffect(() => {
    if (!open || !navigator.mediaDevices?.addEventListener) return;
    const onChange = () => void refreshDevices();
    navigator.mediaDevices.addEventListener('devicechange', onChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', onChange);
  }, [open]);

  // Keep the video element bound across re-mounts (audio ↔ video board switches).
  useEffect(() => {
    if (videoRef.current && previewRef.current) {
      videoRef.current.srcObject = previewRef.current.stream;
    }
  }, [previewState, previewHasVideo, previewKey]);

  // Scroll lock, Escape to close, focus trap and initial focus.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 60);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, submitting, onClose]);

  if (!open) return null;

  const toggleMic = () => {
    const next = !micMuted;
    setMicMuted(next);
    previewRef.current?.setAudioMuted(next);
  };

  const handleSwitchCamera = () => {
    if (cameraDevices.length > 1) {
      const currentIndex = cameraDevices.findIndex((d) => d.deviceId === cameraId);
      const next = cameraDevices[(currentIndex + 1) % cameraDevices.length];
      setCameraId(next.deviceId);
      void startPreview({ cameraId: next.deviceId });
      return;
    }
    const nextFacing = facing === 'user' ? 'environment' : 'user';
    setFacing(nextFacing);
    setCameraId('');
    void startPreview({ facing: nextFacing, cameraId: '' });
  };

  const validate = (): string | null => {
    if (title.trim().length < 3) return 'Room title must be at least 3 characters.';
    if (!consent) {
      return 'Please accept the community guidelines and media consent before going live.';
    }
    if (previewState === 'starting') {
      return 'Camera and microphone are still starting — wait a moment.';
    }
    if (previewState !== 'ready' || !previewHasAudio) {
      return effectiveMode === 'AUDIO'
        ? 'Microphone is not available. Allow microphone access, then retry.'
        : 'Camera and microphone are not available. Allow access, connect a device, or switch to the Audio board.';
    }
    if (wantsVideo && !previewHasVideo) {
      return 'No camera detected. Reconnect a camera or switch this room to the Audio board.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setSubmitting(true);
    const capacity = mode === 'MULTI_GUEST' ? seatCount : 8;
    const payload: CreateLiveRoomPayload = {
      title: title.trim(),
      description:
        description.trim() ||
        (effectiveMode === 'AUDIO'
          ? `Welcome to the audio room — grab one of ${capacity} guest seats or drop a comment.`
          : effectiveMode === 'MULTI_GUEST'
            ? `Welcome to the room — grab one of ${capacity} guest seats or drop a comment.`
            : 'Welcome to the room — drop a comment and show some love.'),
      category,
      mode: effectiveMode,
      seatCount: capacity,
      isPrivateFollowersOnly: privacy === 'followers',
      allowGuestRequests,
      allowViewerComments,
      allowGifts,
      hostApprovalForGuests: hostApproval,
    };
    try {
      const created = await onStartLiveRoom(payload);
      if (created === false) setSubmitting(false);
    } catch {
      setSubmitting(false);
      setFormError('Could not start the room. Check your connection and try again.');
    }
  };

  const cameraMissing = previewState === 'error' && wantsVideo;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/80 backdrop-blur-md sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="go-live-title"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex h-[100dvh] sm:h-auto w-full sm:max-w-lg sm:max-h-[92dvh] flex-col overflow-hidden rounded-none sm:rounded-3xl border-0 sm:border border-white/10 bg-[#0C0E17]/97 shadow-[0_30px_90px_-24px_rgba(0,0,0,0.95)] outline-none"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-none sm:rounded-3xl"
        >
          <div className="absolute -top-24 left-1/2 h-56 w-[130%] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600/25 via-fuchsia-500/15 to-sky-500/25 blur-3xl" />
        </div>
        <div
          aria-hidden="true"
          className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-violet-400/60 to-transparent"
        />

        <div className="relative flex items-center gap-3 px-5 sm:px-6 pt-[calc(env(safe-area-inset-top)+1rem)] sm:pt-5 pb-4 shrink-0">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-600 text-white shadow-[0_10px_28px_-10px_rgba(217,70,239,0.8)]">
            <Radio className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-[#0C0E17]" />
            </span>
          </span>
          <div className="min-w-0">
            <h2
              id="go-live-title"
              className="font-display text-lg font-bold tracking-tight text-white"
            >
              Start Live Room
            </h2>
            <p className="truncate text-xs text-slate-400">
              Test your camera and mic, set the stage, go live.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close Go Live modal"
            className="ml-auto p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="relative flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 pb-5 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-300">Room Mode</span>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    { id: 'VIDEO', label: 'Video Live', desc: 'Solo broadcast', icon: Video },
                    { id: 'MULTI_GUEST', label: 'Multi-Guest', desc: 'Seats & guests', icon: Users },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const active = mode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMode(item.id)}
                      aria-pressed={active}
                      className={`group relative p-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] ${
                        active
                          ? 'border-violet-400/60 bg-gradient-to-br from-violet-600/25 via-fuchsia-600/10 to-sky-500/20 shadow-[0_14px_34px_-18px_rgba(139,92,246,0.9)]'
                          : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                            active
                              ? 'bg-gradient-to-br from-violet-500 to-sky-500 text-white'
                              : 'bg-white/[0.06] text-sky-400 group-hover:text-sky-300'
                          }`}
                        >
                          <Icon className="w-4.5 h-4.5" />
                        </span>
                        {active && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white shadow-[0_4px_12px_-4px_rgba(139,92,246,0.9)]">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p
                        className={`mt-2.5 text-sm font-semibold ${
                          active ? 'text-white' : 'text-slate-200'
                        }`}
                      >
                        {item.label}
                      </p>
                      <p className="text-[11px] text-slate-400">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {mode === 'MULTI_GUEST' && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-300">Board</span>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                  {(
                    [
                      { id: 'VIDEO', label: 'Video Board', icon: Video },
                      { id: 'AUDIO', label: 'Audio Board', icon: Mic },
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    const active = board === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setBoard(item.id)}
                        aria-pressed={active}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                          active
                            ? 'bg-gradient-to-r from-violet-600 to-sky-500 text-white shadow-[0_8px_22px_-10px_rgba(99,102,241,0.95)]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      board === 'AUDIO' ? 'bg-emerald-400' : 'bg-sky-400'
                    }`}
                  />
                  {board === 'AUDIO'
                    ? 'Audio-only seats — microphone on, no camera required.'
                    : 'Seats stream live camera and microphone.'}
                </p>
              </div>
            )}

            {/* Camera & microphone test */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                  <Camera className="w-3.5 h-3.5 text-sky-400" />
                  Camera &amp; Microphone
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    previewState === 'ready'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : previewState === 'starting'
                        ? 'bg-amber-500/15 text-amber-300'
                        : previewState === 'error'
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'bg-white/[0.06] text-slate-400'
                  }`}
                >
                  {previewState === 'starting' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        previewState === 'ready'
                          ? 'bg-emerald-400'
                          : previewState === 'error'
                            ? 'bg-rose-400'
                            : 'bg-slate-500'
                      }`}
                    />
                  )}
                  {previewState === 'ready'
                    ? 'Preview live'
                    : previewState === 'starting'
                      ? 'Starting…'
                      : previewState === 'error'
                        ? 'Device error'
                        : 'Idle'}
                </span>
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-[#070910]">
                {wantsVideo ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
                      previewHasVideo && previewState === 'ready'
                        ? 'opacity-100'
                        : 'opacity-0'
                    } ${facing === 'user' ? '-scale-x-100' : ''}`}
                  />
                ) : null}
                {(!previewHasVideo || !wantsVideo) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_35%,rgba(124,58,237,0.32),rgba(5,7,13,0.96)_70%)] px-6 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-violet-300">
                      {wantsVideo ? <Video className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </span>
                    <p className="text-xs font-semibold text-slate-200">
                      {wantsVideo
                        ? previewState === 'starting'
                          ? 'Requesting camera & microphone…'
                          : 'Camera preview is off'
                        : 'Audio board — no camera needed'}
                    </p>
                    <p className="max-w-[260px] text-[10px] leading-relaxed text-slate-400">
                      {wantsVideo
                        ? 'Your real camera feed appears here once permission is granted.'
                        : 'Only your microphone is captured. Perfect for talk rooms.'}
                    </p>
                  </div>
                )}

                {previewState === 'starting' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-300" />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/85 to-transparent px-2.5 pt-6 pb-2">
                  <button
                    type="button"
                    onClick={() => void startPreview({ mode: effectiveMode })}
                    disabled={previewState === 'starting'}
                    aria-label="Retry camera and microphone"
                    title="Retry devices"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-slate-200 hover:bg-black/80 disabled:opacity-40"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  {wantsVideo && (
                    <button
                      type="button"
                      onClick={handleSwitchCamera}
                      disabled={previewState === 'starting'}
                      aria-label="Switch camera"
                      title="Switch camera"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-slate-200 hover:bg-black/80 disabled:opacity-40"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleMic}
                    aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'}
                    aria-pressed={micMuted}
                    title={micMuted ? 'Unmute mic' : 'Mute mic'}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                      micMuted
                        ? 'bg-rose-500/85 text-white'
                        : 'bg-black/60 text-slate-200 hover:bg-black/80'
                    }`}
                  >
                    {micMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
                      Mic
                    </span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-75"
                        style={{ width: `${micMuted ? 0 : micLevel}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {previewState === 'error' && previewError && (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-950/50 px-3.5 py-3 space-y-2">
                  <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-rose-200">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{previewError}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void startPreview({ mode: effectiveMode })}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-400"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                    {cameraMissing && mode === 'MULTI_GUEST' && board !== 'AUDIO' && (
                      <button
                        type="button"
                        onClick={() => setBoard('AUDIO')}
                        className="rounded-lg bg-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/[0.14]"
                      >
                        Use Audio board instead
                      </button>
                    )}
                    {cameraMissing && mode === 'VIDEO' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('MULTI_GUEST');
                          setBoard('AUDIO');
                        }}
                        className="rounded-lg bg-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/[0.14]"
                      >
                        Start a Multi-Guest audio room
                      </button>
                    )}
                  </div>
                </div>
              )}

              {deviceNote && (
                <p className="rounded-xl border border-amber-400/25 bg-amber-500/[0.08] px-3 py-2 text-[10px] text-amber-200">
                  {deviceNote}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {wantsVideo && (
                  <label className="block">
                    <span className="text-[10px] font-medium text-slate-400">Camera</span>
                    <select
                      value={cameraId}
                      onChange={(e) => {
                        setCameraId(e.target.value);
                        void startPreview({ cameraId: e.target.value });
                      }}
                      aria-label="Select camera"
                      className="mt-1 w-full h-10 rounded-xl bg-black/45 border border-white/15 px-2.5 text-xs text-white focus:outline-none focus:border-sky-400/60"
                    >
                      <option value="">Auto (default camera)</option>
                      {cameraDevices.map((device, idx) => (
                        <option key={device.deviceId || idx} value={device.deviceId}>
                          {device.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="block">
                  <span className="text-[10px] font-medium text-slate-400">Microphone</span>
                  <select
                    value={micId}
                    onChange={(e) => {
                      setMicId(e.target.value);
                      void startPreview({ micId: e.target.value });
                    }}
                    aria-label="Select microphone"
                    className="mt-1 w-full h-10 rounded-xl bg-black/45 border border-white/15 px-2.5 text-xs text-white focus:outline-none focus:border-sky-400/60"
                  >
                    <option value="">Auto (default microphone)</option>
                    {micDevices.map((device, idx) => (
                      <option key={device.deviceId || idx} value={device.deviceId}>
                        {device.label || `Microphone ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {(cameraDevices.length === 0 || micDevices.some((d) => !d.label)) && (
                <p className="text-[10px] text-slate-500">
                  Device names appear after you allow camera / microphone access.
                </p>
              )}
            </div>

            <label className="block">
              <span className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  Room Title
                </span>
                <span className="text-[10px] tabular-nums text-slate-500">
                  {title.length}/120
                </span>
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
                minLength={3}
                placeholder="Give your room a catchy title"
                className="mt-2 w-full h-11 px-3.5 rounded-2xl bg-[#090B12] border border-white/[0.09] text-sm text-white placeholder:text-slate-500 transition-colors focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Description</span>
                <span className="text-[10px] tabular-nums text-slate-500">
                  {description.length}/400
                </span>
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={400}
                rows={2}
                placeholder="Tell viewers what to expect (optional)"
                className="mt-2 w-full min-h-[72px] resize-none px-3.5 py-2.5 rounded-2xl bg-[#090B12] border border-white/[0.09] text-sm text-white placeholder:text-slate-500 transition-colors focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
              />
            </label>

            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-300">Category</span>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {selectableCategories.map((cat) => {
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      aria-pressed={active}
                      className={`h-9 px-3.5 rounded-full border text-xs whitespace-nowrap shrink-0 transition-all duration-200 ${
                        active
                          ? 'bg-white text-[#08090E] border-white font-semibold shadow-[0_8px_20px_-12px_rgba(255,255,255,0.6)]'
                          : 'bg-white/[0.03] border-white/[0.08] text-slate-300 hover:text-white hover:border-white/25'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {mode === 'MULTI_GUEST' && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-300">Guest Seats</span>
                <div className="grid grid-cols-4 gap-2">
                  {SEAT_OPTIONS.map((option) => {
                    const active = seatCount === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSeatCount(option)}
                        aria-pressed={active}
                        className={`h-12 rounded-2xl border text-sm font-bold transition-all duration-200 active:scale-[0.97] ${
                          active
                            ? 'border-violet-400/70 bg-gradient-to-b from-violet-600/30 to-sky-500/15 text-white shadow-[0_10px_26px_-14px_rgba(139,92,246,0.95)]'
                            : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                        }`}
                      >
                        {option}
                        <span className="block text-[9px] font-medium uppercase tracking-wider opacity-70">
                          seats
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500">
                  Host takes the stage; {seatCount} guests can join the{' '}
                  {board === 'AUDIO' ? 'audio seat grid' : 'seat grid'}.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-300">Visibility</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrivacy('public')}
                  aria-pressed={privacy === 'public'}
                  className={`rounded-2xl border p-3 text-left transition-colors ${
                    privacy === 'public'
                      ? 'border-emerald-400/45 bg-emerald-500/[0.08]'
                      : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Globe className="w-3.5 h-3.5 text-emerald-300" />
                    Public
                  </span>
                  <span className="mt-1 block text-[10px] text-slate-400">
                    Listed on Discover for everyone.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacy('followers')}
                  aria-pressed={privacy === 'followers'}
                  className={`rounded-2xl border p-3 text-left transition-colors ${
                    privacy === 'followers'
                      ? 'border-violet-400/45 bg-violet-500/[0.10]'
                      : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Lock className="w-3.5 h-3.5 text-violet-300" />
                    Followers only
                  </span>
                  <span className="mt-1 block text-[10px] text-slate-400">
                    Hidden from Discover; only your followers can open it.
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Room permissions
              </span>
              {mode === 'MULTI_GUEST' && (
                <ToggleRow
                  label="Allow guest seat requests"
                  hint="Viewers can ask to join the seat grid."
                  checked={allowGuestRequests}
                  onChange={setAllowGuestRequests}
                />
              )}
              {mode === 'MULTI_GUEST' && (
                <ToggleRow
                  label="Require host approval for guests"
                  hint={
                    allowGuestRequests
                      ? 'Off = seats open instantly without a request.'
                      : 'Turn on seat requests to use approval.'
                  }
                  checked={hostApproval}
                  onChange={setHostApproval}
                  disabled={!allowGuestRequests}
                />
              )}
              <ToggleRow
                label="Allow viewer comments"
                hint="Off = only you and your moderators can chat."
                checked={allowViewerComments}
                onChange={setAllowViewerComments}
              />
              <ToggleRow
                label="Allow gifts"
                hint="Viewers can send gifts to the stage."
                checked={allowGifts}
                onChange={setAllowGifts}
              />
            </div>

            <label
              className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition-colors ${
                consent
                  ? 'border-emerald-400/25 bg-emerald-500/[0.06]'
                  : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15'
              }`}
            >
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400/50 ${
                  consent
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white'
                    : 'border-white/25 text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs text-slate-300 leading-relaxed">
                I grant microphone{wantsVideo ? ' and camera' : ''} permission for live streaming
                and agree to AddaBuzz Live community safety guidelines.
              </span>
            </label>
          </div>

          <div className="shrink-0 border-t border-white/[0.06] bg-[#0A0C13]/90 backdrop-blur-md px-5 sm:px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-4 space-y-2.5">
            {formError && (
              <p
                role="alert"
                className="flex items-start gap-1.5 rounded-xl border border-rose-500/35 bg-rose-950/50 px-3 py-2 text-[11px] leading-relaxed text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{formError}</span>
              </p>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
              <span className="truncate">{modeSummary}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 h-12 rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] text-xs font-medium text-slate-200 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-500 hover:from-violet-500 hover:via-fuchsia-500 hover:to-sky-400 disabled:opacity-50 disabled:shadow-none text-sm font-semibold text-white inline-flex items-center justify-center gap-2 shadow-[0_16px_40px_-16px_rgba(139,92,246,0.95)] transition-all active:scale-[0.99]"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Radio className="w-4 h-4" />
                )}
                <span>{submitting ? 'Starting…' : 'Go Live'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
