import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  PlusCircle,
  Gift,
  Crown,
  Radio,
  Gem,
} from 'lucide-react';
import { UserProfile } from '../../types/app';
import {
  claimDepositReward,
  createDepositRecord,
  gameCoinCredit,
  subscribeDepositRecords,
  withdrawDepositPrincipal,
  DepositRecord,
  DEPOSIT_BONUS_PERCENT,
  DEPOSIT_MAX_AMOUNT,
  DEPOSIT_MIN_AMOUNT,
  DEPOSIT_REWARD_WINDOW_DAYS,
  DEPOSIT_TERM_DAYS,
} from '../../lib/firestoreService';

interface DepositViewProps {
  currentUser: UserProfile | null;
  coinBalance: number;
  onBack: () => void;
  onToast?: (title: string, desc?: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
}

// Deposits created before the 30-day migration live only in this browser.
interface LegacyDeposit {
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

interface DepositRewardTier {
  deposit: number;
  giftDiamonds: number;
  reward: number;
}

const DEPOSIT_REWARD_TIERS: DepositRewardTier[] = [
  { deposit: 200000, giftDiamonds: 300, reward: 3000 },
  { deposit: 500000, giftDiamonds: 600, reward: 7000 },
  { deposit: 1000000, giftDiamonds: 1000, reward: 15000 },
];

interface GenderRewardRules {
  id: 'female' | 'male';
  title: string;
  accent: 'pink' | 'sky';
  requirements: string[];
}

const GENDER_REWARD_RULES: GenderRewardRules[] = [
  {
    id: 'female',
    title: 'Female Deposit Reward',
    accent: 'pink',
    requirements: [
      'Go live with video for at least 5 minutes (video live or multi-guest video board).',
      'Complete 1 hour of live within 24 hours.',
      'Receive gifts from viewers.',
    ],
  },
  {
    id: 'male',
    title: 'Male Deposit Reward',
    accent: 'sky',
    requirements: [
      'Host a multi-guest video or audio board for at least 10 minutes.',
      'Complete 1 hour within 24 hours.',
      'Receive gifts from viewers.',
    ],
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function depositStatus(record: DepositRecord, now: number): string {
  if (record.principalWithdrawn) return 'CLOSED';
  if (now < record.maturesAt) return 'LOCKED';
  if (record.rewardCredited) return 'MATURED';
  return now <= record.rewardWindowEndsAt ? 'REWARD PENDING' : 'REWARD EXPIRED';
}

const formatDate = (ms: number): string =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const DepositView: React.FC<DepositViewProps> = ({
  currentUser,
  coinBalance,
  onBack,
  onToast,
}) => {
  const [depositAmount, setDepositAmount] = useState<string>('50000');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'NEW' | 'VAULT' | 'RULES'>('NEW');
  const [records, setRecords] = useState<DepositRecord[]>([]);
  const [legacyDeposits, setLegacyDeposits] = useState<LegacyDeposit[]>([]);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const autoTriedRef = useRef<Set<string>>(new Set());

  const legacyStorageKey = currentUser
    ? `addabuzz_deposits_${currentUser.uid}`
    : 'addabuzz_deposits_guest';

  // Legacy (pre-migration) deposits stored in this browser.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(legacyStorageKey);
      if (raw) setLegacyDeposits(JSON.parse(raw) as LegacyDeposit[]);
    } catch {
      // ignore malformed storage
    }
  }, [legacyStorageKey]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeDepositRecords(currentUser.uid, setRecords);
    return () => unsub();
  }, [currentUser?.uid]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const saveLegacyDeposits = (next: LegacyDeposit[]) => {
    setLegacyDeposits(next);
    try {
      localStorage.setItem(legacyStorageKey, JSON.stringify(next));
    } catch {
      // ignore storage quota
    }
  };

