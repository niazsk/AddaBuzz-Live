import React, { useMemo, useState } from 'react';
import { ArrowLeft, Coins, History } from 'lucide-react';
import { GF_SEATS, formatCoins } from '../../games/goldenFlower/config';
import { GfHistoryEntry, loadGfHistory } from '../../games/goldenFlower/engine';

interface GfHistoryViewProps {
  uid: string;
  onBack: () => void;
}

type Filter = 'ALL' | 'WIN' | 'LOSS' | 'REFUND';

export const GfHistoryView: React.FC<GfHistoryViewProps> = ({ uid, onBack }) => {
  const [filter, setFilter] = useState<Filter>('ALL');
  const entries = useMemo(() => loadGfHistory(uid), [uid]);

  const stats = useMemo(() => {
    const played = entries.filter((e) => e.outcome !== 'REFUND');
    const wins = played.filter((e) => e.outcome === 'WIN').length;
    const net = entries.reduce(
      (s, e) => s + (e.outcome === 'REFUND' ? 0 : e.payout - e.stake),
      0
    );
    return { bets: played.length, wins, net };
  }, [entries]);

  const rows = useMemo(
    () => (filter === 'ALL' ? entries : entries.filter((e) => e.outcome === filter)),
    [entries, filter]
  );

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Golden Flower"
          className="w-9 h-9 rounded-xl bg-[#111420] border border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold text-white leading-tight inline-flex items-center gap-2">
            <History className="w-5 h-5 text-amber-300" aria-hidden="true" />
            <span>Golden Flower history</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Your seat bets, payouts and refunds.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0B1220]/80 p-3 text-center">
          <p className="font-mono text-lg font-black tabular-nums text-white">{stats.bets}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Bets</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0B1220]/80 p-3 text-center">
          <p className="font-mono text-lg font-black tabular-nums text-emerald-300">{stats.wins}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Wins</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0B1220]/80 p-3 text-center">
          <p
            className={`font-mono text-lg font-black tabular-nums ${
              stats.net >= 0 ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            {stats.net >= 0 ? '+' : '−'}
            {formatCoins(Math.abs(stats.net))}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Net Coins</p>
        </div>
      </div>

      <div className="flex gap-1.5">
        {(['ALL', 'WIN', 'LOSS', 'REFUND'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
              filter === f
                ? 'bg-amber-400/15 border border-amber-300/40 text-amber-200'
                : 'bg-white/[0.04] border border-white/[0.07] text-slate-400 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="rounded-2xl border border-white/[0.07] bg-[#0B1220]/60 p-6 text-center text-xs text-slate-500">
          No bets yet — open Golden Flower, pick a chip and tap a dealer seat.
        </p>
      )}

      <div className="space-y-2">
        {rows.map((e: GfHistoryEntry) => {
          const seat = GF_SEATS[e.seat];
          const net = e.outcome === 'REFUND' ? 0 : e.payout - e.stake;
          return (
            <div
              key={e.historyId}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#0B1220]/80 px-3 py-2.5"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-base font-black italic"
                style={{ color: seat?.color, backgroundColor: `${seat?.color}1a` }}
              >
                {seat?.letter ?? '?'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-200">
                  <span
                    className={`rounded-full px-1.5 py-px text-[9px] font-black uppercase ${
                      e.outcome === 'WIN'
                        ? 'bg-emerald-400/15 text-emerald-300'
                        : e.outcome === 'LOSS'
                        ? 'bg-rose-400/15 text-rose-300'
                        : 'bg-sky-400/15 text-sky-300'
                    }`}
                  >
                    {e.outcome}
                  </span>
                  <span className="truncate font-mono text-[10px] text-slate-500">{e.roundId}</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                  <Coins className="h-3 w-3 text-amber-300" />
                  stake {formatCoins(e.stake)}
                  {e.outcome === 'WIN' && ` · paid ${formatCoins(e.payout)}`}
                  {e.outcome === 'REFUND' && ` · returned ${formatCoins(e.payout)}`}
                </p>
                <p className="truncate font-mono text-[9px] text-slate-600">{e.txRef}</p>
              </div>
              <span
                className={`shrink-0 font-mono text-sm font-black tabular-nums ${
                  net > 0 ? 'text-emerald-300' : net < 0 ? 'text-rose-300' : 'text-slate-400'
                }`}
              >
                {net > 0 ? '+' : net < 0 ? '−' : ''}
                {formatCoins(Math.abs(net))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};