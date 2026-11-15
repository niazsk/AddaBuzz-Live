import React, { useState } from 'react';
import { Coins, Gem, Send, ShieldCheck } from 'lucide-react';
import { CurrencyType, GiftCatalogItem, UserProfile, WalletTransaction } from '../../types/app';
import { GiftArtwork } from '../ui/GiftArtwork';

interface WalletViewProps {
  coinBalance: number;
  diamondBalance: number;
  transactions: WalletTransaction[];
  gifts: GiftCatalogItem[];
  currentUser: UserProfile | null;
  isAdminUser: boolean;
  users: UserProfile[];
  onTransferCoins: (recipient: UserProfile, amount: number) => Promise<void>;
}

export const WalletView: React.FC<WalletViewProps> = ({
  coinBalance,
  diamondBalance,
  transactions,
  gifts,
  currentUser,
  isAdminUser,
  users,
  onTransferCoins,
}) => {
  const [filter, setFilter] = useState<'ALL' | CurrencyType>('ALL');
  const [recipientUid, setRecipientUid] = useState('');
  const [amount, setAmount] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferMsg, setTransferMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const isSuperAgent = currentUser?.accountType === 'SUPER_AGENT';
  const canTransfer = isAdminUser || isSuperAgent;
  const recipients = !canTransfer
    ? []
    : isAdminUser
    ? users.filter((u) => u.accountType === 'SUPER_AGENT')
    : users.filter((u) => u.uid !== currentUser?.uid);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipient = recipients.find((u) => u.uid === recipientUid);
    const value = Number(amount);
    if (!recipient || !Number.isFinite(value) || value <= 0) {
      setTransferMsg({ tone: 'err', text: 'Pick a recipient and a valid amount.' });
      return;
    }
    setTransferBusy(true);
    setTransferMsg(null);
    try {
      await onTransferCoins(recipient, Math.floor(value));
      setTransferMsg({ tone: 'ok', text: `Sent ${Math.floor(value).toLocaleString()} coins to @${recipient.username}.` });
      setAmount('');
    } catch (err) {
      setTransferMsg({ tone: 'err', text: err instanceof Error ? err.message : 'Transfer failed.' });
    } finally {
      setTransferBusy(false);
    }
  };

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

      {/* Role-gated coin transfer */}
      {canTransfer && (
        <section className="rounded-2xl bg-[#111420] border border-violet-500/30 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-white inline-flex items-center gap-2">
              <Send className="w-4 h-4 text-violet-400" />
              <span>Transfer Coins</span>
            </h2>
            <span className="text-xs text-slate-400">
              {isAdminUser ? 'Admin → Super Agent' : 'Super Agent → anyone'}
            </span>
          </div>
          <form onSubmit={handleTransfer} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
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
                    {u.displayName} (@{u.username})
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Coins</span>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full sm:w-36 h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white font-mono focus:border-violet-500/60 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={transferBusy || recipients.length === 0}
              className="h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.06] disabled:text-slate-500 text-sm font-semibold text-white inline-flex items-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{transferBusy ? 'Sending…' : 'Transfer'}</span>
            </button>
          </form>
          {recipients.length === 0 && (
            <p className="text-xs text-slate-400">No eligible recipients yet.</p>
          )}
          {transferMsg && (
            <p className={`text-xs ${transferMsg.tone === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}>
              {transferMsg.text}
            </p>
          )}
        </section>
      )}

      {/* Gift Catalog Reference */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold text-white">
            Configured Gift Catalog
          </h2>
          <span className="text-xs text-slate-400">Send inside any live room</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gifts.map((gift) => (
            <div
              key={gift.giftId}
              className="rounded-2xl bg-[#111420] border border-white/[0.08] p-4 flex items-center gap-4"
            >
              <GiftArtwork artworkKey={gift.artworkKey} size={46} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-semibold text-white truncate">
                    {gift.name}
                  </h3>
                  <span className="font-mono text-xs font-semibold tabular-nums text-sky-300 shrink-0">
                    {gift.price} {gift.currency === 'COIN' ? 'Coins' : 'Diamonds'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{gift.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

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
