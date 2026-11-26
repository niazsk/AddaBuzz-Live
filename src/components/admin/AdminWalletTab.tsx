import React, { useMemo, useState } from 'react';
import { Coins, Gem, RefreshCw, Search, ShieldCheck, Wallet } from 'lucide-react';
import { adminAdjustWallet } from '../../lib/firestoreService';
import { AdminSharedProps, getThemeClasses } from './adminTypes';

export const AdminWalletTab: React.FC<AdminSharedProps> = ({
  theme,
  currentUser,
  users,
  wallets,
  transactions,
  onToast,
  onConfirm,
}) => {
  const t = getThemeClasses(theme);
  const [txFilter, setTxFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [search, setSearch] = useState('');
  const [targetUid, setTargetUid] = useState('');
  const [currency, setCurrency] = useState<'COIN' | 'DIAMOND' | 'AGENT_POINT'>('COIN');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const totals = useMemo(() => {
    return {
      coins: wallets.reduce((s, w) => s + (w.coinBalance || 0), 0),
      tradingCoins: wallets.reduce((s, w) => s + (w.tradingCoinBalance || 0), 0),
      agentPoints: wallets.reduce((s, w) => s + (w.tradingCoinBalance || 0), 0),
      diamonds: wallets.reduce((s, w) => s + (w.diamondBalance || 0), 0),
    };
  }, [wallets]);

  const filteredTx = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          return (
            tx.counterparty?.toLowerCase().includes(q) ||
            tx.reason?.toLowerCase().includes(q) ||
            tx.transactionId?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .slice(0, 50);
  }, [transactions, search]);

  const handleManualAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!targetUid.trim() || !Number.isFinite(num) || num === 0) {
      onToast('Invalid input', 'Enter a valid UID and non-zero amount.', 'warning');
      return;
    }
    const targetUser = users.find((u) => u.uid === targetUid.trim() || u.username === targetUid.trim());
    const resolvedUid = targetUser?.uid || targetUid.trim();
    onConfirm({
      title: 'Confirm Wallet Adjustment',
      body: `Adjust ${num > 0 ? `+${num}` : num} ${currency} for ${targetUser ? `@${targetUser.username}` : resolvedUid}? Reason: ${reason || 'Admin adjustment'}`,
      confirmLabel: 'Apply Adjustment',
      danger: num < 0,
      run: async () => {
        await adminAdjustWallet(
          currentUser!,
          resolvedUid,
          currency === 'COIN' ? 'COIN' : 'DIAMOND',
          num >= 0 ? 'CREDIT' : 'DEBIT',
          Math.abs(num),
          reason || 'Super Admin manual adjustment'
        );
        onToast('Wallet adjusted', `${num} ${currency} applied`, 'success');
        setAmount('');
        setReason('');
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Economy Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`${t.card} p-4`}>
          <p className={`text-[11px] ${t.textSecondary} flex items-center gap-1.5`}>
            <Coins className="w-3.5 h-3.5 text-amber-400" /> Main Coin Balance
          </p>
          <p className={`text-xl font-bold mt-1.5 ${t.textPrimary}`}>{totals.coins.toLocaleString()}</p>
        </div>
        <div className={`${t.card} p-4`}>
          <p className={`text-[11px] ${t.textSecondary} flex items-center gap-1.5`}>
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" /> Trading Coin Balance
          </p>
          <p className={`text-xl font-bold mt-1.5 ${t.textPrimary}`}>{totals.tradingCoins.toLocaleString()}</p>
        </div>
        <div className={`${t.card} p-4`}>
          <p className={`text-[11px] ${t.textSecondary} flex items-center gap-1.5`}>
            <Wallet className="w-3.5 h-3.5 text-emerald-400" /> Agent Point Trading
          </p>
          <p className={`text-xl font-bold mt-1.5 ${t.textPrimary}`}>{totals.agentPoints.toLocaleString()}</p>
        </div>
        <div className={`${t.card} p-4`}>
          <p className={`text-[11px] ${t.textSecondary} flex items-center gap-1.5`}>
            <Gem className="w-3.5 h-3.5 text-cyan-400" /> Diamond Balance
          </p>
          <p className={`text-xl font-bold mt-1.5 ${t.textPrimary}`}>{totals.diamonds.toLocaleString()}</p>
        </div>
      </div>

      {/* Manual Adjustment + Policy Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <form onSubmit={handleManualAdjust} className={`${t.card} p-4 lg:col-span-2 space-y-3`}>
          <h3 className={`text-sm font-bold ${t.textPrimary}`}>Manual Wallet Adjustment</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              value={targetUid}
              onChange={(e) => setTargetUid(e.target.value)}
              placeholder="Target UID or username"
              className={t.input}
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as typeof currency)}
              className={t.input}
            >
              <option value="COIN">Main Coins</option>
              <option value="DIAMOND">Diamonds</option>
            </select>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (+ or -)"
              className={t.input}
            />
          </div>
          <div className="flex gap-2.5">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Audit reason (required for compliance)..."
              className={`${t.input} flex-1`}
            />
            <button type="submit" className={t.btnPrimary}>
              Apply Adjustment
            </button>
          </div>
        </form>

        <div className={`${t.card} p-4 space-y-2 text-xs`}>
          <h3 className={`text-sm font-bold flex items-center gap-1.5 ${t.textPrimary}`}>
            <ShieldCheck className="w-4 h-4 text-violet-400" /> Economy Rules (Server-Enforced)
          </h3>
          <p className={t.textSecondary}>• Coin → Diamond: 1,000 Coins = 300 Diamonds</p>
          <p className={t.textSecondary}>• Diamond → Agent Point: Backend-configured deduction</p>
          <p className={t.textSecondary}>• Super Agent: Point Wallet only (no Diamonds)</p>
          <p className={t.textSecondary}>• Agent: Main Coin + Point Trading (no Diamonds)</p>
        </div>
      </div>

      {/* Transaction History */}
      <div className={`${t.card} overflow-hidden`}>
        <div className={`p-3.5 border-b ${t.border} flex flex-wrap items-center justify-between gap-2.5`}>
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions by UID, type, or ID..."
              className={`${t.input} pl-8`}
            />
          </div>
          <div className="flex items-center gap-1.5">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setTxFilter(st)}
                className={txFilter === st ? t.btnPrimary : t.btnGhost}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={t.tableHead}>
                <th className="py-2.5 px-4 font-semibold">ID</th>
                <th className="py-2.5 px-4 font-semibold">UID</th>
                <th className="py-2.5 px-4 font-semibold">Type</th>
                <th className="py-2.5 px-4 font-semibold">Amount</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`py-8 text-center ${t.textMuted}`}>
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx) => (
                  <tr key={tx.transactionId} className={t.tableRow}>
                    <td className={`py-2.5 px-4 font-mono text-[10px] ${t.textMuted}`}>{tx.transactionId.slice(0, 10)}</td>
                    <td className={`py-2.5 px-4 font-mono text-[10px] ${t.textSecondary}`}>{tx.counterparty || 'System'}</td>
                    <td className={`py-2.5 px-4 font-semibold ${t.textPrimary}`}>{tx.direction}</td>
                    <td className={`py-2.5 px-4 font-bold ${tx.direction === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.amount} {tx.currency}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5">
                        {tx.reason}
                      </span>
                    </td>
                    <td className={`py-2.5 px-4 ${t.textMuted}`}>
                      {tx.timestampLabel || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
