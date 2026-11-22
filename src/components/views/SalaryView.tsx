import React, { useState } from 'react';
import {
  ArrowLeft,
  Gem,
  Send,
  ShieldCheck,
  CheckCircle2,
  Users,
  Search,
  BadgeCheck,
  Sparkles,
} from 'lucide-react';
import { UserProfile, WalletTransaction } from '../../types/app';
import { isBdAgentProfile, withdrawDiamondsToAgent, withdrawDiamondsToSelf } from '../../lib/firestoreService';
import { Avatar } from '../ui/Avatar';

interface SalaryViewProps {
  currentUser: UserProfile | null;
  diamondBalance: number;
  users: UserProfile[];
  transactions?: WalletTransaction[];
  onBack: () => void;
  onToast?: (title: string, desc?: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const SalaryView: React.FC<SalaryViewProps> = ({
  currentUser,
  diamondBalance,
  users,
  transactions = [],
  onBack,
  onToast,
}) => {
  const isAgencyUser = Boolean(
    currentUser &&
      (currentUser.accountType === 'AGENT' ||
        currentUser.accountType === 'SUPER_AGENT' ||
        isBdAgentProfile(currentUser))
  );

  const [mode, setMode] = useState<'SELF' | 'AGENT'>(isAgencyUser ? 'SELF' : 'AGENT');
  const [selectedAgent, setSelectedAgent] = useState<UserProfile | null>(null);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    diamonds: number;
    agentName: string;
    agentId: string;
    self: boolean;
    credited?: number;
  } | null>(null);

  // Eligible withdrawal targets: Super Agents and Agents only (excluding self)
  const eligibleAgents = users.filter((u) => {
    if (!currentUser) return false;
    if (u.uid === currentUser.uid) return false;
    return (
      u.accountType === 'AGENT' ||
      u.accountType === 'SUPER_AGENT' ||
      isBdAgentProfile(u)
    );
  });

  const filteredAgents = eligibleAgents.filter((a) => {
    if (!recipientSearch.trim()) return true;
    const q = recipientSearch.toLowerCase();
    return (
      a.displayName.toLowerCase().includes(q) ||
      a.username.toLowerCase().includes(q) ||
      a.platformId.includes(q)
    );
  });

  const parsedAmount = Math.max(0, parseInt(amount, 10) || 0);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onToast?.('Sign in required', 'Please sign in to withdraw diamonds.', 'warning');
      return;
    }

    if (mode === 'AGENT' && !selectedAgent) {
      onToast?.('Select Agent', 'Please select a Super Agent or Agent to receive withdrawal.', 'warning');
      return;
    }

    if (parsedAmount < 100000) {
      onToast?.('Minimum Amount', 'Minimum withdrawal is 100,000 Diamonds.', 'warning');
      return;
    }

