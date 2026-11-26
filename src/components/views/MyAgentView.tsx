import React, { useState } from 'react';
import {
  ArrowLeft,
  Users,
  Search,
  BadgeCheck,
  CheckCircle2,
  Send,
  AlertCircle,
} from 'lucide-react';
import { UserProfile } from '../../types/app';
import {
  updateOwnProfile,
  fetchUserProfile,
} from '../../lib/firestoreService';
import { Avatar } from '../ui/Avatar';

interface MyAgentViewProps {
  currentUser: UserProfile | null;
  users: UserProfile[];
  onBack: () => void;
  onToast?: (
    title: string,
    desc?: string,
    tone?: 'info' | 'success' | 'warning' | 'error'
  ) => void;
}

export const MyAgentView: React.FC<MyAgentViewProps> = ({
  currentUser,
  users,
  onBack,
  onToast,
}) => {
  const [agentId, setAgentId] = useState('');
  const [resolvedAgent, setResolvedAgent] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentAgent = users.find(
    (u) => u.superAgentUid === currentUser?.uid || u.hostAgencyUid === currentUser?.uid
  );

  const resolveAgent = async (idOrUsername: string) => {
    if (!idOrUsername.trim()) {
      setResolvedAgent(null);
      setError(null);
      return;
    }
    try {
      const profile = await fetchUserProfile(idOrUsername.trim());
      if (!profile) {
        setResolvedAgent(null);
        setError('Agent not found with this ID or username.');
        return;
      }
      if (
        profile.accountType !== 'AGENT' &&
        profile.accountType !== 'SUPER_AGENT' &&
        profile.isHost !== true
      ) {
        setResolvedAgent(null);
        setError('This user is not an Agent, Super Agent, or Host.');
        return;
      }
      setResolvedAgent(profile);
      setError(null);
    } catch {
      setResolvedAgent(null);
      setError('Could not look up this agent.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onToast?.('Sign in required', 'Please sign in to set your agent.', 'warning');
      return;
    }
    if (!resolvedAgent) {
      onToast?.('Select Agent', 'Please look up and select a valid Agent, Super Agent or Host.', 'warning');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const updates: Record<string, unknown> = {
        superAgentUid: resolvedAgent.uid,
        updatedAt: Date.now(),
      };
      if (resolvedAgent.isHost) {
        updates.hostAgencyUid = resolvedAgent.uid;
      }
      await updateOwnProfile(currentUser.uid, updates as any);
      onToast?.(
        'Agent Set',
        `Your ${resolvedAgent.isHost ? 'Host' : 'Agent'} (@${resolvedAgent.username}) has been added.`,
        'success'
      );
      setAgentId('');
      setResolvedAgent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set agent.');
      onToast?.(
        'Failed to set agent',
        err instanceof Error ? err.message : 'Could not complete the request.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearAgent = async () => {
    if (!currentUser) return;
    try {
      await updateOwnProfile(currentUser.uid, {
        displayName: currentUser.displayName,
        bio: currentUser.bio,
        country: currentUser.country,
        gender: currentUser.gender,
        showPresence: currentUser.showPresence,
        superAgentUid: '',
        hostAgencyUid: '',
      } as any);
      setResolvedAgent(null);
      setError(null);
      onToast?.('Agent Removed', 'Your agent/host has been removed.', 'success');
    } catch (err) {
      onToast?.(
        'Remove Failed',
        err instanceof Error ? err.message : 'Could not remove agent.',
        'error'
      );
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto">
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
          <h1 className="font-display text-lg font-bold text-white">My Agent</h1>
        </div>
      </div>

      {/* Current agent info */}
      {currentAgent && (
        <div className="rounded-3xl bg-emerald-500/10 border border-emerald-500/20 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4 text-emerald-400" />
              <span>Your Current Agent</span>
            </span>
            <button
              type="button"
              onClick={clearAgent}
              className="text-xs text-rose-400 hover:text-rose-300 underline underline-offset-2"
            >
              Remove
            </button>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0B0D14] border border-white/[0.06]">
            <Avatar
              name={currentAgent.displayName}
              src={currentAgent.avatarUrl}
              color={currentAgent.avatarColor}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {currentAgent.displayName}
              </p>
              <p className="text-xs text-slate-400 font-mono">
                ID: {currentAgent.platformId} • @{currentAgent.username}
              </p>
              <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase bg-emerald-500/20 text-emerald-300">
                {currentAgent.isHost ? 'Host' : currentAgent.accountType === 'SUPER_AGENT' ? 'Super Agent' : 'Agent'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add new agent */}
      <form onSubmit={handleSubmit} className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-4">
        <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
          <Search className="w-4 h-4 text-fuchsia-400" />
          <span>Set Your Agent / Super Agent / Host</span>
        </h2>

        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-medium block">
            Agent ID or Username
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={agentId}
              onChange={(e) => {
                setAgentId(e.target.value);
                setResolvedAgent(null);
                setError(null);
              }}
              onBlur={() => resolveAgent(agentId)}
              placeholder="Enter agent ID or @username..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-fuchsia-500/60 focus:outline-none text-base text-white placeholder:text-slate-600"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-xs text-rose-300">{error}</span>
            </div>
          )}
        </div>

        {resolvedAgent && (
          <div className="p-3 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Avatar
                name={resolvedAgent.displayName}
                src={resolvedAgent.avatarUrl}
                color={resolvedAgent.avatarColor}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{resolvedAgent.displayName}</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  ID: {resolvedAgent.platformId} • @{resolvedAgent.username}
                </p>
              </div>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase bg-fuchsia-500/20 text-fuchsia-300">
              {resolvedAgent.isHost ? 'Host' : resolvedAgent.accountType === 'SUPER_AGENT' ? 'Super Agent' : 'Agent'}
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !resolvedAgent}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-rose-600 hover:from-fuchsia-400 hover:to-rose-500 disabled:opacity-50 text-sm font-bold text-white transition-all shadow-lg shadow-fuchsia-500/20 active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span>{isSubmitting ? 'Adding Agent...' : 'Add Agent / Host'}</span>
        </button>
      </form>

      <p className="text-center text-xs text-slate-500">
        Only Agents, Super Agents and Hosts can be added. Ask your agent for their ID.
      </p>
    </div>
  );
};