  // The 10% Diamond reward is applied automatically as soon as a deposit
  // matures (Spark has no scheduler, so this runs whenever the page is open).
  useEffect(() => {
    if (!currentUser) return;
    records.forEach((record) => {
      if (record.rewardCredited || record.principalWithdrawn) return;
      if (nowTick < record.maturesAt || nowTick > record.rewardWindowEndsAt) return;
      const key = `auto_${record.recordId}`;
      if (autoTriedRef.current.has(key)) return;
      autoTriedRef.current.add(key);
      claimDepositReward(currentUser.uid, record.recordId)
        .then((amount) => {
          if (amount > 0) {
            onToast?.(
              'Deposit Reward Credited!',
              `+${amount.toLocaleString()} Diamonds added automatically.`,
              'success'
            );
          }
        })
        .catch(() => {
          autoTriedRef.current.delete(key);
        });
    });
  }, [records, nowTick, currentUser, onToast]);

  const parsedAmount = Math.max(0, Math.floor(Number(depositAmount) || 0));
  const projectedReward = Math.floor((parsedAmount * DEPOSIT_BONUS_PERCENT) / 100);
  const maturesAtPreview = nowTick + DEPOSIT_TERM_DAYS * DAY_MS;

  const activeVaultCoins =
    records.filter((r) => !r.principalWithdrawn).reduce((sum, r) => sum + r.amount, 0) +
    legacyDeposits.filter((d) => !d.isWithdrawn).reduce((sum, d) => sum + d.amount, 0);

  const pendingReward = records
    .filter((r) => !r.rewardCredited && !r.principalWithdrawn)
    .reduce((sum, r) => sum + r.rewardAmount, 0);