    if (parsedAmount > diamondBalance) {
      onToast?.('Insufficient Diamonds', 'You do not have enough diamonds in your balance.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'SELF') {
        const result = await withdrawDiamondsToSelf(currentUser, parsedAmount);
        setSuccessData({
          diamonds: parsedAmount,
          agentName: 'Your Trading Balance',
          agentId: currentUser.platformId,
          self: true,
          credited: result.tradingCoinsCredited,
        });
        onToast?.(
          'Diamonds Withdrawn Successfully!',
          `${result.tradingCoinsCredited.toLocaleString()} coins added to your Trading Balance (10% fee).`,
          'success'
        );
      } else {
        await withdrawDiamondsToAgent(currentUser, selectedAgent!, parsedAmount);
        setSuccessData({
          diamonds: parsedAmount,
          agentName: selectedAgent!.displayName,
          agentId: selectedAgent!.platformId,
          self: false,
        });
        onToast?.(
          'Diamonds Withdrawn Successfully!',
          `Transferred ${parsedAmount.toLocaleString()} Diamonds to @${selectedAgent!.username}.`,
          'success'
        );
      }
      setAmount('');
    } catch (err) {
      onToast?.(
        'Withdrawal Failed',
        err instanceof Error ? err.message : 'Unable to complete diamonds withdrawal.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const diamondWithdrawals = transactions
    .filter((t) => t.currency === 'DIAMOND' && t.direction === 'DEBIT' && t.reason.toLowerCase().includes('withdraw'))
    .slice(0, 10);

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
          <Gem className="w-5 h-5 text-sky-400" />
          <h1 className="font-display text-lg font-bold text-white">Salary & Diamonds Withdraw</h1>
        </div>
      </div>

      {/* Available Diamonds Overview */}
      <div className="rounded-3xl bg-gradient-to-br from-sky-500/20 via-[#111420] to-violet-600/10 border border-sky-500/20 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Gem className="w-4 h-4 text-sky-400" />
            <span>Available Diamonds</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Agency Settlement</span>
          </span>
        </div>

        <div className="space-y-1">
          <p className="font-mono text-3xl font-black text-sky-400 tabular-nums">
            {diamondBalance.toLocaleString()} <span className="text-sm font-normal text-slate-300 font-sans">Diamonds</span>
          </p>
          <p className="text-xs text-slate-400">
            Diamonds are withdrawable to authorized Super Agents and Agents. Super Agents & Agents can also withdraw to their own Trading Balance (10% fee).
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {successData ? (
        <div className="rounded-3xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-display text-base font-bold text-white">Withdrawal Complete</h3>
          <p className="text-xs text-slate-300">
            {successData.self ? (
              <>
                <span className="font-mono text-sky-400 font-bold">{successData.diamonds.toLocaleString()} Diamonds</span> withdrawn to your own ID (10% fee).{' '}
                <span className="font-mono text-emerald-400 font-bold">{(successData.credited ?? 0).toLocaleString()} coins</span> added to your Coins Trading Balance.
              </>
            ) : (
              <>
                Successfully transferred <span className="font-mono text-sky-400 font-bold">{successData.diamonds.toLocaleString()} Diamonds</span> to {successData.agentName} (ID: {successData.agentId}). Coins have been credited to their agency trading balance.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => setSuccessData(null)}
            className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-white"
          >
            Submit Another Withdrawal
          </button>
        </div>
      ) : (
        /* Withdrawal Form */
        <form onSubmit={handleWithdrawSubmit} className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-4">
          <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-sky-400" />
            <span>{mode === 'SELF' ? 'Withdraw to My Trading Balance' : 'Select Target Super Agent / Agent'}</span>
          </h2>

          {isAgencyUser && (
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0B0D14] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setMode('SELF')}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                  mode === 'SELF' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                To My ID (10% fee)
              </button>
              <button
                type="button"
                onClick={() => setMode('AGENT')}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                  mode === 'AGENT' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                To Another Agent
              </button>
            </div>
          )}

          {mode === 'SELF' ? (
            <div className="p-3.5 rounded-xl bg-sky-500/[0.07] border border-sky-500/20 text-xs text-slate-300 space-y-1.5">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-sky-400" />
                <span>Withdraw to your own ID ({currentUser?.platformId})</span>
              </p>
              <p>A 10% fee applies — the remaining coins are added to your Coins Trading Balance.</p>
              {parsedAmount > 0 && (
                <p className="font-mono text-sky-400 font-bold">
                  You receive: {Math.floor(parsedAmount * 0.9).toLocaleString()} coins
                </p>
              )}
            </div>
          ) : (
          /* Agent Picker / Search */
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                placeholder="Search agent by name, username or ID..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-sky-500/60 focus:outline-none text-xs text-white placeholder:text-slate-500"
              />
            </div>

            {/* List of Agents */}
            <div className="max-h-48 overflow-y-auto rounded-xl border border-white/[0.06] divide-y divide-white/[0.04] bg-[#0B0D14]">
              {filteredAgents.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No registered Super Agents or Agents found.
                </div>
              ) : (
                filteredAgents.map((agent) => {
                  const isSelected = selectedAgent?.uid === agent.uid;
                  const isSuper = agent.accountType === 'SUPER_AGENT';
                  return (
                    <button
                      key={agent.uid}
                      type="button"
                      onClick={() => setSelectedAgent(agent)}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                        isSelected
                          ? 'bg-sky-500/15 border-l-2 border-sky-400'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <Avatar name={agent.displayName} src={agent.avatarUrl} color={agent.avatarColor} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-white truncate">{agent.displayName}</p>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              isSuper ? 'bg-amber-500/20 text-amber-300' : 'bg-violet-500/20 text-violet-300'
                            }`}
                          >
                            {isSuper ? 'Super Agent' : 'Agent'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          ID: {agent.platformId} • @{agent.username}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {selectedAgent && (
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between text-xs">
                <span className="text-slate-300">Selected Recipient:</span>
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-sky-400" />
                  <span>{selectedAgent.displayName} (@{selectedAgent.username})</span>
                </span>
              </div>
            )}
          </div>
          )}

          {/* Amount input */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400 font-medium">Diamonds Amount</label>
              <span className="text-[11px] text-slate-500">Min: 100,000 Diamonds</span>
            </div>
            <div className="relative">
              <Gem className="w-5 h-5 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min="100000"
                max={diamondBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter diamond amount to withdraw"
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-sky-500/60 focus:outline-none text-base font-mono font-bold text-white placeholder:text-slate-600"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[100000, 250000, 500000, 1000000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt.toString())}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-mono text-slate-300 transition-colors"
                >
                  +{amt.toLocaleString()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(diamondBalance.toString())}
                className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-xs font-mono font-bold text-sky-400 transition-colors"
              >
                MAX
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (mode === 'AGENT' && !selectedAgent) || parsedAmount <= 0 || parsedAmount > diamondBalance}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-sm font-bold text-white transition-all shadow-lg shadow-sky-500/20 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Processing Withdrawal...' : `Withdraw ${parsedAmount.toLocaleString()} Diamonds`}</span>
          </button>
        </form>
      )}

      {/* Recent Withdrawals History */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          Recent Diamonds Withdrawals
        </h3>
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
          {diamondWithdrawals.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No recent diamond withdrawals found.
            </div>
          ) : (
            diamondWithdrawals.map((tx) => (
              <div key={tx.transactionId} className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white">{tx.reason}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{tx.timestampLabel}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-bold text-rose-400">-{tx.amount.toLocaleString()}</p>
                  <span className="text-[10px] text-slate-500 font-mono">Diamonds</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
