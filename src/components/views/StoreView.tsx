import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Coins, Gem, ReceiptText, ShoppingBag, Sparkles, Image, Check } from 'lucide-react';
import { WalletTransaction } from '../../types/app';
import {
  PROFILE_FRAMES,
  FRAME_CHANGE_EVENT,
  addOwnedFrame,
  getEquippedFrame,
  getOwnedFrames,
  isFrameOwned,
  setEquippedFrame,
} from '../../data/profileFrames';
import { gameCoinDebit } from '../../lib/firestoreService';
import { ProfileFrameOverlay } from '../ui/ProfileFrameOverlay';

interface StoreViewProps {
  coinBalance: number;
  diamondBalance: number;
  transactions?: WalletTransaction[];
  currentUser?: { uid: string; displayName?: string; avatarColor?: string; avatarUrl?: string } | null;
  onBack: () => void;
  onToast?: (title: string, desc?: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const StoreView: React.FC<StoreViewProps> = ({
  coinBalance,
  diamondBalance,
  transactions = [],
  currentUser,
  onBack,
  onToast,
}) => {
  const uid = currentUser?.uid ?? 'guest';
  const [tab, setTab] = useState<'ORDERS' | 'FRAMES'>('FRAMES');
  const [owned, setOwned] = useState<string[]>(() => getOwnedFrames(uid));
  const [equipped, setEquipped] = useState<string>(() => getEquippedFrame(uid));
  const [busy, setBusy] = useState<string | null>(null);

  const orders = transactions.filter((tx) => tx.direction === 'DEBIT');

  const refresh = useCallback(() => {
    setOwned(getOwnedFrames(uid));
    setEquipped(getEquippedFrame(uid));
  }, [uid]);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener(FRAME_CHANGE_EVENT, handler);
    return () => window.removeEventListener(FRAME_CHANGE_EVENT, handler);
  }, [refresh]);

  const equip = (frameId: string) => {
    setEquippedFrame(uid, frameId);
    setEquipped(frameId);
    onToast?.('Frame applied', 'Your profile frame has been updated.', 'success');
  };

  const buyFrame = async (frameId: string, price: number, name: string) => {
    if (!currentUser) {
      onToast?.('Sign in required', 'Sign in to buy profile frames.', 'warning');
      return;
    }
    if (isFrameOwned(uid, frameId)) {
      equip(frameId);
      return;
    }
    if (coinBalance < price) {
      onToast?.('Not enough Coins', `You need ${price.toLocaleString()} Coins for ${name}.`, 'warning');
      return;
    }
    setBusy(frameId);
    try {
      await gameCoinDebit(uid, price, `Profile frame: ${name}`, `frame_${frameId}_${uid}`);
      addOwnedFrame(uid, frameId);
      setEquippedFrame(uid, frameId);
      setOwned(getOwnedFrames(uid));
      setEquipped(frameId);
      onToast?.('Frame purchased', `${name} unlocked and applied to your profile.`, 'success');
    } catch (err) {
      onToast?.('Purchase failed', err instanceof Error ? err.message : 'Unable to buy frame.', 'warning');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
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
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h1 className="font-display text-lg font-bold text-white">Store</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono font-bold text-amber-300">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{coinBalance.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs font-mono font-bold text-sky-300">
            <Gem className="w-3.5 h-3.5 text-sky-400" />
            <span>{diamondBalance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/20 via-violet-600/15 to-fuchsia-600/20 border border-amber-500/25 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_30px_70px_-50px_rgba(245,158,11,0.85)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
        <div className="space-y-1 text-center sm:text-left">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold">
            <Sparkles className="w-3 h-3" />
            <span>Profile Customization</span>
          </span>
          <h2 className="text-xl font-bold text-white">Stylish Profile Frames</h2>
          <p className="text-xs text-slate-300 max-w-md">
            Buy beautiful frames with Coins and wear them on your profile. No gifts here — just look good.
          </p>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-950/40">
          <Image className="w-8 h-8" />
        </div>
      </div>

      {/* Store tabs */}
      <div className="flex gap-1.5 p-1 rounded-xl bg-[#111420] border border-white/[0.08] w-full sm:w-auto">
        {(
          [
            { id: 'FRAMES', label: 'Profile Frames', icon: Image },
            { id: 'ORDERS', label: 'Purchase History', icon: ReceiptText },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                tab === item.id ? 'bg-amber-500 text-[#0B0D14] font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {tab === 'ORDERS' && (
        <section className="space-y-2">
          <div className="rounded-2xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
            {orders.length === 0 ? (
              <div className="px-4 py-8 text-center space-y-1.5">
                <ReceiptText className="w-6 h-6 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">No purchases in the loaded wallet history.</p>
              </div>
            ) : (
              orders.map((tx) => (
                <div key={tx.transactionId} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{tx.reason}</p>
                    <p className="text-[10px] text-slate-500">
                      {tx.counterparty ? `${tx.counterparty} · ` : ''}
                      {tx.timestampLabel}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-rose-300 tabular-nums shrink-0">
                    -{tx.amount.toLocaleString()} {tx.currency === 'COIN' ? '🪙' : '💎'}
                  </span>
                </div>
              ))
            )}
          </div>
          <p className="text-[10px] text-slate-500 px-1">Purchases are recorded in your audited wallet ledger.</p>
        </section>
      )}

      {tab === 'FRAMES' && (
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {PROFILE_FRAMES.map((frame) => {
            const ownedFrame = isFrameOwned(uid, frame.id);
            const isEquipped = equipped === frame.id;
            const affordable = coinBalance >= frame.price;
            const isBusy = busy === frame.id;
            return (
              <div
                key={frame.id}
                className={`group relative rounded-2xl bg-gradient-to-b from-[#141827] to-[#0E111A] border p-4 flex flex-col items-center gap-3 transition-all ${
                  isEquipped ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-white/[0.08] hover:border-amber-400/35'
                }`}
              >
                {/* Preview avatar with frame */}
                <div className="relative flex items-center justify-center p-1.5">
                  <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-xl font-bold text-white">
                    {(currentUser?.displayName ?? 'A').charAt(0).toUpperCase()}
                  </span>
                  <ProfileFrameOverlay frameId={frame.id} />
                </div>

                <div className="w-full text-center">
                  <p className="text-xs font-semibold text-white truncate">{frame.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{frame.description}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Coins className="w-3 h-3 text-amber-400" />
                    <span className="font-mono text-xs font-bold text-amber-300">
                      {frame.price === 0 ? 'Free' : frame.price.toLocaleString()}
                    </span>
                  </div>
                </div>

                {frame.id === 'none' ? (
                  <button
                    type="button"
                    onClick={() => equip('none')}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-white/[0.06] text-slate-200 ring-1 ring-white/10 hover:bg-white/[0.12] transition-colors"
                  >
                    {isEquipped ? 'Equipped' : 'Use'}
                  </button>
                ) : ownedFrame ? (
                  <button
                    type="button"
                    onClick={() => equip(frame.id)}
                    disabled={isEquipped}
                    className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 text-[#0B0D14] hover:bg-amber-400 disabled:opacity-60 transition-colors"
                  >
                    {isEquipped ? (<><Check className="w-3.5 h-3.5" />Equipped</>) : 'Apply to profile'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void buyFrame(frame.id, frame.price, frame.name)}
                    disabled={isBusy || !affordable || !currentUser}
                    className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    {isBusy ? 'Buying…' : affordable ? `Buy ${frame.price.toLocaleString()}` : 'Not enough'}
                  </button>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
};
