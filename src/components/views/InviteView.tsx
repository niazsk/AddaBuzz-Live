import React, { useState } from 'react';
import { ArrowLeft, Users, Copy, Check, Share2, Sparkles, Gift, QrCode } from 'lucide-react';
import { UserProfile } from '../../types/app';

interface InviteViewProps {
  currentUser: UserProfile | null;
  onBack: () => void;
}

export const InviteView: React.FC<InviteViewProps> = ({ currentUser, onBack }) => {
  const [copied, setCopied] = useState(false);
  const inviteCode = currentUser?.platformId ?? 'ADDA777';
  const inviteUrl = `${window.location.origin}/?ref=${inviteCode}`;

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
          text: `Use my invite code ${inviteCode} to join AddaBuzz Live and get bonus coins!`,
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
          <h2 className="font-display text-xl font-bold text-white">
            Invite Friends, Get 5,000 Coins
          </h2>
          <p className="text-xs text-slate-300 max-w-sm mx-auto">
            Share your unique invite code with friends. When they sign up, both of you get rewards instantly!
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

      {/* Rewards Milestones */}
      <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-4">
        <h3 className="font-display text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Invite Rewards Milestone</span>
        </h3>
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <p className="font-mono text-base font-bold text-amber-400">1 Friend</p>
            <p className="text-[11px] text-slate-300">5,000 Coins</p>
            <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">Starter</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <p className="font-mono text-base font-bold text-amber-400">5 Friends</p>
            <p className="text-[11px] text-slate-300">30,000 Coins</p>
            <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-medium">Popular</span>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <p className="font-mono text-base font-bold text-amber-400">10 Friends</p>
            <p className="text-[11px] text-slate-300">80,000 Coins</p>
            <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-400 font-medium">VIP Tier</span>
          </div>
        </div>
      </section>
    </div>
  );
};
