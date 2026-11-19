import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Coins,
  ShieldCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  PlusCircle,
  Sparkles,
  Layers,
} from 'lucide-react';
import { UserProfile } from '../../types/app';
import { gameCoinDebit, gameCoinCredit } from '../../lib/firestoreService';

interface DepositViewProps {
  currentUser: UserProfile | null;
  coinBalance: number;
  onBack: () => void;
  onToast?: (title: string, desc?: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
}

interface DepositPlan {
  id: string;
  name: string;
  durationDays: number;
  bonusPercent: number;
  tag: string;
  description: string;
}

interface ActiveDeposit {
  id: string;
  planId: string;
  planName: string;
  amount: number;
  bonusPercent: number;
  returnAmount: number;
  createdAt: number;
  maturesAt: number;
  isWithdrawn: boolean;
}

const DEPOSIT_PLANS: DepositPlan[] = [
  {
    id: 'flexible',
    name: 'Flexible Deposit',
    durationDays: 0,
    bonusPercent: 3,
    tag: 'Anytime Withdraw',
    description: 'Deposit coins and earn 3% reward. Withdraw back to your wallet at any time.',
  },
  {
    id: 'fixed-7d',
    name: '7-Day Silver Vault',
    durationDays: 7,
    bonusPercent: 8,
    tag: '+8% Profit',
    description: 'Lock coins for 7 days and claim an 8% guaranteed coin bonus on maturity.',
  },
  {
    id: 'fixed-15d',
    name: '15-Day Gold Vault',
    durationDays: 15,
    bonusPercent: 18,
    tag: '+18% Profit',
    description: 'Lock coins for 15 days to earn an 18% bonus return for maximum yield.',
  },
  {
    id: 'fixed-30d',
    name: '30-Day Diamond Vault',
    durationDays: 30,
    bonusPercent: 40,
    tag: '+40% VIP Profit',
    description: 'VIP 30-day locked vault with high 40% bonus coin payout upon maturity.',
  },
];

export const DepositView: React.FC<DepositViewProps> = ({
  currentUser,
  coinBalance,
  onBack,
  onToast,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<DepositPlan>(DEPOSIT_PLANS[0]);
  const [depositAmount, setDepositAmount] = useState<string>('50000');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'NEW' | 'VAULT'>('NEW');
  const [deposits, setDeposits] = useState<ActiveDeposit[]>([]);

  const storageKey = currentUser ? `addabuzz_deposits_${currentUser.uid}` : 'addabuzz_deposits_guest';

  // Load existing deposits
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setDeposits(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const saveDeposits = (newDeposits: ActiveDeposit[]) => {
    setDeposits(newDeposits);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newDeposits));
    } catch {
      // ignore
    }
  };

  const parsedAmount = Math.max(0, parseInt(depositAmount, 10) || 0);
  const projectedBonus = Math.floor((parsedAmount * selectedPlan.bonusPercent) / 100);
  const totalReturn = parsedAmount + projectedBonus;

  const totalVaultCoins = deposits
    .filter((d) => !d.isWithdrawn)
    .reduce((sum, d) => sum + d.amount, 0);

