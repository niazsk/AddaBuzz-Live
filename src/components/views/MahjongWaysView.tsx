import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  History,
  HelpCircle,
  Zap,
  Play,
  RotateCw,
  Plus,
  Minus,
  Coins,
  X,
  Award,
  Flame,
} from 'lucide-react';
import { MAHJONG_CONFIG, formatCoins, TILE_SYMBOLS } from '../../games/mahjongWays/config';
import {
  TileState,
  WinningLine,
  generateInitialGrid,
  executeSpin,
  SpinResult,
} from '../../games/mahjongWays/engine';
import { mahjongAudio } from '../../games/mahjongWays/audio';
import { MahjongTile } from '../games/mahjong/MahjongTile';
import { gameCoinDebit, gameCoinCredit } from '../../lib/firestoreService';

interface MahjongWaysViewProps {
  currentUser: { uid: string; displayName?: string; photoURL?: string } | null;
  coinBalance: number;
  isOffline?: boolean;
  onBack: () => void;
  onUpdateCoinBalance?: (updater: (prev: number) => number) => void;
}

interface LocalHistoryItem {
  id: string;
  time: string;
  bet: number;
  win: number;
  isBonus: boolean;
}

export const MahjongWaysView: React.FC<MahjongWaysViewProps> = ({
  currentUser,
  coinBalance,
  isOffline = false,
  onBack,
  onUpdateCoinBalance,
}) => {
  // Game states: 4-5-5-5-4 reel grid
  const [grid, setGrid] = useState<TileState[][]>(() => generateInitialGrid());
  const [bet, setBet] = useState<number>(MAHJONG_CONFIG.defaultBet);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAutoSpin, setIsAutoSpin] = useState(false);
  const [isTurbo, setIsTurbo] = useState(false);
  const [multiplierIndex, setMultiplierIndex] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [lastWin, setLastWin] = useState(0);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [showRules, setShowRules] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<LocalHistoryItem[]>([]);

  const isFreeSpins = freeSpinsLeft > 0;
  const multipliers = isFreeSpins
    ? MAHJONG_CONFIG.freeSpinMultipliers
    : MAHJONG_CONFIG.baseMultipliers;

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    mahjongAudio.setSoundEnabled(next);
  };

  const handleBetChange = (delta: number) => {
    if (isSpinning || isFreeSpins) return;
    const presets = MAHJONG_CONFIG.betPresets;
    const currentIdx = presets.indexOf(bet);
    if (currentIdx !== -1) {
      const nextIdx = Math.max(0, Math.min(presets.length - 1, currentIdx + delta));
      setBet(presets[nextIdx]);
    } else {
      setBet(Math.max(MAHJONG_CONFIG.minBet, Math.min(MAHJONG_CONFIG.maxBet, bet + delta * 10)));
    }
  };

  const handleSpin = async () => {
    if (isSpinning) return;
    setErrorMessage(null);

    const actualStake = isFreeSpins ? 0 : bet;

    if (actualStake > 0 && coinBalance < actualStake) {
      setErrorMessage(`Insufficient coins! Required: ${formatCoins(actualStake)} Coins`);
      setIsAutoSpin(false);
      return;
    }

    setIsSpinning(true);
    setLastWin(0);
    setMultiplierIndex(0);
    mahjongAudio.playSpin();

    const idempotencyKey = `phx-s-${currentUser?.uid || 'guest'}-${Date.now()}`;
    const isDevMockUser = currentUser?.uid === 'dev-player-test';

    // Optimistically deduct bet so UI reflects it immediately
    if (actualStake > 0 && onUpdateCoinBalance) {
      onUpdateCoinBalance((prev) => Math.max(0, prev - actualStake));
    }

    if (actualStake > 0 && currentUser?.uid && !isOffline && !isDevMockUser) {
      try {
        await gameCoinDebit(
          currentUser.uid,
          actualStake,
          'Mahjong Phoenix Spin',
          idempotencyKey
        );
      } catch (err) {
        console.error('Spin debit failed:', err);
        // Rollback bet deduction on failure
        if (onUpdateCoinBalance) {
          onUpdateCoinBalance((prev) => prev + actualStake);
        }
        setErrorMessage('Failed to place bet. Please check connection and try again.');
        setIsSpinning(false);
        setIsAutoSpin(false);
        return;
      }
    }

    const spinRes: SpinResult = executeSpin(bet, isFreeSpins);

    // Initial drop pause so user sees the starting layout clearly
    const dropDelay = isTurbo ? 250 : 500;
    await new Promise((r) => setTimeout(r, dropDelay));
    setGrid(spinRes.initialGrid);
    mahjongAudio.playTileDrop();

    let accumulatedWin = 0;

    // Step through each winning cascade sequence slowly so player can see exactly what matched
    for (let i = 0; i < spinRes.steps.length; i++) {
      const step = spinRes.steps[i];
      setMultiplierIndex(Math.min(i, multipliers.length - 1));

      // 1. Show matching highlighted tiles clearly
      setGrid(step.grid);
      mahjongAudio.playWin(i);

      accumulatedWin += step.stepWin;
      setLastWin(accumulatedWin);

      // Generous readable duration: let player observe the winning line & highlight!
      const observationTime = isTurbo ? 650 : 1200;
      await new Promise((r) => setTimeout(r, observationTime));
    }

    // Finished cascades
    setGrid(spinRes.finalGrid);
    setTotalWin((prev) => prev + spinRes.totalWin);
    setLastWin(spinRes.totalWin);

    // Add win coins to client balance immediately so user sees their balance increase!
    if (spinRes.totalWin > 0 && onUpdateCoinBalance) {
      onUpdateCoinBalance((prev) => prev + spinRes.totalWin);
    }

    if (spinRes.totalWin > 0 && currentUser?.uid && !isOffline && !isDevMockUser) {
      // Must match firestore.rules: isGameWinKey allows ^phx-w-.*$ and ^phx_win_.*$
      const creditKey = `phx-w-${currentUser.uid}-${Date.now()}`;
      try {
        await gameCoinCredit(
          currentUser.uid,
          spinRes.totalWin,
          'Mahjong Phoenix Win',
          creditKey
        );
      } catch (err) {
        console.error('Win credit error:', err);
      }
    }

    if (spinRes.freeSpinsTriggered) {
      mahjongAudio.playScatter();
      setFreeSpinsLeft((prev) => prev + spinRes.freeSpinsWon);
    } else if (isFreeSpins) {
      setFreeSpinsLeft((prev) => Math.max(0, prev - 1));
    }

    setHistoryList((prev) => [
      {
        id: idempotencyKey,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        bet: actualStake,
        win: spinRes.totalWin,
        isBonus: isFreeSpins || spinRes.freeSpinsTriggered,
      },
      ...prev.slice(0, 19),
    ]);

    setIsSpinning(false);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoSpin && !isSpinning && !errorMessage) {
      timer = setTimeout(() => {
        handleSpin();
      }, isTurbo ? 600 : 1200);
    }
    return () => clearTimeout(timer);
  }, [isAutoSpin, isSpinning, errorMessage]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0305] overflow-hidden select-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#b91c1c]/20 via-[#1f0307]/80 to-[#070102] pointer-events-none" />

      {/* Main compact portrait container matching 4-5-5-5-4 mobile layout */}
      <div className="relative w-full max-w-[380px] h-full max-h-[820px] flex flex-col justify-between p-2 sm:p-3 overflow-hidden">
        
        {/* Top Header */}
        <div className="relative w-full flex flex-col items-center">
          <div className="w-full flex items-center justify-between px-2 z-20 py-1">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="w-8 h-8 rounded-full bg-black/50 border border-amber-400/40 flex items-center justify-center text-amber-300 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* "MAHJONG PHOENIX • 2,000 WAYS" Header Banner */}
            <div className="flex flex-col items-center">
              <div className="px-3 py-0.5 rounded-full bg-gradient-to-r from-red-950 via-amber-950 to-red-950 border border-amber-400/50 shadow-md">
                <span className="font-serif font-black tracking-widest text-[11px] text-amber-200 flex items-center gap-1.5 drop-shadow-sm">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-current animate-pulse" />
                  <span>MAHJONG PHOENIX</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-black font-sans font-bold">2,000 WAYS</span>
                </span>
              </div>
              {isFreeSpins && (
                <span className="text-[10px] font-black text-white bg-gradient-to-r from-red-600 to-amber-600 px-3 py-0.5 rounded-full mt-1 animate-bounce shadow-lg border border-yellow-300">
                  FREE SPINS: {freeSpinsLeft}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleSound}
                className="w-8 h-8 rounded-full bg-black/50 border border-amber-400/30 flex items-center justify-center text-amber-300 hover:text-white transition-all shadow-md"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>
              <button
                type="button"
                onClick={() => setShowRules(true)}
                className="w-8 h-8 rounded-full bg-black/50 border border-amber-400/30 flex items-center justify-center text-amber-300 hover:text-white transition-all shadow-md"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Turquoise Multiplier Arch (x1 x2 x3 x5 / Free Spins: x2 x4 x6 x10) */}
          <div className="w-full mt-1 px-1">
            <div
              className="relative w-full py-1.5 px-4 rounded-t-2xl flex items-center justify-around border-t-2 border-x-2 border-amber-400 shadow-md"
              style={{
                background: 'linear-gradient(180deg, #0d736a 0%, #06403a 100%)',
              }}
            >
              {/* Gold Temple Roof Wing Accent Left */}
              <div className="absolute -left-1 top-0 w-2.5 h-2.5 bg-amber-400 rounded-tl-sm rotate-45 pointer-events-none" />
              {/* Gold Temple Roof Wing Accent Right */}
              <div className="absolute -right-1 top-0 w-2.5 h-2.5 bg-amber-400 rounded-tr-sm rotate-45 pointer-events-none" />

              {multipliers.map((m, idx) => {
                const isActive = idx === multiplierIndex;
                return (
                  <div
                    key={idx}
                    className={`font-serif italic font-black transition-all ${
                      isActive
                        ? 'text-yellow-300 text-lg sm:text-xl scale-125 drop-shadow-[0_0_8px_rgba(253,224,71,1)]'
                        : 'text-emerald-200/60 text-xs sm:text-sm'
                    }`}
                  >
                    x{m}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Authentic 4-5-5-5-4 Tile Grid Frame */}
        <div className="relative w-full flex-1 flex flex-col justify-center px-1">
          <div
            className="relative w-full p-2.5 rounded-b-2xl border-x-2 border-b-2 border-amber-400/90 shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, #430a10 0%, #200406 100%)',
              boxShadow: 'inset 0 0 16px rgba(0,0,0,0.8), 0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            {/* 5 columns with [4, 5, 5, 5, 4] row layout */}
            <div className="grid grid-cols-5 gap-1.5 items-center">
              {grid.map((col, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-1.5 justify-center">
                  {col.map((tile) => (
                    <MahjongTile key={tile.id} tile={tile} isSpinning={isSpinning} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Total Win Banner: Cyan & Deep Blue pill */}
        <div className="w-full px-1.5 py-1">
          <div
            className="w-full py-1.5 px-3.5 rounded-xl border border-sky-300/80 flex items-center justify-between shadow-md"
            style={{
              background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
            }}
          >
            <div className="flex flex-col leading-none">
              <span className="text-[8px] font-black italic tracking-widest text-sky-200">TOTAL</span>
              <span className="text-[10px] font-black italic tracking-widest text-white">WIN</span>
            </div>
            <div className="font-mono text-xl font-black text-amber-300 tracking-wider drop-shadow-sm">
              {lastWin > 0 ? `+${formatCoins(lastWin)}` : '0'} <span className="text-xs text-white/90">Coins</span>
            </div>
          </div>
        </div>

        {/* Dual Wallet & Bet Pill */}
        <div className="w-full px-1.5 py-0.5">
          <div className="grid grid-cols-2 gap-2">
            <div
              className="py-1.5 px-3 rounded-xl border border-amber-300/30 flex items-center justify-between shadow-xs"
              style={{
                background: 'linear-gradient(180deg, #7f1d1d 0%, #5c1414 100%)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-300" />
                <span className="text-[10px] font-bold text-amber-200/90">COINS</span>
              </div>
              <span className="font-mono text-xs sm:text-sm font-black text-white">
                {formatCoins(coinBalance)}
              </span>
            </div>

            <div
              className="py-1.5 px-3 rounded-xl border border-amber-300/30 flex items-center justify-between shadow-xs"
              style={{
                background: 'linear-gradient(180deg, #7f1d1d 0%, #5c1414 100%)',
              }}
            >
              <span className="text-[10px] font-bold text-amber-200">BET</span>
              <span className="font-mono text-xs sm:text-sm font-black text-amber-300">
                {formatCoins(bet)}
              </span>
            </div>
          </div>
        </div>

        {/* Compact Console Deck */}
        <div
          className="w-full rounded-2xl py-2 px-3 border border-amber-400/40 flex items-center justify-between shadow-2xl mt-1"
          style={{
            background: 'linear-gradient(180deg, #601015 0%, #35080c 100%)',
          }}
        >
          {/* Turbo Toggle */}
          <button
            type="button"
            onClick={() => setIsTurbo(!isTurbo)}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all shadow-md active:scale-95 ${
              isTurbo ? 'bg-amber-400 border-white text-black font-black' : 'bg-black/40 border-amber-400/40 text-amber-300'
            }`}
            title={isTurbo ? 'Turbo Mode: On' : 'Turbo Mode: Off'}
          >
            <Zap className="w-4 h-4 fill-current" />
          </button>

          {/* Minus Bet */}
          <button
            type="button"
            disabled={isSpinning || isFreeSpins}
            onClick={() => handleBetChange(-1)}
            className="w-8 h-8 rounded-full bg-black/40 border border-amber-400/40 flex items-center justify-center text-amber-200 active:scale-95 disabled:opacity-30 shadow-md hover:bg-black/60 transition-all"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Center Round Spin Button with Cyan/Sky Glowing Outer Ring */}
          <button
            type="button"
            disabled={isSpinning}
            onClick={() => handleSpin()}
            aria-label="Spin"
            className="relative w-15 h-15 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.5)] active:scale-95 disabled:opacity-85 transition-all group"
            style={{
              background: 'radial-gradient(circle, #38bdf8 0%, #0284c7 60%, #0369a1 100%)',
              border: '3px solid #7dd3fc',
            }}
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-[#2a060a] to-[#120204] border-2 border-amber-400/70 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <RotateCw
                className={`w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)] ${
                  isSpinning ? 'animate-spin' : ''
                }`}
              />
            </div>
          </button>

          {/* Plus Bet */}
          <button
            type="button"
            disabled={isSpinning || isFreeSpins}
            onClick={() => handleBetChange(1)}
            className="w-8 h-8 rounded-full bg-black/40 border border-amber-400/40 flex items-center justify-center text-amber-200 active:scale-95 disabled:opacity-30 shadow-md hover:bg-black/60 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Auto Spin Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoSpin(!isAutoSpin)}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all shadow-md active:scale-95 ${
              isAutoSpin ? 'bg-amber-400 border-white text-black font-black' : 'bg-black/40 border-amber-400/40 text-amber-300'
            }`}
            title={isAutoSpin ? 'Auto Spin: On' : 'Auto Spin: Off'}
          >
            <Play className={`w-4 h-4 fill-current ${isAutoSpin ? 'animate-pulse' : ''}`} />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="absolute top-12 left-4 right-4 z-40 bg-red-600 border border-red-300 text-white p-2 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Rules Modal (Mahjong Phoenix Details) */}
        {showRules && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#240307] border border-amber-400 rounded-2xl max-w-xs w-full p-3.5 text-amber-100 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-amber-500/40">
                <h3 className="font-serif text-sm font-bold text-amber-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Mahjong Phoenix Rules
                </h3>
                <button type="button" onClick={() => setShowRules(false)} className="text-slate-300 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2.5 space-y-1.5 text-[11px] leading-relaxed">
                <p>• <strong>Consecutive 3-Reel Match:</strong> Wins require matching symbols consecutively starting from Reel 1 through Reel 2 to Reel 3 ($2,000\text{ Ways}$).</p>
                <p>• <strong>Golden Symphony:</strong> Gold-plated tiles on reels 2, 3, and 4 transform into Wilds (金) on cascade win.</p>
                <p>• <strong>Multiplier Marvel:</strong> Cascades scale multipliers $x1 \to x2 \to x3 \to x5$ in base game.</p>
                <p>• <strong>Free Games Extravaganza:</strong> 3+ Scatters award 10 Free Spins with 100% Gold Reel 3 and doubled multipliers ($x2 \to x4 \to x6 \to x10$).</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
