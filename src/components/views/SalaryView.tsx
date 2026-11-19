import React, { useState } from 'react';
import { ArrowLeft, Banknote, Calendar, CheckCircle2, Clock, DollarSign, Download, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../../types/app';

interface SalaryViewProps {
  currentUser: UserProfile | null;
  diamondBalance: number;
  onBack: () => void;
}

export const SalaryView: React.FC<SalaryViewProps> = ({
  currentUser,
  diamondBalance,
  onBack,
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'BKASH' | 'NAGAD' | 'BANK'>('BKASH');
  const [accountNumber, setAccountNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Conversion: 10,000 Diamonds = $1.00 USD (approx 120 BDT)
  const usdRate = (diamondBalance / 10000).toFixed(2);
  const bdtRate = Math.floor((diamondBalance / 10000) * 122);

  const history = [
    { id: 'sal_01', month: 'October 2026', diamonds: '500,000', bdt: '৳ 6,100', status: 'PAID', date: 'Nov 05, 2026' },
    { id: 'sal_02', month: 'September 2026', diamonds: '320,000', bdt: '৳ 3,904', status: 'PAID', date: 'Oct 05, 2026' },
  ];

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="space-y-6 pb-12">
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
          <Banknote className="w-5 h-5 text-amber-400" />
          <h1 className="font-display text-lg font-bold text-white">Creator & Host Salary</h1>
        </div>
      </div>

      {/* Salary Overview Card */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-500/20 via-[#111420] to-orange-500/10 border border-amber-500/20 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Withdrawable Creator Revenue
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Monthly Cycle
          </span>
        </div>

        <div className="space-y-1">
          <p className="font-mono text-3xl font-black text-amber-400">
            ৳ {bdtRate.toLocaleString()}
          </p>
          <p className="text-xs font-mono text-slate-400">
            ≈ ${usdRate} USD ({diamondBalance.toLocaleString()} Diamonds)
          </p>
        </div>

        <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-300">
          <span>Target Settlement: <strong>1st - 5th of every month</strong></span>
          <span className="text-emerald-400 font-medium">Automatic / Manual</span>
        </div>
      </div>

      {/* Withdrawal Request */}
      <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-4">
        <h2 className="font-display text-sm font-semibold text-white">
          Request Salary Settlement
        </h2>

        {submitted ? (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center space-y-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
            <p className="text-xs font-bold text-white">Settlement Request Submitted</p>
            <p className="text-[11px] text-slate-400">
              Payment will be transferred to your {payoutMethod} account ({accountNumber}) by the next finance payout cycle.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setAccountNumber('');
                setWithdrawAmount('');
              }}
              className="text-xs text-emerald-400 hover:underline pt-1"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleWithdraw} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(['BKASH', 'NAGAD', 'BANK'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayoutMethod(m)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                    payoutMethod === m
                      ? 'bg-amber-500 text-[#111420] border-amber-400'
                      : 'bg-[#0B0D14] text-slate-400 border-white/[0.08]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Payout Account / IBAN</label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Enter personal account number"
                className="w-full h-11 px-4 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-amber-500/60 focus:outline-none text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Amount to Settle (BDT)</label>
              <input
                type="number"
                min="500"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={`Max available: ৳ ${bdtRate}`}
                className="w-full h-11 px-4 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-amber-500/60 focus:outline-none text-xs text-white font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-xs font-bold text-[#111420] transition-all"
            >
              Submit Settlement Request
            </button>
          </form>
        )}
      </section>

      {/* Salary History */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          Settlement History
        </h3>
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
          {history.map((h) => (
            <div key={h.id} className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white">{h.month}</p>
                <p className="text-[10px] text-slate-400">Processed on {h.date}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs font-bold text-emerald-400">{h.bdt}</p>
                <span className="text-[10px] text-slate-500 font-mono">{h.diamonds} 💎</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
