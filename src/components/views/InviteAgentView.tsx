import React, { useState } from 'react';
import { ArrowLeft, UserPlus, Copy, Check, Share2, ShieldCheck, Briefcase, Award } from 'lucide-react';
import { UserProfile } from '../../types/app';

interface InviteAgentViewProps {
  currentUser: UserProfile | null;
  onBack: () => void;
}

export const InviteAgentView: React.FC<InviteAgentViewProps> = ({ currentUser, onBack }) => {
  const [copied, setCopied] = useState(false);
  const agencyCode = currentUser?.platformId ?? 'AGENCY888';
  const agencyInviteUrl = `${window.location.origin}/?agent_ref=${agencyCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(agencyInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join AddaBuzz Live Agency Network!',
          text: `Join AddaBuzz Live as a creator/sub-agent under Agency ID ${agencyCode} and unlock premium commission rewards!`,
          url: agencyInviteUrl,
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
          <UserPlus className="w-5 h-5 text-amber-400" />
          <h1 className="font-display text-lg font-bold text-white">Invite Agent / Host</h1>
        </div>
      </div>

      {/* Main Agency Invite Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-500/20 via-[#111420] to-orange-500/10 border border-amber-500/20 p-6 space-y-5 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-[#111420]">
          <Briefcase className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold text-white">
            Expand Your Agency Network
          </h2>
          <p className="text-xs text-slate-300 max-w-sm mx-auto">
            Recruit sub-agents and top livestream creators under your official agency ID and earn recurring revenue commissions.
          </p>
        </div>

        {/* Agency Code Box */}
        <div className="p-4 rounded-2xl bg-[#0B0D14]/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Your Agency ID
            </span>
            <p className="font-mono text-2xl font-black text-amber-400 tracking-wider">
              {agencyCode}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-[#111420] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-amber-500/20"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Agency Link</span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-sm font-bold text-[#111420] flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99]"
        >
          <Share2 className="w-4 h-4" />
          <span>Share Agency Recruitment Link</span>
        </button>
      </div>

      {/* Agency Benefits */}
      <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-3">
        <h3 className="font-display text-sm font-semibold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Agency Commission Program</span>
        </h3>
        <div className="space-y-2.5 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
            <span>Direct Creator Commission</span>
            <strong className="font-mono text-emerald-400 text-sm">15% - 25%</strong>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
            <span>Sub-Agent Network Override</span>
            <strong className="font-mono text-sky-400 text-sm">5% - 8%</strong>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
            <span>Monthly Target Bonus</span>
            <strong className="font-mono text-amber-400 text-sm">Up to 200,000 Coins</strong>
          </div>
        </div>
      </section>
    </div>
  );
};
