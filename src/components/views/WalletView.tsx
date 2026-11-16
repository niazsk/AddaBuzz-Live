import React, { useState } from 'react';
import { Coins, Gem, ShieldCheck } from 'lucide-react';
import { CurrencyType, WalletTransaction } from '../../types/app';

interface WalletViewProps {
  coinBalance: number;
  diamondBalance: number;
  transactions: WalletTransaction[];
}

export const WalletView: React.FC<WalletViewProps> = ({
  coinBalance,
  diamondBalance,
  transactions,
}) => {
  const [filter, setFilter] = useState<'ALL' | CurrencyType>('ALL');

  const filteredTx = transactions.filter(
    (t) => filter === 'ALL' || t.currency === filter
  );

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Coins, Diamonds & Ledger
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Separate virtual balances with immutable server-side transaction auditing.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-sky-400" aria-hidden="true" />
          <span>No top-up or purchase flow enabled</span>
        </span>
      </div>

      {/* Balance Cards — Strictly NO top-up, recharge, or buy buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-300">
              <Coins className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Coin Balance</span>
            </span>
            <span className="text-xs font-mono text-slate-500">CURRENCY: COIN</span>
          </div>
          <p className="font-mono text-3xl font-bold text-white tabular-nums">
            {coinBalance.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400">
            Granted through approved community events and platform milestones.
          </p>
        </div>

        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-300">
              <Gem className="w-4 h-4 text-sky-400" aria-hidden="true" />
              <span>Diamond Balance</span>
            </span>
            <span className="text-xs font-mono text-slate-500">CURRENCY: DIAMOND</span>
          </div>
          <p className="font-mono text-3xl font-bold text-white tabular-nums">
            {diamondBalance.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400">
            Used for featured virtual gifts and creator milestone recognition.
          </p>
        </div>
      </div>

      {/* Immutable Ledger Table */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-white">
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
                  <th className="py-3 px-4">Idempotency Key</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-xs">
                {filteredTx.map((tx) => (
                  <tr key={tx.transactionId} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap font-mono">
                      {tx.timestampLabel}
                    </td>
                    <td className="py-3 px-4 text-slate-100 font-medium">{tx.reason}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono">{tx.currency}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{tx.idempotencyKey}</td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                        tx.direction === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.direction === 'CREDIT' ? '+' : '-'}
                      {tx.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
