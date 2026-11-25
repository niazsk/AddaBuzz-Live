import React, { useState } from 'react';
import { ArrowLeft, Users, Copy, Check, Share2, Sparkles, Gift, Info } from 'lucide-react';
import { UserProfile } from '../../types/app';

interface InviteViewProps {
  currentUser: UserProfile | null;
  onBack: () => void;
}

export const InviteView: React.FC<InviteViewProps> = ({ currentUser, onBack }) => {
  const [copied, setCopied] = useState(false);
  const inviteCode = currentUser?.platformId ?? '';
  const inviteUrl = `${window.location.origin}${window.location.pathname}?ref=${inviteCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on AddaBuzz Live!',
          text: `Join me on AddaBuzz Live — my invite code is ${inviteCode}.`,
          url: inviteUrl,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to profile"
          className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 flex items-center justify-center text-white transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-fuchsia-400" />
          <h1 className="font-display text-lg font-bold text-white">Invite Friends & Earn</h1>
        </div>
      </div>

      {/* Main Promotion Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600/30 via-[#111420] to-violet-600/20 border border-fuchsia-500/30 p-6 space-y-5 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-violet-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
          <Gift className="w-8 h-8 text-white" />
        </div>

        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold text-white">Invite Your Friends</h2>
          <p className="text-xs text-slate-300 max-w-sm mx-auto">
            Share your unique invite code so friends can find you on AddaBuzz Live.
          </p>
        </div>

        {/* Code Display */}
        <div className="p-4 rounded-2xl bg-[#0B0D14]/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Your Referral Code
            </span>
            <p className="font-mono text-2xl font-black text-amber-400 tracking-wider">
              {inviteCode}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-violet-600/30"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-sm font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-fuchsia-600/25 active:scale-[0.99]"
        >
          <Share2 className="w-4 h-4" />
          <span>Share Invite Link</span>
        </button>
      </div>

      {/* Referral status */}
      <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-3">
        <h3 className="font-display text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Referral Status</span>
        </h3>
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/[0.07] border border-amber-500/20 p-3">
          <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Invite rewards are not enabled yet, so no coins are credited for referrals at this
            time. Sharing your code helps friends find you, but the app does not currently track
            who joined through your link.
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-6 text-center">
          <Users className="w-6 h-6 text-slate-500 mx-auto" />
          <p className="mt-2 text-xs font-medium text-slate-200">No referral history yet</p>
          <p className="mt-1 text-[11px] text-slate-500 max-w-sm mx-auto">
            Referrals will be listed here if the referral tracking backend is enabled in the
            future.
          </p>
        </div>
      </section>
    </div>
  );
};
