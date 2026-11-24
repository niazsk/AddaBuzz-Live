import React, { useState } from 'react';
import { Check, Mic, Radio, Sparkles, Users, Video, X } from 'lucide-react';
import { RoomCategory, RoomMode } from '../../types/app';
import { ROOM_CATEGORIES } from '../../data/previewData';

interface GoLiveModalProps {
  open: boolean;
  onClose: () => void;
  onStartLiveRoom: (payload: {
    title: string;
    description: string;
    category: Exclude<RoomCategory, 'All'>;
    mode: RoomMode;
    seatCount: number;
    isPrivateFollowersOnly: boolean;
  }) => void;
}

const SEAT_OPTIONS = [8, 12, 16, 24] as const;

export const GoLiveModal: React.FC<GoLiveModalProps> = ({
  open,
  onClose,
  onStartLiveRoom,
}) => {
  const [mode, setMode] = useState<'VIDEO' | 'MULTI_GUEST'>('MULTI_GUEST');
  const [board, setBoard] = useState<'VIDEO' | 'AUDIO'>('VIDEO');
  const [category, setCategory] = useState<Exclude<RoomCategory, 'All'>>('Music');
  const [seatCount, setSeatCount] = useState<number>(8);
  const [title, setTitle] = useState('Late-Night Adda & Open Stage');
  const [consentMicCam, setConsentMicCam] = useState(true);

  if (!open) return null;

  const selectableCategories = ROOM_CATEGORIES.filter(
    (c): c is Exclude<RoomCategory, 'All'> => c !== 'All'
  );

  const effectiveMode: RoomMode =
    mode === 'VIDEO' ? 'VIDEO' : board === 'AUDIO' ? 'AUDIO' : 'MULTI_GUEST';

  const modeSummary =
    effectiveMode === 'AUDIO'
      ? 'Audio board · mic only'
      : effectiveMode === 'MULTI_GUEST'
        ? `Video board · ${seatCount} guest seats`
        : 'Solo video broadcast';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentMicCam) return;
    const capacity = mode === 'MULTI_GUEST' ? seatCount : 8;
    onStartLiveRoom({
      title: title.trim() || 'Live Room',
      description:
        effectiveMode === 'AUDIO'
          ? `Welcome to the audio room — grab one of ${capacity} guest seats or drop a comment.`
          : effectiveMode === 'MULTI_GUEST'
            ? `Welcome to the room — grab one of ${capacity} guest seats or drop a comment.`
            : 'Welcome to the room — drop a comment and show some love.',
      category,
      mode: effectiveMode,
      seatCount: capacity,
      isPrivateFollowersOnly: false,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="go-live-title"
    >
      <div className="relative w-full sm:max-w-lg max-h-[94dvh] flex flex-col overflow-hidden rounded-t-[28px] sm:rounded-3xl border border-white/10 bg-[#0C0E17]/95 shadow-[0_30px_90px_-24px_rgba(0,0,0,0.95)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[28px] sm:rounded-3xl"
        >
          <div className="absolute -top-24 left-1/2 h-56 w-[130%] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600/25 via-fuchsia-500/15 to-sky-500/25 blur-3xl" />
        </div>
        <div
          aria-hidden="true"
          className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-violet-400/60 to-transparent"
        />

        <div className="relative flex items-center gap-3 px-5 sm:px-6 pt-5 pb-4 shrink-0">
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
              Set the stage, pick your vibe and go live.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Go Live modal"
            className="ml-auto p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-5 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                    ? 'Audio-only seats — microphone on, no camera.'
                    : 'Seats stream live camera and microphone.'}
                </p>
              </div>
            )}

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
                placeholder="Give your room a catchy title"
                className="mt-2 w-full h-11 px-3.5 rounded-2xl bg-[#090B12] border border-white/[0.09] text-sm text-white placeholder:text-slate-500 transition-colors focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
              />
            </label>

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
              <span className="text-xs font-medium text-slate-300">Category</span>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

            <label
              className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition-colors ${
                consentMicCam
                  ? 'border-emerald-400/25 bg-emerald-500/[0.06]'
                  : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15'
              }`}
            >
              <input
                type="checkbox"
                checked={consentMicCam}
                onChange={(e) => setConsentMicCam(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400/50 ${
                  consentMicCam
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white'
                    : 'border-white/25 text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs text-slate-300 leading-relaxed">
                I grant microphone{effectiveMode !== 'AUDIO' ? ' and camera' : ''} permission for
                live streaming and agree to AddaBuzz Live community safety guidelines.
              </span>
            </label>
          </div>

          <div className="shrink-0 border-t border-white/[0.06] bg-[#0A0C13]/85 backdrop-blur-md px-5 sm:px-6 py-4 space-y-3">
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
                className="flex-1 h-12 rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] text-xs font-medium text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!consentMicCam}
                className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-500 hover:from-violet-500 hover:via-fuchsia-500 hover:to-sky-400 disabled:opacity-40 disabled:shadow-none text-sm font-semibold text-white inline-flex items-center justify-center gap-2 shadow-[0_16px_40px_-16px_rgba(139,92,246,0.95)] transition-all active:scale-[0.99]"
              >
                <Radio className="w-4 h-4" />
                <span>Go Live</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