  const activeCount =
    records.filter((r) => !r.principalWithdrawn).length +
    legacyDeposits.filter((d) => !d.isWithdrawn).length;

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onToast?.('Sign in required', 'Please sign in to deposit coins.', 'warning');
      return;
    }
    if (parsedAmount < DEPOSIT_MIN_AMOUNT) {
      onToast?.('Minimum Amount', `Minimum deposit is ${DEPOSIT_MIN_AMOUNT.toLocaleString()} Coins.`, 'warning');
      return;
    }
    if (parsedAmount > coinBalance) {
      onToast?.('Insufficient Balance', 'You do not have enough coins in your wallet.', 'error');
      return;
    }
    if (parsedAmount > DEPOSIT_MAX_AMOUNT) {
      onToast?.('Maximum Amount', `Maximum deposit is ${DEPOSIT_MAX_AMOUNT.toLocaleString()} Coins.`, 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const txKey = `dep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await createDepositRecord(currentUser.uid, parsedAmount, txKey);
      onToast?.(
        'Deposit Locked for 30 Days',
        `${parsedAmount.toLocaleString()} Coins deposited. +${projectedReward.toLocaleString()} Diamonds will be credited automatically after 30 days.`,
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

  const handleClaimReward = async (record: DepositRecord) => {
    if (!currentUser || isProcessing) return;
    setIsProcessing(true);
    try {
      const amount = await claimDepositReward(currentUser.uid, record.recordId);
      onToast?.(
        amount > 0 ? 'Reward Claimed!' : 'Already Credited',
        amount > 0
          ? `+${amount.toLocaleString()} Diamonds added to your balance.`
          : 'This deposit reward has already been credited.',
        'success'
      );
    } catch (err) {
      onToast?.(
        'Claim Failed',
        err instanceof Error ? err.message : 'Unable to claim deposit reward.',
        'warning'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdrawVault = async (record: DepositRecord) => {
    if (!currentUser || isProcessing) return;
    const early = nowTick < record.maturesAt;
    setIsProcessing(true);
    try {
      const result = await withdrawDepositPrincipal(currentUser.uid, record.recordId);
      onToast?.(
        'Principal Returned',
        `${result.amount.toLocaleString()} Coins returned to your wallet.` +
          (result.forfeitedReward ? ' Early withdrawal — Diamond reward forfeited.' : ''),
        result.forfeitedReward ? 'warning' : 'success'
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

  const handleWithdrawLegacy = async (dep: LegacyDeposit) => {
    if (!currentUser || isProcessing) return;
    const now = Date.now();
    const isMatured = dep.maturesAt <= now;
    const payoutAmount = isMatured ? dep.returnAmount : dep.amount;

    setIsProcessing(true);
    try {
      const txKey = `with_${now}_${Math.random().toString(36).slice(2, 6)}`;
      await gameCoinCredit(
        currentUser.uid,
        payoutAmount,
        `Deposit Vault Return: ${dep.planName}${isMatured ? ' (+Bonus)' : ' (Principal)'}`,
        txKey
      );
      saveLegacyDeposits(
        legacyDeposits.map((d) => (d.id === dep.id ? { ...d, isWithdrawn: true } : d))
      );
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
          <Coins className="w-5 h-5 text-amber-400" />
          <h1 className="font-display text-lg font-bold text-white">Coin Deposit</h1>
        </div>
      </div>

      {/* Vault Balance Overview Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-500/20 via-[#111420] to-emerald-500/10 border border-amber-500/20 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>30-Day Deposit Vault</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>10% Diamond</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="space-y-1">
            <p className="text-[11px] text-slate-400">Available Wallet Balance</p>
            <p className="font-mono text-2xl font-black text-white tabular-nums">
              {coinBalance.toLocaleString()}{' '}
              <span className="text-xs font-normal text-amber-400 font-sans">Coins</span>
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[11px] text-slate-400">Locked in Vault</p>
            <p className="font-mono text-2xl font-black text-amber-400 tabular-nums">
              {activeVaultCoins.toLocaleString()}{' '}
              <span className="text-xs font-normal text-amber-300 font-sans">Coins</span>
            </p>
          </div>
        </div>

        {pendingReward > 0 && (
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs">
            <span className="text-slate-400">Pending Diamond Reward</span>
            <span className="font-mono font-bold text-sky-300">
              +{pendingReward.toLocaleString()} 💎
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-[#111420] border border-white/[0.08] p-1.5 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('NEW')}
          className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
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
          className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
            activeTab === 'VAULT'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-[#111420] shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>My Deposits ({activeCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('RULES')}
          className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
            activeTab === 'RULES'
              ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Reward Rules</span>
        </button>
      </div>

      {activeTab === 'NEW' ? (
        <div className="space-y-5">
          {/* 30-Day Program */}
          <section className="rounded-2xl bg-gradient-to-br from-amber-500/[0.12] via-[#111420] to-sky-500/[0.08] border border-amber-500/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-bold text-white inline-flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{DEPOSIT_TERM_DAYS}-Day Deposit · 10% Reward</span>
              </h2>
              <span className="text-[10px] font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                +{DEPOSIT_BONUS_PERCENT}% 💎
              </span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-300 leading-snug">
              <li className="flex gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                <span>
                  Coins stay locked for {DEPOSIT_TERM_DAYS} days, then the principal returns to
                  your wallet.
                </span>
              </li>
              <li className="flex gap-2">
                <Gem className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sky-400" />
                <span>
                  {DEPOSIT_BONUS_PERCENT}% of the deposit is credited to your Diamond balance
                  automatically at maturity.
                </span>
              </li>
              <li className="flex gap-2">
                <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  The reward stays claimable for {DEPOSIT_REWARD_WINDOW_DAYS} days after maturity.
                </span>
              </li>
            </ul>
          </section>

          {/* Amount Form */}
          <form onSubmit={handleDepositSubmit} className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 font-medium">Enter Coins to Deposit</label>
                <span className="text-[11px] text-slate-500">
                  Min: {DEPOSIT_MIN_AMOUNT.toLocaleString()} · Max: {DEPOSIT_MAX_AMOUNT.toLocaleString()}
                </span>
              </div>
              <div className="relative">
                <Coins className="w-5 h-5 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={DEPOSIT_MIN_AMOUNT}
                  max={Math.min(coinBalance, DEPOSIT_MAX_AMOUNT)}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-amber-500/60 focus:outline-none text-base font-mono font-bold text-white placeholder:text-slate-600"
                />
              </div>

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
                  onClick={() =>
                    setDepositAmount(
                      String(Math.min(coinBalance, DEPOSIT_MAX_AMOUNT))
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-mono font-bold text-amber-400 transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-[#0B0D14] border border-white/[0.06] p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Principal Deposit</span>
                <span className="font-mono text-white font-semibold">
                  {parsedAmount.toLocaleString()} Coins
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Diamond Reward ({DEPOSIT_BONUS_PERCENT}%)</span>
                <span className="font-mono text-sky-300 font-semibold">
                  +{projectedReward.toLocaleString()} 💎
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Matures On</span>
                <span className="font-mono text-slate-300">{formatDate(maturesAtPreview)}</span>
              </div>
              <div className="pt-2 border-t border-white/[0.06] flex justify-between font-bold">
                <span className="text-white">Total Return</span>
                <span className="font-mono text-amber-400 text-sm">
                  {parsedAmount.toLocaleString()} Coins + {projectedReward.toLocaleString()} 💎
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing || parsedAmount < DEPOSIT_MIN_AMOUNT || parsedAmount > coinBalance}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-sm font-bold text-[#111420] transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'Processing Deposit...'
                  : `Deposit ${parsedAmount.toLocaleString()} Coins · Lock ${DEPOSIT_TERM_DAYS} days`}
              </span>
            </button>
            <p className="text-[10px] text-slate-500">
              Early withdrawal returns the principal only — the Diamond reward is forfeited.
            </p>
          </form>
        </div>
      ) : activeTab === 'VAULT' ? (
        <div className="space-y-4">
          {records.length === 0 && legacyDeposits.length === 0 ? (
            <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-10 text-center space-y-3">
              <Lock className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-white">No Deposits Yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Start a 30-day deposit to earn {DEPOSIT_BONUS_PERCENT}% Diamonds automatically on
                maturity.
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
              {records.map((record) => {
                const status = depositStatus(record, nowTick);
                const matured = nowTick >= record.maturesAt;
                const rewardClaimable =
                  !record.rewardCredited &&
                  !record.principalWithdrawn &&
                  matured &&
                  nowTick <= record.rewardWindowEndsAt;

                return (
                  <div
                    key={record.recordId}
                    className={`rounded-2xl bg-[#111420] border p-4 space-y-3 ${
                      status === 'CLOSED'
                        ? 'border-white/[0.04] opacity-60'
                        : status === 'MATURED' || status === 'REWARD PENDING'
                        ? 'border-emerald-500/40 shadow-sm shadow-emerald-500/5'
                        : 'border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {status === 'CLOSED' ? (
                          <CheckCircle2 className="w-4 h-4 text-slate-500" />
                        ) : matured ? (
                          <Unlock className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="font-display text-sm font-bold text-white">
                          {DEPOSIT_TERM_DAYS}-Day Deposit
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono ${
                          status === 'CLOSED'
                            ? 'bg-slate-800 text-slate-400'
                            : status === 'MATURED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : status === 'REWARD PENDING'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : status === 'REWARD EXPIRED'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.06] text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400">Principal</p>
                        <p className="font-mono font-bold text-white">
                          {record.amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Diamond Reward</p>
                        <p className="font-mono font-bold text-sky-300">
                          {record.rewardCredited ? 'Credited' : `+${record.rewardAmount.toLocaleString()} 💎`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Matures</p>
                        <p className="font-mono text-slate-300">{formatDate(record.maturesAt)}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {rewardClaimable && (
                        <button
                          type="button"
                          onClick={() => handleClaimReward(record)}
                          disabled={isProcessing}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 text-[#111420] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20"
                        >
                          <Gem className="w-3.5 h-3.5" />
                          <span>Claim +{record.rewardAmount.toLocaleString()} 💎 Reward</span>
                        </button>
                      )}
                      {!record.principalWithdrawn && (
                        <button
                          type="button"
                          onClick={() => handleWithdrawVault(record)}
                          disabled={isProcessing}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            matured
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-[#111420] shadow-md shadow-emerald-500/20'
                              : 'bg-white/[0.08] hover:bg-white/[0.15] text-white'
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>
                            {matured
                              ? `Withdraw Principal (${record.amount.toLocaleString()} Coins)`
                              : `Early Withdraw · Forfeits Reward (${record.amount.toLocaleString()} Coins)`}
                          </span>
                        </button>
                      )}
                      {status === 'REWARD EXPIRED' && (
                        <p className="text-[10px] text-rose-300/80 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Reward window closed — principal is still withdrawable.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {legacyDeposits.map((dep) => {
                const isMatured = dep.maturesAt <= nowTick;
                return (
                  <div
                    key={dep.id}
                    className={`rounded-2xl bg-[#111420] border p-4 space-y-3 ${
                      dep.isWithdrawn
                        ? 'border-white/[0.04] opacity-50'
                        : isMatured
                        ? 'border-emerald-500/40'
                        : 'border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {dep.isWithdrawn ? (
                          <CheckCircle2 className="w-4 h-4 text-slate-500" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="font-display text-sm font-bold text-white">
                          {dep.planName}
                          <span className="ml-2 text-[9px] font-semibold text-slate-500 uppercase">
                            Legacy
                          </span>
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-400">
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
                        <p className="text-[10px] text-slate-400">Mature Date</p>
                        <p className="font-mono text-slate-300">{formatDate(dep.maturesAt)}</p>
                      </div>
                    </div>
                    {!dep.isWithdrawn && (
                      <button
                        type="button"
                        onClick={() => handleWithdrawLegacy(dep)}
                        disabled={isProcessing}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isMatured
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-[#111420]'
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
      ) : (
        /* Deposit Reward Rules Tab */
        <div className="space-y-4">
          <section className="rounded-3xl bg-gradient-to-br from-amber-500/15 via-[#111420] to-sky-500/10 border border-amber-500/25 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h2 className="font-display text-base font-bold text-white">Deposit Rules</h2>
            </div>
            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <p className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  Deposit period is <span className="font-semibold text-white">30 days</span>.
                </span>
              </p>
              <p className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  After 30 days, <span className="font-semibold text-white">10%</span> of the
                  deposited amount is added to your{' '}
                  <span className="font-semibold text-sky-300">Diamond balance</span>{' '}
                  automatically.
                </span>
              </p>
              <p className="flex gap-2">
                <Clock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  The reward stays claimable for{' '}
                  <span className="font-semibold text-white">15 days</span>.
                </span>
              </p>
            </div>
          </section>

          {GENDER_REWARD_RULES.map((rule) => {
            const isPink = rule.accent === 'pink';
            const isMine =
              (isPink && currentUser?.gender === 'Female') ||
              (!isPink && currentUser?.gender === 'Male');
            const Icon = isPink ? Crown : Radio;

            return (
              <section
                key={rule.id}
                className={`rounded-2xl border p-4 space-y-3 ${
                  isMine
                    ? isPink
                      ? 'bg-pink-500/[0.06] border-pink-500/40'
                      : 'bg-sky-500/[0.06] border-sky-500/40'
                    : 'bg-[#111420] border-white/[0.08]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-white inline-flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isPink ? 'text-pink-400' : 'text-sky-400'}`} />
                    <span>{rule.title}</span>
                  </h3>
                  {isMine && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPink
                          ? 'bg-pink-500/20 text-pink-300'
                          : 'bg-sky-500/20 text-sky-300'
                      }`}
                    >
                      For you
                    </span>
                  )}
                </div>

                <ul className="space-y-1.5">
                  {rule.requirements.map((req) => (
                    <li key={req} className="flex gap-2 text-[11px] text-slate-300 leading-snug">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          isPink ? 'text-pink-400' : 'text-sky-400'
                        }`}
                      />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-1.5 pt-1">
                  <div className="grid grid-cols-3 gap-2 px-3 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                    <span>Deposit</span>
                    <span className="text-center">Gift Received</span>
                    <span className="text-right">Reward</span>
                  </div>
                  {DEPOSIT_REWARD_TIERS.map((tier) => (
                    <div
                      key={tier.deposit}
                      className="grid grid-cols-3 gap-2 items-center rounded-xl bg-[#0B0D14] border border-white/[0.06] px-3 py-2"
                    >
                      <span className="font-mono text-[11px] font-bold text-white tabular-nums">
                        {tier.deposit.toLocaleString()}{' '}
                        <span className="text-[9px] font-sans font-normal text-slate-400">
                          Coins
                        </span>
                      </span>
                      <span className="font-mono text-[11px] font-bold text-sky-300 tabular-nums text-center">
                        {tier.giftDiamonds.toLocaleString()} 💎
                      </span>
                      <span className="font-mono text-[11px] font-bold text-amber-300 tabular-nums text-right">
                        +{tier.reward.toLocaleString()} 💎
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          <p className="text-[10px] text-slate-500 px-1">
            Tier rewards appear under the Reward option once all conditions are met. Reward
            diamonds are added to your Diamond balance for claiming.
          </p>
        </div>
      )}
    </div>
  );
};
