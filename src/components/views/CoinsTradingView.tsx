import React, { useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Send,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile, WalletTransaction } from '../../types/app';
import {
  canTransferCoinsTo,
  isBdAgentProfile,
  resolveCoinTransferRole,
  exchangeTradingCoinsToMainBalance,
} from '../../lib/firestoreService';

interface CoinsTradingViewProps {
  coinBalance: number;
  tradingCoinBalance: number;
  transactions: WalletTransaction[];
  currentUser: UserProfile | null;
  isAdminUser: boolean;
  users: UserProfile[];
  onTransferCoins: (recipient: UserProfile, amount: number) => Promise<void>;
  onBack: () => void;
  onToast?: (title: string, desc?: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const CoinsTradingView: React.FC<CoinsTradingViewProps> = ({
  coinBalance,
  tradingCoinBalance,
  transactions,
  currentUser,
  isAdminUser,
  users,
  onTransferCoins,
  onBack,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'TRANSFER' | 'EXCHANGE'>('TRANSFER');
  const [recipientId, setRecipientId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [exchangeAmount, setExchangeAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const isBdAgent = isBdAgentProfile(currentUser);
  const transferRole = resolveCoinTransferRole(currentUser, isAdminUser);
  const canTrade = transferRole !== 'USER';

  // Transfer hierarchy: Admin -> BD Agent -> Super Agent -> Agent -> User
  const eligibleRecipients = canTrade
    ? users.filter(
        (u) => u.uid !== currentUser?.uid && canTransferCoinsTo(transferRole, u)
      )
    : [];

  const coinActivity = transactions
    .filter((t) => t.currency === 'COIN')
    .slice(0, 10);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const typed = recipientId.trim().toLowerCase();
    const recipient = typed
      ? eligibleRecipients.find(
          (u) =>
            u.platformId.toLowerCase() === typed ||
            u.username.toLowerCase() === typed ||
            u.uid.toLowerCase() === typed
        )
      : undefined;
    const value = Math.floor(Number(transferAmount));

    if (!recipient) {
      setMsg({
        tone: 'err',
        text: eligibleRecipients.length
          ? 'Please enter or select a valid recipient.'
          : 'No authorized recipients in your hierarchy.',
      });
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setMsg({ tone: 'err', text: 'Enter a valid coin amount.' });
      return;
    }

    // Admin transfers from Main Balance; agency roles transfer from Coins Trading Balance.
    const availableForTransfer =
      transferRole === 'ADMIN' ? coinBalance : tradingCoinBalance;
    if (value > availableForTransfer) {
      setMsg({
        tone: 'err',
        text: `Amount exceeds available ${
          transferRole === 'ADMIN' ? 'Main Balance' : 'Coins Trading Balance'
        } (${availableForTransfer.toLocaleString()}).`,
      });
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      await onTransferCoins(recipient, value);
      const destination =
        recipient.accountType === 'USER' ? 'Main Balance' : 'Coins Trading Balance';
      setMsg({
        tone: 'ok',
        text: `Transferred ${value.toLocaleString()} coins to @${recipient.username}'s ${destination}.`,
      });
      onToast?.(
        'Coins Transferred',
        `Sent ${value.toLocaleString()} Coins to @${recipient.username}.`,
        'success'
      );
      setTransferAmount('');
    } catch (err) {
      setMsg({ tone: 'err', text: err instanceof Error ? err.message : 'Transfer failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const value = Math.floor(Number(exchangeAmount));

    if (!Number.isFinite(value) || value <= 0) {
      onToast?.('Invalid Amount', 'Enter a valid coin amount to exchange.', 'warning');
      return;
    }
    if (value > tradingCoinBalance) {
      onToast?.('Insufficient Balance', 'Amount exceeds your Coins Trading Balance.', 'error');
      return;
    }

    setBusy(true);
    try {
      const result = await exchangeTradingCoinsToMainBalance(currentUser.uid, value);
      onToast?.(
        'Coins Exchanged Successfully!',
        `${result.creditedMain.toLocaleString()} coins added to Main Balance.`,
        'success'
      );
      setExchangeAmount('');
    } catch (err) {
      onToast?.(
        'Exchange Failed',
        err instanceof Error ? err.message : 'Unable to complete coins exchange.',
        'error'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to profile"
            className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-bold text-white leading-tight">
              Agency Coins Trading
            </h1>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
          <ShieldCheck className="w-4 h-4 text-sky-400" aria-hidden="true" />
          <span className="hidden sm:inline">Server-Audited</span>
        </span>
      </div>

      {/* Balances Section */}
      <div className={`grid ${isBdAgent ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-4`}>
        {/* Coins Trading Balance Card */}
        <div className="rounded-3xl bg-gradient-to-br from-violet-600/25 via-[#111420] to-fuchsia-600/10 border border-violet-500/30 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-violet-300 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-violet-400" />
              <span>Coins Trading Balance</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
              Agency Dedicated
            </span>
          </div>
          <p className="font-mono text-3xl font-black text-white tabular-nums">
            {tradingCoinBalance.toLocaleString()}{' '}
            <span className="text-xs font-sans font-normal text-violet-300">Coins</span>
          </p>
        </div>

        {/* Main Wallet Coin Balance Card - Hidden for BD Agent */}
        {!isBdAgent && (
          <div className="rounded-3xl bg-gradient-to-br from-amber-500/20 via-[#111420] to-[#111420] border border-amber-500/25 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Main Balance</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                In-App Use
              </span>
            </div>
            <p className="font-mono text-3xl font-black text-amber-400 tabular-nums">
              {coinBalance.toLocaleString()}{' '}
              <span className="text-xs font-sans font-normal text-amber-300">Coins</span>
            </p>
          </div>
        )}
      </div>

      {/* Tabs: Transfer Coins vs Coins Exchange */}
      <div className="flex rounded-2xl bg-[#111420] border border-white/[0.08] p-1.5 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('TRANSFER')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'TRANSFER'
              ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Transfer Coins</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('EXCHANGE')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'EXCHANGE'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-[#111420] shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Coins Exchange</span>
        </button>
      </div>

      {/* Tab 1: Transfer Coins (BD Agent -> Super Agent -> Agent) */}
      {activeTab === 'TRANSFER' && (
        <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-violet-400" />
              <span>Agency Coins Transfer</span>
            </h2>
          </div>

          {canTrade ? (
            <form onSubmit={handleTransfer} className="space-y-3.5">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-300">Recipient ID or Username</span>
                <input
                  type="text"
                  value={recipientId}
                  onChange={(e) => {
                    setRecipientId(e.target.value);
                    setMsg(null);
                  }}
                  list="coins-transfer-recipients"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Enter recipient platform ID or select from list…"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0B0D14] border border-white/[0.09] text-xs text-white focus:border-violet-500/60 focus:outline-none"
                />
                <datalist id="coins-transfer-recipients">
                  {eligibleRecipients.map((u) => (
                    <option key={u.uid} value={u.platformId}>
                      {u.displayName} (@{u.username}) — {u.accountType}
                    </option>
                  ))}
                </datalist>
              </label>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">Coins Amount</span>
                  <span className="text-[11px] text-slate-500">
                    Avail:{' '}
                    {(transferRole === 'ADMIN' ? coinBalance : tradingCoinBalance).toLocaleString()}
                  </span>
                </div>
                <input
                  type="number"
                  min={1}
                  value={transferAmount}
                  onChange={(e) => {
                    setTransferAmount(e.target.value);
                    setMsg(null);
                  }}
                  placeholder="Enter coin amount to transfer"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0B0D14] border border-white/[0.09] text-sm text-white font-mono focus:border-violet-500/60 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={busy || eligibleRecipients.length === 0}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-all shadow-md shadow-violet-600/20"
              >
                <Send className="w-4 h-4" />
                <span>{busy ? 'Transferring…' : 'Transfer Coins'}</span>
              </button>

              {msg && (
                <p className={`text-xs ${msg.tone === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {msg.text}
                </p>
              )}
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-white/[0.03] text-xs text-slate-400">
              Agency coins transfer is available to authorized Agency accounts.
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Coins Exchange (Trading Balance -> Main Balance) */}
      {activeTab === 'EXCHANGE' && (
        <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-400" />
              <span>Exchange Coins to Main Balance</span>
            </h2>
            <p className="text-xs text-slate-400">
              Transfer coins from your Coins Trading Balance into your Main Balance for gifting, games, and in-app activities. Exchange is 1:1 with no fee.
            </p>
          </div>

          <form onSubmit={handleExchange} className="space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Trading Coins to Exchange</span>
                <span className="text-[11px] text-slate-500">
                  Trading Balance: {tradingCoinBalance.toLocaleString()}
                </span>
              </div>
              <input
                type="number"
                min={1}
                max={tradingCoinBalance}
                value={exchangeAmount}
                onChange={(e) => setExchangeAmount(e.target.value)}
                placeholder="Enter coins to exchange"
                className="w-full h-11 px-3.5 rounded-xl bg-[#0B0D14] border border-white/[0.09] text-sm text-white font-mono focus:border-amber-500/60 focus:outline-none"
              />

              <div className="flex flex-wrap gap-1.5 pt-1">
                {[10000, 50000, 100000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setExchangeAmount(val.toString())}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-slate-300 transition-colors"
                  >
                    +{val.toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setExchangeAmount(tradingCoinBalance.toString())}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-xs font-mono font-bold text-amber-400 transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            {Math.floor(Number(exchangeAmount) || 0) > 0 && (
              <div className="p-3 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-white">
                  <span>You receive in Main Balance</span>
                  <span className="font-mono text-emerald-400">
                    {Math.floor(Number(exchangeAmount)).toLocaleString()} coins
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300/80">No exchange fee — full amount is credited.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || tradingCoinBalance <= 0 || !exchangeAmount}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-sm font-bold text-[#111420] inline-flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{busy ? 'Exchanging…' : 'Exchange to Main Balance'}</span>
            </button>
          </form>
        </section>
      )}

      {/* Recent Coin Activity */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          Recent Coins Activity
        </h3>
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
          {coinActivity.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No coin transactions recorded yet.
            </div>
          ) : (
            coinActivity.map((tx) => (
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
            ))
          )}
        </div>
      </section>
    </div>
  );
};
