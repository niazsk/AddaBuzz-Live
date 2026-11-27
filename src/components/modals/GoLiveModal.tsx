import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Globe,
  LayoutGrid,
  Loader2,
  Lock,
  Mic,
  MicOff,
  PencilLine,
  Radio,
  RefreshCw,
  ShieldCheck,
  Users,
  Video,
  X,
} from 'lucide-react';
import { CreateLiveRoomPayload, RoomCategory, RoomMode } from '../../types/app';
import { ROOM_CATEGORIES } from '../../data/previewData';
import {
  LocalMediaHandle,
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
type SetupTab = 'format' | 'details' | 'access';

const SETUP_TABS: { id: SetupTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'format', label: 'Format', icon: LayoutGrid },
  { id: 'details', label: 'Details', icon: PencilLine },
  { id: 'access', label: 'Access', icon: ShieldCheck },
];

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
    className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors disabled:opacity-45"
  >
    <span className="min-w-0">
      <span className="block text-xs font-medium text-slate-200">{label}</span>
      {hint && <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">{hint}</span>}
    </span>
    <span
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-violet-600' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
          checked ? 'left-[22px]' : 'left-0.5'
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
  const [title, setTitle] = useState(DEFAULT_ROOM_TITLE);
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'followers'>('public');
  const [allowGuestRequests, setAllowGuestRequests] = useState(true);
  const [allowViewerComments, setAllowViewerComments] = useState(true);
  const [allowGifts, setAllowGifts] = useState(true);
  const [hostApproval, setHostApproval] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<SetupTab>('format');

  const [cameraId, setCameraId] = useState('');
  const [micId, setMicId] = useState('');
  const [previewState, setPreviewState] = useState<PreviewState>('idle');
  const [previewHasVideo, setPreviewHasVideo] = useState(false);
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

  const stopPreview = () => {
    if (previewRef.current) {
      previewRef.current.stop();
      previewRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setPreviewHasVideo(false);
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
    if (videoRef.current) videoRef.current.srcObject = handle.stream;
    setPreviewState('ready');
    setPreviewKey((k) => k + 1);
  };

  const startPreview = async (opts?: {
    mode?: RoomMode;
    cameraId?: string;
    micId?: string;
  }) => {
    const targetMode = opts?.mode ?? effectiveMode;
    const targetCamera = opts?.cameraId ?? cameraId;
    const targetMic = opts?.micId ?? micId;
    setPreviewState('starting');
    previewRef.current?.stop();
    previewRef.current = null;

    const capture = (useSaved: boolean) =>
      startLocalMediaCapture({
        mode: targetMode,
        facingMode: 'user',
        cameraDeviceId: useSaved && targetCamera ? targetCamera : undefined,
        micDeviceId: useSaved && targetMic ? targetMic : undefined,
        quality: '720p',
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
        try {
          applyHandle(await capture(false));
          return;
        } catch {
          setPreviewState('error');
          return;
        }
      }
      setPreviewState('error');
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
    setTab('format');
    setMicMuted(false);
    setCameraId('');
    setMicId('');
    setPreviewState('idle');
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
        ? { mode: effectiveMode, cameraId: '', micId: '' }
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

  const validate = (): string | null => {
    const effectiveTitle = title.trim() || DEFAULT_ROOM_TITLE;
    if (effectiveTitle.length < 3) return 'Room title must be at least 3 characters.';
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

  const fieldClass =
    'mt-1.5 w-full rounded-xl border border-white/[0.09] bg-[#0B0E17] px-3.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/15';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#05070D] sm:bg-slate-950/85 sm:p-4 sm:backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="go-live-title"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative mx-auto flex h-[100dvh] w-full max-w-[1140px] flex-col outline-none sm:h-full sm:flex-row sm:gap-4"
      >
        {/* Camera stage */}
        <div className="theme-dark-stage relative h-full flex-1 overflow-hidden bg-[#05070D] sm:rounded-[32px] sm:border sm:border-white/[0.08]">
          {wantsVideo ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 h-full w-full -scale-x-100 object-cover transition-opacity ${
                previewHasVideo && previewState === 'ready' ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ) : null}

          {(!previewHasVideo || !wantsVideo) && (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(91,33,182,0.38),rgba(5,7,13,0.97)_70%)]">
              <div className="flex h-full flex-col items-center justify-start gap-2.5 px-8 pt-[18dvh] text-center sm:justify-center sm:pt-0">
                <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-violet-200 ring-1 ring-white/10 backdrop-blur-sm">
                  {wantsVideo ? <Video className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
                </span>
                <p className="text-sm font-semibold text-white">
                  {wantsVideo
                    ? previewState === 'starting'
                      ? 'Requesting camera & microphone…'
                      : 'Camera is off'
                    : 'Audio room — no camera needed'}
                </p>
                <p className="max-w-[300px] text-[11px] leading-relaxed text-white/65">
                  {wantsVideo
                    ? 'Allow access and your live camera feed will fill this stage.'
                    : 'Only your microphone is captured. Perfect for talk rooms.'}
                </p>
                {previewState !== 'starting' && (
                  <button
                    type="button"
                    onClick={() => void startPreview({ mode: effectiveMode })}
                    className="mt-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-white/25"
                  >
                    {wantsVideo ? 'Enable camera & mic' : 'Enable microphone'}
                  </button>
                )}
              </div>
            </div>
          )}

          {previewState === 'starting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Loader2 className="h-7 w-7 animate-spin text-fuchsia-300" />
            </div>
          )}

          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 via-black/25 to-transparent"
          />

          <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-5 sm:pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close Go Live modal"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-white/20 disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
            <h2
              id="go-live-title"
              className="min-w-0 truncate text-sm font-semibold tracking-tight text-white drop-shadow sm:text-base"
            >
              Start Live Room
            </h2>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMic}
                aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'}
                aria-pressed={micMuted}
                title={micMuted ? 'Unmute mic' : 'Mute mic'}
                className={`flex h-10 w-10 items-center justify-center rounded-full ring-1 backdrop-blur-md transition-colors ${
                  micMuted
                    ? 'bg-rose-500 text-white ring-rose-300/40'
                    : 'bg-white/10 text-white ring-white/15 hover:bg-white/20'
                }`}
              >
                {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => void startPreview({ mode: effectiveMode })}
                disabled={previewState === 'starting'}
                aria-label="Retry camera and microphone"
                title="Retry devices"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-white/20 disabled:opacity-40"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Setup sheet */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="absolute inset-x-0 bottom-0 z-30 flex max-h-[68dvh] flex-col overflow-hidden rounded-t-[28px] border-t border-white/[0.10] bg-[#101321] shadow-[0_-30px_90px_-30px_rgba(0,0,0,0.9)] sm:static sm:h-full sm:max-h-none sm:w-[400px] sm:shrink-0 sm:rounded-[32px] sm:border sm:border-white/[0.08] sm:shadow-none"
        >
          <div className="shrink-0 px-4 pb-3 pt-2.5 sm:px-5 sm:pt-5">
            <span
              aria-hidden="true"
              className="mx-auto mb-2.5 block h-1 w-10 rounded-full bg-white/15 sm:hidden"
            />
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white">Room setup</h3>
                <p className="truncate text-[10px] text-slate-500">{modeSummary}</p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-rose-300 ring-1 ring-rose-400/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                </span>
                Live
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-white/[0.05] p-1">
              {SETUP_TABS.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-pressed={active}
                    className={`flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      active ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5">
            {previewState === 'error' && (
              <div className="mb-3 flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] px-3.5 py-3">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] leading-relaxed text-amber-100">
                    Camera &amp; mic are off — you can still go live and turn them on
                    anytime from inside the room.
                  </p>
                  <button
                    type="button"
                    onClick={() => void startPreview({ mode: effectiveMode })}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/[0.14]"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry
                  </button>
                </div>
              </div>
            )}
            {tab === 'format' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        id: 'MULTI_GUEST',
                        label: 'Multi-Guest',
                        desc: '8–24 seats on stage',
                        icon: Users,
                      },
                      { id: 'VIDEO', label: 'Video Live', desc: 'Solo broadcast', icon: Video },
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
                        className={`relative rounded-2xl border p-3 text-left transition-colors ${
                          active
                            ? 'border-violet-400/50 bg-violet-500/15'
                            : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
                        }`}
                      >
                        {active && (
                          <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                            active ? 'bg-violet-500/20 text-violet-300' : 'bg-white/[0.06] text-slate-400'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="mt-2 block text-[12px] font-semibold text-white">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">
                          {item.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {mode === 'MULTI_GUEST' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Board
                      </span>
                      <span className="text-[10px] font-medium text-violet-300">
                        {board === 'AUDIO' ? 'Mic only' : 'Cam + mic'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.05] p-1">
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
                            className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              active
                                ? 'bg-violet-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {mode === 'MULTI_GUEST' && (
                  <div className="space-y-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Guest seats
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {SEAT_OPTIONS.map((option) => {
                        const active = seatCount === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setSeatCount(option)}
                            aria-pressed={active}
                            className={`rounded-xl border py-2 text-center transition-colors active:scale-[0.98] ${
                              active
                                ? 'border-violet-400/60 bg-violet-500/15 text-white'
                                : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-white'
                            }`}
                          >
                            <span className="block text-base font-bold leading-tight tabular-nums">
                              {option}
                            </span>
                            <span className="block text-[9px] font-medium uppercase tracking-wider opacity-70">
                              seats
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div aria-hidden="true" className="flex flex-wrap items-center gap-1">
                      <span className="h-3.5 w-6 rounded bg-gradient-to-br from-fuchsia-500 to-violet-600" />
                      {Array.from({ length: seatCount }).map((_, index) => (
                        <span
                          key={index}
                          className="h-3.5 w-6 rounded border border-white/[0.08] bg-white/[0.06]"
                        />
                      ))}
                      <span className="ml-1.5 text-[10px] text-slate-500">Host + {seatCount}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Category
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectableCategories.map((item) => {
                      const active = category === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setCategory(item)}
                          aria-pressed={active}
                          className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                            active
                              ? 'border-violet-400/60 bg-violet-500/15 text-white'
                              : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {tab === 'details' && (
              <div className="space-y-3.5">
                <label className="block">
                  <span className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-300">Title</span>
                    <span className="text-[10px] tabular-nums text-slate-500">
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
                    className={`${fieldClass} h-11`}
                  />
                </label>
                <label className="block">
                  <span className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-300">Description</span>
                    <span className="text-[10px] tabular-nums text-slate-500">
                      {description.length}/400
                    </span>
                  </span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={400}
                    rows={4}
                    placeholder="Tell viewers what to expect (optional)"
                    className={`${fieldClass} min-h-[96px] resize-none py-2.5`}
                  />
                </label>
              </div>
            )}

            {tab === 'access' && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrivacy('public')}
                    aria-pressed={privacy === 'public'}
                    className={`rounded-2xl border p-3 text-left transition-colors ${
                      privacy === 'public'
                        ? 'border-emerald-400/50 bg-emerald-500/10'
                        : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                        privacy === 'public'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-white/[0.06] text-slate-400'
                      }`}
                    >
                      <Globe className="h-4 w-4" />
                    </span>
                    <span className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-white">
                      Public
                      {privacy === 'public' && <Check className="h-3.5 w-3.5 text-emerald-300" />}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">
                      Listed on Discover for everyone.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrivacy('followers')}
                    aria-pressed={privacy === 'followers'}
                    className={`rounded-2xl border p-3 text-left transition-colors ${
                      privacy === 'followers'
                        ? 'border-violet-400/50 bg-violet-500/10'
                        : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                        privacy === 'followers'
                          ? 'bg-violet-500/15 text-violet-300'
                          : 'bg-white/[0.06] text-slate-400'
                      }`}
                    >
                      <Lock className="h-4 w-4" />
                    </span>
                    <span className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-white">
                      Followers only
                      {privacy === 'followers' && (
                        <Check className="h-3.5 w-3.5 text-violet-300" />
                      )}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">
                      Hidden from Discover; followers can open it.
                    </span>
                  </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] px-3.5 divide-y divide-white/[0.05]">
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
            )}
          </div>

          <div className="shrink-0 border-t border-white/[0.08] px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 sm:px-5 sm:pb-5">
            {formError && (
              <p
                role="alert"
                className="mb-2.5 flex items-start gap-1.5 rounded-xl border border-rose-400/30 bg-rose-500/[0.08] px-3 py-2 text-[11px] leading-relaxed text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{formError}</span>
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-600 to-sky-500 text-sm font-bold text-white shadow-[0_18px_44px_-18px_rgba(139,92,246,0.95)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Radio className="h-4 w-4" />
              )}
              <span>{submitting ? 'Starting…' : 'Go Live'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
