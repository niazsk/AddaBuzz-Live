import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { UserProfile } from '../../types/app';
import { isBdAgentProfile } from '../../lib/firestoreService';

interface AgentPromoteViewProps {
  currentUser: UserProfile | null;
  users: UserProfile[];
  onPromoteUser: (target: UserProfile, afterType: 'AGENT' | 'SUPER_AGENT') => void;
  onBack: () => void;
  isOffline: boolean;
}

export const AgentPromoteView: React.FC<AgentPromoteViewProps> = ({
  currentUser,
  users,
  onPromoteUser,
  onBack,
  isOffline,
}) => {
  const isBdAgent = isBdAgentProfile(currentUser);
  const isSuperAgent = currentUser?.accountType === 'SUPER_AGENT';
  const [promoteId, setPromoteId] = useState('');
  const [promoteMsg, setPromoteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handlePromoteById = (afterType: 'AGENT' | 'SUPER_AGENT') => {
    const id = promoteId.trim();
    if (!id) {
      setPromoteMsg({ ok: false, text: 'Enter a user ID first.' });
      return;
    }
    const target = users.find((u) => u.platformId === id);
    if (!target) {
      setPromoteMsg({ ok: false, text: `No account found with ID ${id}.` });
      return;
    }
    if (target.accountType !== 'USER') {
      setPromoteMsg({
        ok: false,
        text: `ID ${id} is already ${target.accountType}. Only USER accounts can be promoted.`,
      });
      return;
    }
    if (afterType === 'SUPER_AGENT' && !isBdAgent) {
      setPromoteMsg({
        ok: false,
        text: 'Only the main BD Agent can promote a USER to BD Agent.',
      });
      return;
    }
    onPromoteUser(target, afterType);
    const roleLabel = afterType === 'SUPER_AGENT' ? 'BD Agent' : 'Agent';
    setPromoteMsg({ ok: true, text: `ID ${id} (${target.displayName}) is now a ${roleLabel}.` });
    setPromoteId('');
  };

  return (
    <div className="space-y-6 pb-8">
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
          <UserPlus className="w-5 h-5 text-violet-400" />
          <h1 className="font-display text-lg font-semibold text-white">
            Agent Promote
          </h1>
        </div>
      </div>

      {/* Promote Section */}
      <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-violet-400" />
            <h2 className="font-display text-base font-semibold text-white">
              Promote User by ID
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Your Role:{' '}
            <strong className="font-mono text-white">
              {isBdAgent ? 'BD_AGENT' : currentUser?.accountType}
            </strong>
          </span>
        </div>

        {/* Info banner */}
        <div className="rounded-xl bg-violet-500/10 border border-violet-500/25 px-4 py-3 text-xs text-violet-200 leading-relaxed">
          {isBdAgent
            ? 'As the main BD Agent you can promote a USER to BD Agent or Agent. Enter the user\'s platform ID below and choose the target role.'
            : 'As a BD Agent you can promote a USER to Agent only. Only the main BD Agent can create new BD Agents.'}
        </div>

        <div className="space-y-3">
          {/* User ID input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 px-1">
              User Platform ID
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={promoteId}
              onChange={(e) => {
                setPromoteId(e.target.value);
                setPromoteMsg(null);
              }}
              placeholder="Enter User ID (e.g. 112201)"
              aria-label="User ID to promote"
              className="w-full h-12 px-4 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-violet-500/60 focus:outline-none text-sm text-white placeholder:text-slate-500 font-mono transition-colors"
            />
          </div>

          {/* Action buttons */}
          <div className={`grid gap-3 ${isBdAgent ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {isBdAgent && (
              <button
                type="button"
                disabled={isOffline}
                onClick={() => handlePromoteById('SUPER_AGENT')}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-45 disabled:cursor-not-allowed text-sm font-semibold text-[#1A1206] inline-flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>BD Agent</span>
              </button>
            )}
            <button
              type="button"
              disabled={!isSuperAgent || isOffline}
              onClick={() => handlePromoteById('AGENT')}
              className="w-full px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.06] disabled:text-slate-500 disabled:cursor-not-allowed text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Agent</span>
            </button>
          </div>

          {/* Result message */}
          {promoteMsg && (
            <div
              className={`rounded-xl px-4 py-3 text-xs font-medium ${
                promoteMsg.ok
                  ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/25 text-rose-300'
              }`}
            >
              {promoteMsg.text}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-3">
        <h2 className="font-display text-sm font-semibold text-white">
          How Promotion Works
        </h2>
        <div className="space-y-2.5 text-xs text-slate-400 leading-relaxed">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
            <p>
              <strong className="text-white">Main BD Agent → BD Agent:</strong>{' '}
              The main BD Agent can promote any USER to BD Agent, granting them full agency management rights.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
            <p>
              <strong className="text-white">BD Agent → Agent:</strong>{' '}
              A BD Agent can promote any USER to Agent. BD Agents cannot create other BD Agents.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
            <p>
              <strong className="text-white">Audit Trail:</strong>{' '}
              Every promotion is recorded with an immutable audit entry including timestamp, actor, and target.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
