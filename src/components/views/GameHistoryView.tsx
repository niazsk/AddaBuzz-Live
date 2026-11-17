import React, { useMemo, useState } from 'react';
import { ArrowLeft, Coins, History, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { UserProfile } from '../../types/app';
import { FRUIT_BY_ID, formatCoins } from '../../games/fruitManor/config';
import { FmHistoryEntry, loadFmHistory } from '../../games/fruitManor/engine';
import { FruitIcon } from '../games/FruitIcon';

interface GameHistoryViewProps {
  currentUser: UserProfile;
  onBack: () => void;
}

type Filter = 'ALL' | 'WIN' | 'LOSS' | 'REFUND';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'WIN', label: 'Wins' },
  { id: 'LOSS', label: 'Losses' },
  { id: 'REFUND', label: 'Refunds' },
];

const PAGE_SIZE = 10;

function timeLabel(at: number): string {
  const d = new Date(at);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const GameHistoryView: React.FC<GameHistoryViewProps> = ({ currentUser, onBack }) => {
  const [entries] = useState<FmHistoryEntry[]>(() => loadFmHistory(currentUser.uid));
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(0);

  const stats = useMemo(() => {
    const settled = entries.filter((e) => e.outcome !== 'REFUND');
    const staked = settled.reduce((s, e) => s + e.stake, 0);
    const returned = settled.reduce((s, e) => s + e.payout, 0);
    const wins = settled.filter((e) => e.outcome === 'WIN').length;
    const rounds = new Set(settled.map((e) => e.roundId)).size;
    return { staked, returned, net: returned - staked, wins, rounds, played: settled.length };
  }, [entries]);

  const filtered = useMemo(
    () => (filter === 'ALL' ? entries : entries.filter((e) => e.outcome === filter)),
    [entries, filter]
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="fm-root relative -mx-4 -mt-6 min-h-[calc(100vh-52px)] overflow-x-hidden px-3 pb-24 pt-2 sm:-mx-6 sm:px-4 lg:-mx-8 lg:px-6 lg:pb-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[#07130D]" />
        <div className="fm-glow-a absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(20,83,45,0.55),transparent)] blur-2xl" />
        <div className="absolute -bottom-40 -right-24 h-[380px] w-[380px] rounded-full bg-[radial-gradient(closest-side,rgba(245,185,63,0.10),transparent)] blur-2xl" />
        <div className="fm-grain absolute inset-0 opacity-[0.05]" />
      </div>

      <div className="relative mx-auto w-full max-w-[720px]">
        <header className="flex items-center gap-2 py-1">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Fruit Manor"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-200 transition-colors hover:bg-white/[0.1]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-300/25 bg-gradient-to-br from-emerald-500/30 to-amber-500/20">
            <History className="h-4.5 w-4.5 text-emerald-200" />
          </div>
          <div className="min-w-0 leading-tight">
            <h1 className="font-display truncate text-base font-extrabold tracking-tight text-[#F7F3E8]">My game history</h1>
            <p className="truncate text-[10px] text-slate-400">Fruit Manor · every bet, win and refund with ledger references</p>
          </div>
        </header>

        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0B1F16]/85 px-3 py-2">
            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-200/60">
              <Trophy className="h-3 w-3" /> Rounds played
            </p>
            <p className="mt-0.5 font-mono text-lg font-black tabular-nums text-[#F7F3E8]">{stats.rounds}</p>
            <p className="text-[9px] text-slate-500">{stats.played} settled bets</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#0B1F16]/85 px-3 py-2">
            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-200/60">
              <Coins className="h-3 w-3" /> Total staked
            </p>
            <p className="mt-0.5 font-mono text-lg font-black tabular-nums text-amber-300">{formatCoins(stats.staked)}</p>
            <p className="text-[9px] text-slate-500">coins wagered</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#0B1F16]/85 px-3 py-2">
            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-200/60">
              <TrendingUp className="h-3 w-3" /> Total returned
            </p>
            <p className="mt-0.5 font-mono text-lg font-black tabular-nums text-emerald-300">{formatCoins(stats.returned)}</p>
            <p className="text-[9px] text-slate-500">{stats.wins} winning bets</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#0B1F16]/85 px-3 py-2">
            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-200/60">
              {stats.net >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} Net result
            </p>
            <p className={`mt-0.5 font-mono text-lg font-black tabular-nums ${stats.net > 0 ? 'text-emerald-300' : stats.net < 0 ? 'text-rose-300' : 'text-slate-200'}`}>
              {stats.net > 0 ? `+${formatCoins(stats.net)}` : stats.net < 0 ? `−${formatCoins(-stats.net)}` : '±0'}
            </p>
            <p className="text-[9px] text-slate-500">coins overall</p>
          </div>
        </div>

        <div className="mt-2.5 rounded-2xl border border-white/[0.08] bg-[#0B1F16]/85 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1" role="group" aria-label="Filter history">
              {FILTERS.map((f) => {
                const count = f.id === 'ALL' ? entries.length : entries.filter((e) => e.outcome === f.id).length;
                const selected = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFilter(f.id);
                      setPage(0);
                    }}
                    aria-pressed={selected}
                    className={`rounded-full border px-2 py-1 text-[10px] font-bold transition-colors ${
                      selected
                        ? 'border-amber-300/50 bg-amber-400/15 text-amber-300'
                        : 'border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
                    }`}
                  >
                    {f.label} <span className="font-mono tabular-nums opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
            {filtered.length > 0 && (
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous history page"
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="grid h-6 w-6 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 disabled:opacity-35"
                >
                  <ArrowLeft className="h-3 w-3" />
                </button>
                <span className="font-mono text-[10px] tabular-nums text-slate-400">
                  {safePage + 1}/{pageCount}
                </span>
                <button
                  type="button"
                  aria-label="Next history page"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  className="grid h-6 w-6 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 disabled:opacity-35"
                >
                  <ArrowLeft className="h-3 w-3 rotate-180" />
                </button>
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="grid place-items-center py-10 text-center">
              <FruitIcon fruitId="grapes" className="h-10 w-10 opacity-60" />
              <p className="mt-2 text-xs font-semibold text-slate-300">
                {entries.length === 0 ? 'No bets yet' : 'Nothing in this filter'}
              </p>
              <p className="mt-1 max-w-[260px] text-[10px] leading-relaxed text-slate-500">
                {entries.length === 0
                  ? 'Play a round of Fruit Manor — every win, loss and refund will appear here with its wallet ledger reference.'
                  : 'Try another filter to see the rest of your history.'}
              </p>
            </div>
          ) : (
            <div className="mt-2 space-y-1">
              {rows.map((h) => {
                const f = FRUIT_BY_ID.get(h.fruitId);
                return (
                  <div key={h.historyId} className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-2 py-1.5">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border bg-black/30"
                      style={{ borderColor: `${f?.accentHex ?? '#fff'}55` }}
                    >
                      <FruitIcon fruitId={h.fruitId} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[11px] font-semibold text-[#EAF5EC]">
                        {f?.label ?? h.fruitId} ×{h.multiplier}
                        <span className="ml-1.5 font-mono text-[8px] font-normal text-slate-500">{h.roundId}</span>
                      </p>
                      <p className="truncate font-mono text-[8px] text-slate-500">
                        {h.txRef} · {timeLabel(h.at)}
                      </p>
                    </div>
                    <span
                      className={`ml-auto shrink-0 rounded px-1.5 py-px text-[8px] font-black uppercase ${
                        h.outcome === 'WIN'
                          ? 'bg-emerald-400/15 text-emerald-300'
                          : h.outcome === 'REFUND'
                            ? 'bg-sky-400/15 text-sky-300'
                            : 'bg-rose-400/15 text-rose-300'
                      }`}
                    >
                      {h.outcome}
                    </span>
                    <div className="w-16 shrink-0 text-right leading-tight">
                      <p className={`font-mono text-[11px] font-bold tabular-nums ${h.outcome === 'LOSS' ? 'text-rose-300' : 'text-emerald-300'}`}>
                        {h.outcome === 'LOSS' ? `−${formatCoins(h.stake)}` : `+${formatCoins(h.payout)}`}
                      </p>
                      <p className="font-mono text-[8px] tabular-nums text-slate-500">stake {formatCoins(h.stake)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="mt-2 pb-1 text-center text-[9px] leading-relaxed text-emerald-200/40">
          History keeps your latest 200 entries on this device. Wallet debits and credits also appear in your Coin transaction ledger.
        </p>
      </div>
    </div>
  );
};