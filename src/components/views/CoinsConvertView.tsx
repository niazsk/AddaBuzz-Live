import React, { useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Gem,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile } from '../../types/app';
import { convertCoinsToDiamonds } from '../../lib/firestoreService';

interface CoinsConvertViewProps {
  currentUser: UserProfile | null;
  coinBalance: number;
  diamondBalance: number;
  onBack: () => void;
  onToast?: (title: string, desc?: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const CoinsConvertView: React.FC<CoinsConvertViewProps> = ({
  currentUser,
  coinBalance,
  diamondBalance,
  onBack,
  onToast,
}) => {
  const [convertAmount, setConvertAmount] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<{ coins: number; diamonds: number } | null>(null);

  const parsedAmount = Math.max(0, parseInt(convertAmount, 10) || 0);

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onToast?.('Sign in required', 'Please sign in to convert coins.', 'warning');
      return;
    }

    if (parsedAmount <= 0) {
      onToast?.('Invalid Amount', 'Enter a valid coin amount to convert.', 'warning');
      return;
    }

    if (parsedAmount > coinBalance) {
      onToast?.('Insufficient Balance', 'You do not have enough coins in your balance.', 'error');
      return;
    }

    setIsConverting(true);
    setSuccessMsg(null);
    try {
      const result = await convertCoinsToDiamonds(currentUser.uid, parsedAmount);
      setSuccessMsg({
        coins: result.convertedCoins,
        diamonds: result.creditedDiamonds,
      });
      onToast?.(
        'Converted to Diamonds!',
        `Successfully converted ${result.convertedCoins.toLocaleString()} Coins to Diamonds.`,
        'success'
      );
      setConvertAmount('');
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
          <Coins className="w-5 h-5 text-amber-400" />
          <h1 className="font-display text-lg font-bold text-white">Coins Convert to Diamonds</h1>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Current Coin Balance */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-500/15 via-[#111420] to-[#111420] border border-amber-500/25 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
              <Coins className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Coins Balance</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
              Available
            </span>
          </div>
          <p className="font-mono text-3xl font-black text-white tabular-nums">
            {coinBalance.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400">
            Convert your Coins directly into Diamonds.
          </p>
        </div>

        {/* Current Diamond Balance */}
        <div className="rounded-3xl bg-gradient-to-br from-sky-500/15 via-[#111420] to-[#111420] border border-sky-500/25 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-sky-300 uppercase tracking-wider">
              <Gem className="w-4 h-4 text-sky-400" aria-hidden="true" />
              <span>Diamonds Balance</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
              Withdrawable
            </span>
          </div>
          <p className="font-mono text-3xl font-black text-white tabular-nums">
            {diamondBalance.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400">
            Converted diamonds are credited directly to your balance.
          </p>
        </div>
      </div>

      {/* Convert Form */}
      <div className="rounded-3xl bg-[#111420] border border-white/[0.08] p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Convert Coins to Diamonds</h2>
              <p className="text-xs text-slate-400">Instant direct balance conversion</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>Secure</span>
          </span>
        </div>

        {successMsg && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-emerald-300">Conversion Successful!</p>
              <p className="text-slate-300">
                Converted <span className="font-mono font-bold text-white">{successMsg.coins.toLocaleString()} Coins</span> to Diamonds.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleConvertSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Coins to Convert</span>
              <span className="font-mono">Available: {coinBalance.toLocaleString()} Coins</span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                max={coinBalance}
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
                placeholder="Enter coin amount (e.g. 1000)"
                className="w-full h-12 pl-4 pr-16 rounded-xl bg-[#0B0D14] border border-white/[0.09] text-sm text-white font-mono focus:border-amber-500/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setConvertAmount(coinBalance.toString())}
                className="absolute right-2 top-2 h-8 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold font-mono transition-colors"
              >
                MAX
              </button>
            </div>

            {/* Quick buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[1000, 5000, 10000, 50000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setConvertAmount(amt.toString())}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-slate-300 border border-white/[0.06] transition-colors"
                >
                  +{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isConverting || parsedAmount <= 0 || parsedAmount > coinBalance}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-[#0B0D14] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all active:scale-[0.99]"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{isConverting ? 'Converting Coins…' : 'Convert Coins to Diamonds'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