  const totalProfitEarned = deposits
    .filter((d) => !d.isWithdrawn)
    .reduce((sum, d) => sum + (d.returnAmount - d.amount), 0);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onToast?.('Sign in required', 'Please sign in to deposit coins.', 'warning');
      return;
    }

    if (parsedAmount < 1000) {
      onToast?.('Minimum Amount', 'Minimum deposit is 1,000 Coins.', 'warning');
      return;
    }

    if (parsedAmount > coinBalance) {
      onToast?.('Insufficient Balance', 'You do not have enough coins in your wallet.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const now = Date.now();
      const maturesAt = now + selectedPlan.durationDays * 24 * 60 * 60 * 1000;
      const txKey = `dep_${now}_${Math.random().toString(36).slice(2, 6)}`;

      // Server-side transactional deduction from wallet
      await gameCoinDebit(
        currentUser.uid,
        parsedAmount,
        `Coin Deposit: ${selectedPlan.name}`,
        txKey
      );

      const newRecord: ActiveDeposit = {
        id: txKey,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: parsedAmount,
        bonusPercent: selectedPlan.bonusPercent,
        returnAmount: totalReturn,
        createdAt: now,
        maturesAt,
        isWithdrawn: false,
      };

      const updated = [newRecord, ...deposits];
      saveDeposits(updated);

      onToast?.(
        'Coins Deposited Successfully!',
        `${parsedAmount.toLocaleString()} Coins transferred to ${selectedPlan.name}.`,
        'success'
      );
      setActiveTab('VAULT');
    } catch (err) {
      onToast?.(
        'Deposit Failed',
        err instanceof Error ? err.message : 'Unable to complete coin deposit.',
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdrawDeposit = async (dep: ActiveDeposit) => {
    if (!currentUser || isProcessing) return;

    const now = Date.now();
    const isMatured = dep.maturesAt <= now || dep.planId === 'flexible';

    // If premature on fixed, user gets principal without interest; if matured, user gets principal + bonus
    const payoutAmount = isMatured ? dep.returnAmount : dep.amount;

    setIsProcessing(true);
    try {
      const txKey = `with_${now}_${Math.random().toString(36).slice(2, 6)}`;

      // Server-side transactional credit back to wallet
      await gameCoinCredit(
        currentUser.uid,
        payoutAmount,
        `Deposit Vault Return: ${dep.planName}${isMatured ? ' (+Bonus)' : ' (Principal)'}`,
        txKey
      );

      const updated = deposits.map((d) =>
        d.id === dep.id ? { ...d, isWithdrawn: true } : d
      );
      saveDeposits(updated);

      onToast?.(
        'Withdrawn to Wallet!',
        `Received ${payoutAmount.toLocaleString()} Coins back in your wallet.`,
        'success'
      );
    } catch (err) {
      onToast?.(
        'Withdrawal Failed',
        err instanceof Error ? err.message : 'Unable to withdraw deposit.',
        'error'
      );
    } finally {
      setIsProcessing(false);
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
          <Layers className="w-5 h-5 text-amber-400" />
          <h1 className="font-display text-lg font-bold text-white">Coin Deposit</h1>
        </div>
      </div>

      {/* Vault Balance Overview Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-500/20 via-[#111420] to-emerald-500/10 border border-amber-500/20 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>In-App Coin Deposit Vault</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Safe & Audited</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="space-y-1">
            <p className="text-[11px] text-slate-400">Available Wallet Balance</p>
            <p className="font-mono text-2xl font-black text-white tabular-nums">
              {coinBalance.toLocaleString()} <span className="text-xs font-normal text-amber-400 font-sans">Coins</span>
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[11px] text-slate-400">Deposited in Vault</p>
            <p className="font-mono text-2xl font-black text-amber-400 tabular-nums">
              {totalVaultCoins.toLocaleString()} <span className="text-xs font-normal text-amber-300 font-sans">Coins</span>
            </p>
          </div>
        </div>

        {totalProfitEarned > 0 && (
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Projected Bonus</span>
            <span className="font-mono font-bold text-emerald-400">+{totalProfitEarned.toLocaleString()} Coins</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-[#111420] border border-white/[0.08] p-1.5 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('NEW')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'NEW'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-[#111420] shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Deposit</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('VAULT')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'VAULT'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-[#111420] shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>My Deposits ({deposits.filter((d) => !d.isWithdrawn).length})</span>
        </button>
      </div>

      {activeTab === 'NEW' ? (
        <div className="space-y-5">
          {/* Select Deposit Vault Plan */}
          <div className="space-y-2.5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Select Deposit Term
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEPOSIT_PLANS.map((plan) => {
                const isSelected = selectedPlan.id === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-4 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/10'
                        : 'bg-[#111420] border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-white">{plan.name}</span>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                        {plan.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">{plan.description}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Reward Rate: +{plan.bonusPercent}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Form */}
          <form onSubmit={handleDepositSubmit} className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 font-medium">Enter Coins to Deposit</label>
                <span className="text-[11px] text-slate-500">Min: 1,000 Coins</span>
              </div>
              <div className="relative">
                <Coins className="w-5 h-5 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="1000"
                  max={coinBalance}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-amber-500/60 focus:outline-none text-base font-mono font-bold text-white placeholder:text-slate-600"
                />
              </div>

              {/* Quick Select Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[10000, 50000, 100000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt.toString())}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-mono text-slate-300 transition-colors"
                  >
                    +{amt.toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDepositAmount(coinBalance.toString())}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-mono font-bold text-amber-400 transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Projection Summary Box */}
            <div className="rounded-xl bg-[#0B0D14] border border-white/[0.06] p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Principal Deposit</span>
                <span className="font-mono text-white font-semibold">{parsedAmount.toLocaleString()} Coins</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Bonus ({selectedPlan.bonusPercent}%)</span>
                <span className="font-mono text-emerald-400 font-semibold">+{projectedBonus.toLocaleString()} Coins</span>
              </div>
              <div className="pt-2 border-t border-white/[0.06] flex justify-between font-bold">
                <span className="text-white">Total Payout on Maturity</span>
                <span className="font-mono text-amber-400 text-sm">≈ {totalReturn.toLocaleString()} Coins</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing || parsedAmount <= 0 || parsedAmount > coinBalance}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-sm font-bold text-[#111420] transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Coins className="w-4 h-4" />
              <span>{isProcessing ? 'Processing Deposit...' : `Deposit ${parsedAmount.toLocaleString()} Coins`}</span>
            </button>
          </form>
        </div>
      ) : (
        /* My Active Deposits Tab */
        <div className="space-y-4">
          {deposits.length === 0 ? (
            <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-10 text-center space-y-3">
              <Lock className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-white">No Deposits Yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You have not deposited any coins in the vault. Select a deposit term to start earning bonus rewards.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('NEW')}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-[#111420] text-xs font-bold hover:bg-amber-400 transition-colors"
              >
                Create First Deposit
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {deposits.map((dep) => {
                const now = Date.now();
                const isMatured = dep.maturesAt <= now || dep.planId === 'flexible';
                const createdDate = new Date(dep.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
                const matureDate = new Date(dep.maturesAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={dep.id}
                    className={`rounded-2xl bg-[#111420] border p-4.5 space-y-3 transition-colors ${
                      dep.isWithdrawn
                        ? 'border-white/[0.04] opacity-50'
                        : isMatured
                        ? 'border-emerald-500/40 shadow-sm shadow-emerald-500/5'
                        : 'border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {dep.isWithdrawn ? (
                          <CheckCircle2 className="w-4 h-4 text-slate-500" />
                        ) : isMatured ? (
                          <Unlock className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="font-display text-sm font-bold text-white">{dep.planName}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                          dep.isWithdrawn
                            ? 'bg-slate-800 text-slate-400'
                            : isMatured
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {dep.isWithdrawn ? 'WITHDRAWN' : isMatured ? 'MATURED' : 'LOCKED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.06] text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400">Principal</p>
                        <p className="font-mono font-bold text-white">{dep.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Total Return</p>
                        <p className="font-mono font-bold text-emerald-400">
                          {dep.returnAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">{dep.planId === 'flexible' ? 'Deposit Date' : 'Mature Date'}</p>
                        <p className="font-mono text-slate-300">{dep.planId === 'flexible' ? createdDate : matureDate}</p>
                      </div>
                    </div>

                    {!dep.isWithdrawn && (
                      <button
                        type="button"
                        onClick={() => handleWithdrawDeposit(dep)}
                        disabled={isProcessing}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isMatured
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-[#111420] shadow-md shadow-emerald-500/20'
                            : 'bg-white/[0.08] hover:bg-white/[0.15] text-white'
                        }`}
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>
                          {isMatured
                            ? `Claim & Withdraw ${dep.returnAmount.toLocaleString()} Coins`
                            : `Early Withdraw Principal (${dep.amount.toLocaleString()} Coins)`}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
