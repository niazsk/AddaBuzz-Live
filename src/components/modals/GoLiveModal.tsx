import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  ChevronDown,
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

const DEFAULT_ROOM_TITLE = '🌟 Welcome to AddaBuzz Live — Adda, Chat & Fun! 🎉';

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
    className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors disabled:opacity-45 ${
      checked ? 'bg-violet-500/[0.05]' : 'hover:bg-white/[0.03]'
    }`}
  >
    <span className="min-w-0">
      <span className="block text-[11px] font-semibold text-slate-200">{label}</span>
      {hint && <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">{hint}</span>}
    </span>
    <span
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-gradient-to-r from-cyan-400 to-violet-500' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </span>
  </button>
);

const SectionHeading: React.FC<{ step: string; title: string; trailing?: React.ReactNode }> = ({
  step,
  title,
  trailing,
}) => (
  <div className="flex items-center gap-2">
    <span className="font-mono text-[9px] font-semibold tracking-[0.2em] text-cyan-300/80">
      {step}
    </span>
    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
      {title}
    </span>
    <span
      aria-hidden="true"
      className="h-px flex-1 bg-gradient-to-r from-white/[0.10] to-transparent"
    />
    {trailing}
  </div>
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
  const [title, setTitle] = useState(DEFAULT_ROOM_TITLE);
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'followers'>('public');
  const [allowGuestRequests, setAllowGuestRequests] = useState(true);
  const [allowViewerComments, setAllowViewerComments] = useState(true);
  const [allowGifts, setAllowGifts] = useState(true);
  const [hostApproval, setHostApproval] = useState(true);
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
    setTitle(DEFAULT_ROOM_TITLE);
    setDescription('');
    setPrivacy('public');
    setAllowGuestRequests(true);
    setAllowViewerComments(true);
    setAllowGifts(true);
    setHostApproval(true);
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
    const effectiveTitle = title.trim() || DEFAULT_ROOM_TITLE;
    if (effectiveTitle.length < 3) return 'Room title must be at least 3 characters.';
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
    const effectiveTitle = title.trim() || DEFAULT_ROOM_TITLE;
    const capacity = mode === 'MULTI_GUEST' ? seatCount : 8;
    const payload: CreateLiveRoomPayload = {
      title: effectiveTitle,
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
        className="relative flex h-[100dvh] sm:h-auto w-full sm:max-w-[980px] sm:max-h-[94dvh] flex-col overflow-hidden rounded-none sm:rounded-[28px] border-0 sm:border border-white/[0.09] bg-[#090B12] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.95)] outline-none"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-none sm:rounded-[28px]"
        >
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '34px 34px',
              maskImage: 'radial-gradient(ellipse at 50% 0%, black 10%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black 10%, transparent 70%)',
            }}
          />
          <div className="absolute -top-28 left-1/4 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -top-24 right-0 h-56 w-56 rounded-full bg-fuchsia-500/15 blur-3xl" />
        </div>
        <div
          aria-hidden="true"
          className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-violet-400/50 to-transparent"
        />

        <div className="relative flex items-center gap-3 px-5 sm:px-7 pt-[calc(env(safe-area-inset-top)+0.9rem)] sm:pt-5 pb-4 shrink-0">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/25 bg-gradient-to-br from-cyan-500/20 via-violet-600/20 to-fuchsia-500/20 text-cyan-200">
            <Radio className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-[#090B12]" />
            </span>
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.32em] text-cyan-300/80">
              AddaBuzz Studio
            </p>
            <h2
              id="go-live-title"
              className="truncate font-display text-base font-bold tracking-tight text-white sm:text-lg"
            >
              Start Live Room
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close Go Live modal"
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="relative flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-7 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
              <div className="space-y-3.5">
                <SectionHeading
                  step="01"
                  title="Stage monitor"
                  trailing={
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-600">
                      16:9
                    </span>
                  }
                />

            {/* Camera & microphone test */}
            <div className="space-y-2.5">
              <div className="relative overflow-hidden rounded-[20px] border border-white/[0.10] bg-[#05070D] shadow-[0_24px_60px_-34px_rgba(56,189,248,0.45)]">
                <div className="relative aspect-video w-full">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1.5 top-1.5 h-3.5 w-3.5 rounded-tl-md border-l-2 border-t-2 border-cyan-300/30"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-1.5 top-1.5 h-3.5 w-3.5 rounded-tr-md border-r-2 border-t-2 border-cyan-300/30"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-1.5 left-1.5 h-3.5 w-3.5 rounded-bl-md border-b-2 border-l-2 border-cyan-300/30"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-1.5 right-1.5 h-3.5 w-3.5 rounded-br-md border-b-2 border-r-2 border-cyan-300/30"
                  />
                  <span
                    className={`pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.22em] backdrop-blur-sm ${
                      previewState === 'ready'
                        ? 'border-rose-400/40 bg-rose-500/20 text-rose-100'
                        : 'border-white/10 bg-black/45 text-slate-400'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        previewState === 'ready' ? 'animate-pulse bg-rose-400' : 'bg-slate-500'
                      }`}
                    />
                    {wantsVideo ? 'Camera' : 'Audio'}
                  </span>
                  <span
                    className={`pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.18em] backdrop-blur-sm ${
                      previewState === 'ready'
                        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                        : previewState === 'starting'
                          ? 'border-amber-400/30 bg-amber-500/15 text-amber-200'
                          : previewState === 'error'
                            ? 'border-rose-400/30 bg-rose-500/15 text-rose-200'
                            : 'border-white/10 bg-black/45 text-slate-400'
                    }`}
                  >
                    {previewState === 'starting' ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
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
                        ? 'Starting'
                        : previewState === 'error'
                          ? 'Device error'
                          : 'Standby'}
                  </span>
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_30%,rgba(14,116,144,0.28),rgba(5,7,13,0.97)_68%)] px-6 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-300">
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

                <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-3 pt-8 pb-2.5">
                  <button
                    type="button"
                    onClick={() => void startPreview({ mode: effectiveMode })}
                    disabled={previewState === 'starting'}
                    aria-label="Retry camera and microphone"
                    title="Retry devices"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/55 text-slate-200 backdrop-blur-sm transition-colors hover:bg-black/80 disabled:opacity-40"
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
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/55 text-slate-200 backdrop-blur-sm transition-colors hover:bg-black/80 disabled:opacity-40"
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
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                      micMuted
                        ? 'border-rose-400/40 bg-rose-500/85 text-white'
                        : 'border-white/10 bg-black/55 text-slate-200 backdrop-blur-sm hover:bg-black/80'
                    }`}
                  >
                    {micMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                  <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/45 px-2 py-1.5 backdrop-blur-sm">
                    <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Mic
                    </span>
                    <div className="h-1 w-12 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-75"
                        style={{ width: `${micMuted ? 0 : micLevel}%` }}
                      />
                    </div>
                  </div>
                </div>
                </div>
              </div>

              {previewState === 'error' && previewError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3.5 py-3 space-y-2">
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
                <p className="rounded-xl border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2 text-[10px] text-amber-200">
                  {deviceNote}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {wantsVideo && (
                  <label className="block">
                    <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                      <Camera className="h-3 w-3" />
                      Camera
                    </span>
                    <div className="relative mt-1.5">
                      <select
                        value={cameraId}
                        onChange={(e) => {
                          setCameraId(e.target.value);
                          void startPreview({ cameraId: e.target.value });
                        }}
                        aria-label="Select camera"
                        className="h-10 w-full appearance-none rounded-xl border border-white/[0.09] bg-[#070A11] px-3 pr-8 text-xs text-slate-100 transition-colors focus:border-cyan-400/60 focus:outline-none"
                      >
                        <option value="">Auto (default camera)</option>
                        {cameraDevices.map((device, idx) => (
                          <option key={device.deviceId || idx} value={device.deviceId}>
                            {device.label || `Camera ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                    </div>
                  </label>
                )}
                <label className="block">
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                    <Mic className="h-3 w-3" />
                    Microphone
                  </span>
                  <div className="relative mt-1.5">
                    <select
                      value={micId}
                      onChange={(e) => {
                        setMicId(e.target.value);
                        void startPreview({ micId: e.target.value });
                      }}
                      aria-label="Select microphone"
                      className="h-10 w-full appearance-none rounded-xl border border-white/[0.09] bg-[#070A11] px-3 pr-8 text-xs text-slate-100 transition-colors focus:border-cyan-400/60 focus:outline-none"
                    >
                      <option value="">Auto (default microphone)</option>
                      {micDevices.map((device, idx) => (
                        <option key={device.deviceId || idx} value={device.deviceId}>
                          {device.label || `Microphone ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  </div>
                </label>
              </div>
              {(cameraDevices.length === 0 || micDevices.some((d) => !d.label)) && (
                <p className="text-[10px] text-slate-500">
                  Device names appear after you allow camera / microphone access.
                </p>
              )}
            </div>
              </div>

              <div className="space-y-5 lg:rounded-2xl lg:border lg:border-white/[0.07] lg:bg-white/[0.02] lg:p-4">
                <div className="space-y-2.5">
                  <SectionHeading step="02" title="Format" />
                  <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/[0.08] bg-black/30 p-1.5">
                    {(
                      [
                        { id: 'MULTI_GUEST', label: 'Multi-Guest', desc: '8–24 seats', icon: Users },
                        { id: 'VIDEO', label: 'Video Live', desc: 'Solo stage', icon: Video },
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
                          className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all duration-200 ${
                            active
                              ? 'border-cyan-300/35 bg-gradient-to-br from-violet-600/35 via-fuchsia-600/20 to-sky-500/25 text-white shadow-[0_10px_24px_-18px_rgba(139,92,246,0.8)]'
                              : 'border-white/[0.06] text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-200'
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                              active ? 'bg-white/10 text-cyan-200' : 'bg-white/[0.05] text-cyan-300/70'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[11px] font-semibold">
                              {item.label}
                            </span>
                            <span
                              className={`block truncate text-[9px] ${
                                active ? 'text-white/60' : 'text-slate-500'
                              }`}
                            >
                              {item.desc}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {mode === 'MULTI_GUEST' && (
                    <div className="space-y-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                          Board
                        </span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-300/70">
                          {board === 'AUDIO' ? 'Mic only' : 'Cam + mic'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/40 p-1">
                        {(
                          [
                            { id: 'VIDEO', label: 'Video', icon: Video },
                            { id: 'AUDIO', label: 'Audio', icon: Mic },
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
                              className={`flex h-8 items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                                active
                                  ? 'bg-white/[0.10] text-white shadow-[inset_0_0_0_1px_rgba(103,232,249,0.25)]'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-500">
                        {board === 'AUDIO'
                          ? 'Audio-only seats — microphone on, no camera required.'
                          : 'Seats stream live camera and microphone.'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <SectionHeading step="03" title="Room details" />
                  <label className="block">
                    <span className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
                        <Sparkles className="w-3 h-3 text-violet-400" />
                        Title
                      </span>
                      <span className="font-mono text-[9px] tabular-nums text-slate-500">
                        {title.length}/120
                      </span>
                    </span>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      maxLength={120}
                      required
                      minLength={3}
                      placeholder="Give your room a catchy title"
                      className="mt-1.5 h-11 w-full px-3.5 rounded-xl bg-black/35 border border-white/[0.09] text-sm text-white placeholder:text-slate-500 transition-colors focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/15 focus:outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-300">Description</span>
                      <span className="font-mono text-[9px] tabular-nums text-slate-500">
                        {description.length}/400
                      </span>
                    </span>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={400}
                      rows={2}
                      placeholder="Tell viewers what to expect (optional)"
                      className="mt-1.5 w-full min-h-[64px] resize-none px-3.5 py-2.5 rounded-xl bg-black/35 border border-white/[0.09] text-sm text-white placeholder:text-slate-500 transition-colors focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/15 focus:outline-none"
                    />
                  </label>
                </div>

                {mode === 'MULTI_GUEST' && (
                  <div className="space-y-2.5">
                    <SectionHeading step="04" title="Guest seats" />
                    <div className="grid grid-cols-4 gap-1.5">
                      {SEAT_OPTIONS.map((option) => {
                        const active = seatCount === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setSeatCount(option)}
                            aria-pressed={active}
                            className={`rounded-xl border px-1.5 py-2 text-center transition-all duration-200 active:scale-[0.97] ${
                              active
                                ? 'border-cyan-300/50 bg-gradient-to-b from-violet-600/30 via-fuchsia-600/10 to-cyan-500/20 text-white shadow-[0_12px_28px_-18px_rgba(56,189,248,0.8)]'
                                : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.05]'
                            }`}
                          >
                            <span className="block text-base font-bold tabular-nums leading-tight">
                              {option}
                            </span>
                            <span className="block font-mono text-[8px] font-medium uppercase tracking-[0.16em] opacity-70">
                              seats
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div aria-hidden="true" className="flex flex-wrap items-center gap-1">
                      <span className="h-3.5 w-6 rounded-[3px] bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-[0_0_10px_-2px_rgba(217,70,239,0.7)]" />
                      {Array.from({ length: seatCount }).map((_, index) => (
                        <span
                          key={index}
                          className="h-3.5 w-6 rounded-[3px] border border-white/10 bg-white/[0.05]"
                        />
                      ))}
                      <span className="ml-1 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                        Host + {seatCount}
                      </span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-slate-500">
                      Host takes the stage; {seatCount} guests can join the{' '}
                      {board === 'AUDIO' ? 'audio seat grid' : 'seat grid'}.
                    </p>
                  </div>
                )}

                <div className="space-y-2.5">
                  <SectionHeading step="05" title="Access & rules" />
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPrivacy('public')}
                      aria-pressed={privacy === 'public'}
                      className={`flex items-start gap-2 rounded-xl border px-2.5 py-2.5 text-left transition-colors ${
                        privacy === 'public'
                          ? 'border-emerald-400/40 bg-emerald-500/[0.07]'
                          : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
                        <Globe className="w-3.5 h-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-white">
                          Public
                          {privacy === 'public' && <Check className="w-3 h-3 text-emerald-300" />}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-snug text-slate-400">
                          Listed on Discover for everyone.
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrivacy('followers')}
                      aria-pressed={privacy === 'followers'}
                      className={`flex items-start gap-2 rounded-xl border px-2.5 py-2.5 text-left transition-colors ${
                        privacy === 'followers'
                          ? 'border-violet-400/40 bg-violet-500/[0.09]'
                          : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-white">
                          Followers only
                          {privacy === 'followers' && <Check className="w-3 h-3 text-violet-300" />}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-snug text-slate-400">
                          Hidden from Discover; only your followers can open it.
                        </span>
                      </span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      Room permissions
                    </span>
                    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.05]">
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
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="relative shrink-0 border-t border-white/[0.08] bg-[#070910]/95 backdrop-blur-xl px-5 sm:px-7 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-4">
            {formError && (
              <p
                role="alert"
                className="mb-2.5 flex items-start gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/45 px-3 py-2 text-[11px] leading-relaxed text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{formError}</span>
              </p>
            )}
            <div className="flex items-center gap-2.5">
              <div className="hidden min-w-0 flex-1 sm:block">
                <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                  </span>
                  Ready to broadcast
                </p>
                <p className="mt-1 truncate text-xs font-medium text-slate-300">{modeSummary}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="h-11 rounded-xl border border-white/[0.10] bg-white/[0.03] px-4 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.08] disabled:opacity-40 sm:h-12"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-600 to-sky-500 text-sm font-semibold text-white shadow-[0_18px_44px_-18px_rgba(139,92,246,0.95)] transition-all hover:from-fuchsia-400 hover:via-violet-500 hover:to-sky-400 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none sm:h-12 sm:flex-none sm:px-8"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Radio className="w-4 h-4" />
                )}
                <span>{submitting ? 'Starting…' : 'Go Live'}</span>
              </button>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500 sm:hidden">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
              </span>
              <span className="truncate">{modeSummary}</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
