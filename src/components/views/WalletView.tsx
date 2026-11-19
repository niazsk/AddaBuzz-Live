import React, { useState } from 'react';
import {
  Coins,
  Gem,
  ShieldCheck,
  RefreshCw,
  Send,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AppSection, CurrencyType, UserProfile, WalletTransaction } from '../../types/app';
import { convertCoinsToDiamonds } from '../../lib/firestoreService';

interface WalletViewProps {
  coinBalance: number;
  diamondBalance: number;
  tradingCoinBalance?: number;
  transactions: WalletTransaction[];
  currentUser: UserProfile | null;
  onOpenSection?: (section: AppSection) => void;
  onToast?: (title: string, desc?: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const WalletView: React.FC<WalletViewProps> = ({
  coinBalance,
  diamondBalance,
  tradingCoinBalance = 0,
  transactions,
  currentUser,
  onOpenSection,
  onToast,
}) => {
  const [filter, setFilter] = useState<'ALL' | CurrencyType>('ALL');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertAmount, setConvertAmount] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  const filteredTx = transactions.filter(
    (t) => filter === 'ALL' || t.currency === filter
  );

  const isAgencyUser =
    currentUser?.accountType === 'AGENT' ||
    currentUser?.accountType === 'SUPER_AGENT';

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const value = Math.floor(Number(convertAmount));

    if (!Number.isFinite(value) || value <= 0) {
      onToast?.('Invalid Amount', 'Enter a valid coin amount to convert.', 'warning');
      return;
    }
    if (value > coinBalance) {
      onToast?.('Insufficient Balance', 'You do not have enough coins in your balance.', 'error');
      return;
    }

    setIsConverting(true);
    try {
      const result = await convertCoinsToDiamonds(currentUser.uid, value);
      onToast?.(
        'Converted to Diamonds!',
        `Successfully converted ${result.convertedCoins.toLocaleString()} Coins to Diamonds.`,
        'success'
      );
      setConvertAmount('');
      setShowConvertModal(false);
    } catch (err) {
      onToast?.(
        'Conversion Failed',
        err instanceof Error ? err.message : 'Unable to convert coins.',
        'error'
      );
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Wallet & Balance Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Coins & Diamonds with immutable transactional auditing.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-sky-400" aria-hidden="true" />
          <span>Server-Audited Security</span>
        </span>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Coin Balance Card with Convert to Diamonds */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-500/15 via-[#111420] to-[#111420] border border-amber-500/25 p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Coins className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span>Coin Balance</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                Non-Withdrawable
              </span>
            </div>
            <p className="font-mono text-3xl font-black text-white tabular-nums">
              {coinBalance.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 leading-snug">
              Used for live room gifts, games, deposits, and in-app activities.
            </p>
          </div>

          {/* Option to Convert Coins to Diamonds */}
          <button
            type="button"
            onClick={() => setShowConvertModal(true)}
            className="w-full py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold text-amber-300 flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Convert Coins to Diamonds</span>
          </button>
        </div>

        {/* Diamond Balance Card with Diamonds Withdraw */}
        <div className="rounded-3xl bg-gradient-to-br from-sky-500/15 via-[#111420] to-[#111420] border border-sky-500/25 p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-sky-300 uppercase tracking-wider">
                <Gem className="w-4 h-4 text-sky-400" aria-hidden="true" />
                <span>Diamond Balance</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                Withdrawable
              </span>
            </div>
            <p className="font-mono text-3xl font-black text-white tabular-nums">
              {diamondBalance.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 leading-snug">
              Earned from live gifts. Withdrawable to Super Agents & Agents.
            </p>
          </div>

          {/* Option to Withdraw Diamonds */}
          <button
            type="button"
            onClick={() => onOpenSection?.('salary')}
            className="w-full py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-xs font-bold text-sky-300 flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Diamonds Withdraw</span>
          </button>
        </div>
      </div>

      {/* Agency Coins Trading Balance banner for Agents */}
      {isAgencyUser && (
        <div className="rounded-2xl bg-[#111420] border border-violet-500/30 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Agency Coins Trading Balance</p>
              <p className="font-mono text-base font-bold text-violet-400">
                {tradingCoinBalance.toLocaleString()} <span className="text-xs font-sans text-slate-400">Coins</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenSection?.('coins-trading')}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors"
          >
            Open Trading
          </button>
        </div>
      )}

      {/* Modal / Dialog for Convert Coins to Diamonds */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#111420] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                <span>Convert to Diamonds</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="w-7 h-7 rounded-full bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Convert your Coins directly into Diamonds.
            </p>

            <form onSubmit={handleConvertSubmit} className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Coins to Convert</span>
                  <span className="font-mono">Avail: {coinBalance.toLocaleString()}</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max={coinBalance}
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  placeholder="Enter coin amount"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0B0D14] border border-white/[0.09] text-sm text-white font-mono focus:border-amber-500/60 focus:outline-none"
                />
                <div className="flex gap-1.5 pt-1">
                  {[1000, 5000, 20000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setConvertAmount(amt.toString())}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-mono text-slate-300"
                    >
                      +{amt.toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setConvertAmount(coinBalance.toString())}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[11px] font-mono font-bold"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConverting || !convertAmount || Number(convertAmount) <= 0}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-xs font-bold text-[#111420]"
                >
                  {isConverting ? 'Converting…' : 'Confirm Convert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Immutable Ledger Table */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-white">
            Transaction Ledger
          </h2>

          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#111420] border border-white/[0.08] self-start sm:self-auto">
            {(['ALL', 'COIN', 'DIAMOND'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === tab
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'ALL' ? 'All Entries' : tab === 'COIN' ? 'Coins' : 'Diamonds'}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-[11px] font-medium text-slate-400">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Currency</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-xs">
                {filteredTx.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-500">
                      No transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredTx.map((tx) => (
                    <tr key={tx.transactionId} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap font-mono">
                        {tx.timestampLabel}
                      </td>
                      <td className="py-3 px-4 text-slate-100 font-medium">{tx.reason}</td>
                      <td className="py-3 px-4 text-slate-300 font-mono">{tx.currency}</td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                          tx.direction === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {tx.direction === 'CREDIT' ? '+' : '-'}
                        {tx.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
