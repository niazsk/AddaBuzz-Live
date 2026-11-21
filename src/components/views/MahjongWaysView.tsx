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
  Sparkles,
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
  const [activeWinBanner, setActiveWinBanner] = useState<{
    text: string;
    ways: number;
    coins: number;
  } | null>(null);
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
    setActiveWinBanner(null);

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

    const idempotencyKey = `phx_spin_${currentUser?.uid || 'guest'}_${Date.now()}`;
    const isDevMockUser = currentUser?.uid === 'dev-player-test';

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

      // 2. Prepare detailed readable banner describing what matched
      if (step.winningLines && step.winningLines.length > 0) {
        const lineNames = step.winningLines
          .map((l) => {
            const sym = TILE_SYMBOLS[l.symbolId];
            return `${sym?.chineseChar || ''} ${sym?.name.split(' ')[0] || ''} (${l.count} Reels, ${l.ways} Ways)`;
          })
          .join(' + ');

        setActiveWinBanner({
          text: lineNames,
          ways: step.winningLines.reduce((acc, l) => acc + l.ways, 0),
          coins: step.stepWin,
        });
      }

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

    // Clear banner after small delay if win sequence ended
    if (spinRes.totalWin === 0) {
      setActiveWinBanner(null);
    }

    if (spinRes.totalWin > 0 && currentUser?.uid && !isOffline && !isDevMockUser) {
      const creditKey = `phx_win_${idempotencyKey}`;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#100406] overflow-hidden select-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#991b1b]/25 via-[#2b050a]/80 to-[#0c0204] pointer-events-none" />

      {/* Main compact portrait container matching 4-5-5-5-4 mobile layout */}
      <div className="relative w-full max-w-[360px] h-full max-h-[760px] flex flex-col justify-between p-2 sm:p-2.5 overflow-hidden">
        
        {/* Top Header */}
        <div className="relative w-full flex flex-col items-center">
          <div className="w-full flex items-center justify-between px-1.5 z-20">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="w-7 h-7 rounded-full bg-black/40 border border-amber-400/30 flex items-center justify-center text-amber-200 hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            {/* "MAHJONG PHOENIX • 2,000 WAYS" */}
            <div className="flex flex-col items-center">
              <span className="font-serif font-black tracking-widest text-[10px] text-amber-200 flex items-center gap-1">
                <Flame className="w-3 h-3 text-red-500 fill-current" />
                <span>PHOENIX • 2,000 WAYS</span>
              </span>
              {isFreeSpins && (
                <span className="text-[9px] font-black text-white bg-red-600 px-2 rounded-full mt-0.5 animate-pulse">
                  FREE SPINS: {freeSpinsLeft}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleSound}
                className="w-6 h-6 rounded-full bg-black/40 border border-amber-400/20 flex items-center justify-center text-amber-200"
              >
                {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3 text-slate-400" />}
              </button>
              <button
                type="button"
                onClick={() => setShowRules(true)}
                className="w-6 h-6 rounded-full bg-black/40 border border-amber-400/20 flex items-center justify-center text-amber-200"
              >
                <HelpCircle className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Turquoise Multiplier Arch (x1 x2 x3 x5 / Free Spins: x2 x4 x6 x10) */}
          <div className="w-full mt-0.5 px-1">
            <div
              className="relative w-full py-0.5 px-3 rounded-t-xl flex items-center justify-around border-t-2 border-x-2 border-amber-300"
              style={{
                background: 'linear-gradient(180deg, #14837a 0%, #0b534d 100%)',
              }}
            >
              {multipliers.map((m, idx) => {
                const isActive = idx === multiplierIndex;
                return (
                  <div
                    key={idx}
                    className={`font-serif italic font-black transition-all ${
                      isActive
                        ? 'text-yellow-300 text-base scale-120 drop-shadow-[0_0_6px_rgba(253,224,71,0.9)]'
                        : 'text-emerald-200/75 text-xs opacity-75'
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
        <div className="relative w-full flex-1 flex flex-col justify-center px-1 py-1">
          <div
            className="relative w-full p-2 rounded-b-xl border-x-3 border-b-3 border-amber-400/90 shadow-md"
            style={{
              background: 'linear-gradient(180deg, #500d14 0%, #280507 100%)',
            }}
          >
            {/* 5 columns with [4, 5, 5, 5, 4] row layout */}
            <div className="grid grid-cols-5 gap-1 items-center">
              {grid.map((col, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-1 justify-center">
                  {col.map((tile) => (
                    <MahjongTile key={tile.id} tile={tile} isSpinning={isSpinning} />
                  ))}
                </div>
              ))}
            </div>

            {/* Clear Match Detail Indicator Banner */}
            {activeWinBanner && (
              <div className="mt-1 px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 border border-yellow-400/70 text-center shadow-lg animate-pulse">
                <div className="text-[9.5px] font-black text-yellow-300 tracking-wide truncate flex items-center justify-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
                  <span>{activeWinBanner.text}</span>
                  <span className="text-white ml-1">➔ +{formatCoins(activeWinBanner.coins)} Coins</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Total Win Banner: Cyan & Blue pill matching actual Coins Won */}
        <div className="w-full px-1.5 py-0.5">
          <div
            className="w-full py-1.5 px-3 rounded-lg border border-sky-300 flex items-center justify-between shadow-xs"
            style={{
              background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
            }}
          >
            <div className="flex flex-col leading-none">
              <span className="text-[8px] font-black italic tracking-wider text-sky-200">TOTAL</span>
              <span className="text-[9px] font-black italic tracking-wider text-white">WIN</span>
            </div>
            <div className="font-mono text-lg font-black text-amber-300 tracking-wide">
              {lastWin > 0 ? `+${formatCoins(lastWin)}` : '0'} Coins
            </div>
          </div>
        </div>

        {/* Dual Wallet & Bet Pill */}
        <div className="w-full px-1.5 py-0.5">
          <div className="grid grid-cols-2 gap-1.5">
            <div
              className="py-1.5 px-2.5 rounded-lg border border-amber-300/40 flex items-center justify-between"
              style={{
                background: 'linear-gradient(180deg, #991b1b 0%, #7f1d1d 100%)',
              }}
            >
              <div className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-[9px] font-bold text-amber-200/80">COINS</span>
              </div>
              <span className="font-mono text-xs font-black text-white">
                {formatCoins(coinBalance)}
              </span>
            </div>

            <div
              className="py-1.5 px-2.5 rounded-lg border border-amber-300/40 flex items-center justify-between"
              style={{
                background: 'linear-gradient(180deg, #991b1b 0%, #7f1d1d 100%)',
              }}
            >
              <span className="text-[9px] font-bold text-amber-200">BET</span>
              <span className="font-mono text-xs font-black text-amber-300">
                {formatCoins(bet)}
              </span>
            </div>
          </div>
        </div>

        {/* Compact Console Deck */}
        <div
          className="w-full rounded-xl py-2 px-3 border-t border-amber-400/40 flex items-center justify-between shadow-inner"
          style={{
            background: 'linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)',
          }}
        >
          {/* Turbo Toggle */}
          <button
            type="button"
            onClick={() => setIsTurbo(!isTurbo)}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
              isTurbo ? 'bg-amber-400 border-white text-black' : 'bg-black/30 border-amber-400/30 text-amber-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Minus Bet */}
          <button
            type="button"
            disabled={isSpinning || isFreeSpins}
            onClick={() => handleBetChange(-1)}
            className="w-7 h-7 rounded-full bg-black/30 border border-amber-400/30 flex items-center justify-center text-amber-200 active:scale-95 disabled:opacity-40"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Center Round Spin Button with Cyan Border */}
          <button
            type="button"
            disabled={isSpinning}
            onClick={() => handleSpin()}
            aria-label="Spin"
            className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-md active:scale-95 disabled:opacity-80"
            style={{
              background: 'radial-gradient(circle, #0284c7 0%, #0369a1 80%, #075985 100%)',
              border: '2.5px solid #38bdf8',
            }}
          >
            <div className="w-10 h-10 rounded-full bg-[#1e0708] border border-amber-400/40 flex items-center justify-center">
              <RotateCw
                className={`w-5 h-5 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.9)] ${
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
            className="w-7 h-7 rounded-full bg-black/30 border border-amber-400/30 flex items-center justify-center text-amber-200 active:scale-95 disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Auto Spin Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoSpin(!isAutoSpin)}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
              isAutoSpin ? 'bg-amber-400 border-white text-black' : 'bg-black/30 border-amber-400/30 text-amber-300'
            }`}
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isAutoSpin ? 'animate-pulse' : ''}`} />
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
