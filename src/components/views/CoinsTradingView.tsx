import React, { useState } from 'react';
import { ArrowLeft, Coins, Send, ShieldCheck } from 'lucide-react';
import { UserProfile, WalletTransaction } from '../../types/app';

interface CoinsTradingViewProps {
  coinBalance: number;
  transactions: WalletTransaction[];
  currentUser: UserProfile | null;
  isAdminUser: boolean;
  users: UserProfile[];
  onTransferCoins: (recipient: UserProfile, amount: number) => Promise<void>;
  onBack: () => void;
}

export const CoinsTradingView: React.FC<CoinsTradingViewProps> = ({
  coinBalance,
  transactions,
  currentUser,
  isAdminUser,
  users,
  onTransferCoins,
  onBack,
}) => {
  const [recipientUid, setRecipientUid] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const isBdAgent = currentUser?.accountType === 'SUPER_AGENT';
  const canTrade = isAdminUser || isBdAgent;
  const recipients = !canTrade
    ? []
    : isAdminUser
    ? users.filter((u) => u.accountType === 'SUPER_AGENT')
    : users.filter((u) => u.uid !== currentUser?.uid);

  const coinActivity = transactions.filter((t) => t.currency === 'COIN').slice(0, 6);

  const setFraction = (frac: number) => {
    setAmount(String(Math.max(1, Math.floor(coinBalance * frac))));
    setMsg(null);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipient = recipients.find((u) => u.uid === recipientUid);
    const value = Math.floor(Number(amount));
    if (!recipient) {
      setMsg({ tone: 'err', text: 'Pick a recipient account first.' });
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setMsg({ tone: 'err', text: 'Enter a valid coin amount.' });
      return;
    }
    if (value > coinBalance) {
      setMsg({ tone: 'err', text: `Amount exceeds your trading balance (${coinBalance.toLocaleString()}).` });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await onTransferCoins(recipient, value);
      setMsg({ tone: 'ok', text: `Sent ${value.toLocaleString()} coins to ID ${recipient.platformId}.` });
      setAmount('');
    } catch (err) {
      setMsg({ tone: 'err', text: err instanceof Error ? err.message : 'Transfer failed.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to profile"
            className="w-9 h-9 rounded-xl bg-[#111420] border border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-white leading-tight">
              Coins Trading
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAdminUser ? 'Admin → BD Agent' : 'BD Agent → anyone'} · full wallet balance tradable
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
          <ShieldCheck className="w-4 h-4 text-sky-400" aria-hidden="true" />
          <span className="hidden sm:inline">Server-audited transfers</span>
        </span>
      </div>

      {/* Full tradable balance */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/15 via-[#111420] to-[#111420] border border-amber-500/25 p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-200">
            <Coins className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span>Trading Balance</span>
          </span>
          <span className="text-xs font-mono text-slate-500">ALL WALLET COINS</span>
        </div>
        <p className="mt-2 font-mono text-4xl font-bold text-white tabular-nums">
          {coinBalance.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Your entire wallet coin balance is available here for trading.
        </p>
      </div>

      {canTrade ? (
        <section className="rounded-2xl bg-[#111420] border border-violet-500/30 p-5 space-y-4">
          <h2 className="font-display text-base font-semibold text-white inline-flex items-center gap-2">
            <Send className="w-4 h-4 text-violet-400" />
            <span>Transfer Coins</span>
          </h2>

          <form onSubmit={handleTransfer} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Recipient</span>
              <select
                value={recipientUid}
                onChange={(e) => setRecipientUid(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-violet-500/60 focus:outline-none"
              >
                <option value="">Select account…</option>
                {recipients.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.platformId}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Coins</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={coinBalance}
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setMsg(null); }}
                  placeholder="0"
                  className="flex-1 h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white font-mono focus:border-violet-500/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setFraction(0.25)}
                  className="h-10 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-slate-200 transition-colors"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => setFraction(0.5)}
                  className="h-10 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-slate-200 transition-colors"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setFraction(1)}
                  className="h-10 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-semibold text-amber-200 transition-colors"
                >
                  Max
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || recipients.length === 0}
              className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.06] disabled:text-slate-500 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{busy ? 'Sending…' : 'Transfer'}</span>
            </button>
          </form>

          {recipients.length === 0 && (
            <p className="text-xs text-slate-400">No eligible recipients yet.</p>
          )}
          {msg && (
            <p className={`text-xs ${msg.tone === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}>
              {msg.text}
            </p>
          )}
        </section>
      ) : (
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-6 text-sm text-slate-400">
          Coins Trading is available to BD Agent and Admin accounts only.
        </div>
      )}

      {/* Recent coin activity */}
      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold text-white">Recent Coin Activity</h2>
        {coinActivity.length === 0 ? (
          <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-6 text-sm text-slate-400">
            No coin transactions yet.
          </div>
        ) : (
          <div className="rounded-2xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06]">
            {coinActivity.map((tx) => (
              <div key={tx.transactionId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-100 truncate">{tx.reason}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{tx.timestampLabel}</p>
                </div>
                <span
                  className={`font-mono text-sm font-semibold tabular-nums shrink-0 ${
                    tx.direction === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {tx.direction === 'CREDIT' ? '+' : '-'}
                  {tx.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};