import React, { useState } from 'react';
import { Mic, Radio, Users, Video, X } from 'lucide-react';
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
    isPrivateFollowersOnly: boolean;
  }) => void;
}

export const GoLiveModal: React.FC<GoLiveModalProps> = ({
  open,
  onClose,
  onStartLiveRoom,
}) => {
  const [mode, setMode] = useState<RoomMode>('MULTI_GUEST');
  const [category, setCategory] = useState<Exclude<RoomCategory, 'All'>>('Music');
  const [consentMicCam, setConsentMicCam] = useState(true);

  if (!open) return null;

  const selectableCategories = ROOM_CATEGORIES.filter(
    (c): c is Exclude<RoomCategory, 'All'> => c !== 'All'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentMicCam) return;
    onStartLiveRoom({
      title: 'Late-Night Adda & Open Stage',
      description:
        'Welcome to the room — grab one of 8 guest seats or drop a comment.',
      category,
      mode,
      isPrivateFollowersOnly: false,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="go-live-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#111420] border border-white/12 overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 id="go-live-title" className="font-display text-lg font-bold text-white">
              Start Live Room
            </h2>
            <p className="text-xs text-slate-400">
              Pick a mode and go live — viewers can watch in real time.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Go Live modal"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Room Mode</span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'VIDEO', label: 'Video Live', icon: Video },
                  { id: 'AUDIO', label: 'Audio Live', icon: Mic },
                  { id: 'MULTI_GUEST', label: 'Multi-Guest (8)', icon: Users },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${
                      active
                        ? 'bg-violet-600/20 border-violet-500 text-white'
                        : 'bg-[#090B12] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-sky-400" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Category</span>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as Exclude<RoomCategory, 'All'>)
              }
              className="w-full h-10 px-3 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
            >
              {selectableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentMicCam}
              onChange={(e) => setConsentMicCam(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-violet-600 rounded"
            />
            <span className="text-xs text-slate-300 leading-relaxed">
              I grant microphone{mode !== 'AUDIO' ? ' and camera' : ''} permission for live streaming and agree to AddaBuzz Live community safety guidelines.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-xs font-medium text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!consentMicCam}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-45 text-xs font-semibold text-white inline-flex items-center gap-2"
            >
              <Radio className="w-4 h-4" />
              <span>Go Live</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
