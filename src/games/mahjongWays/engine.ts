// Exact Implementation of Official Mahjong Phoenix Game Logic (from User's Paytable Screenshots):
// 1. 4-5-5-5-4 Reel Grid = exactly 2,000 Ways (4 * 5 * 5 * 5 * 4).
// 2. Ways-to-Win:
//    - Matching combinations evaluated from left to right on adjacent reels starting from Reel 1.
//    - Ways = count(Reel 1) * count(Reel 2) * count(Reel 3)...
//    - Payout per Way = TotalBet * PaytableMultiplier. Total Line Win = TotalBet * PaytableMultiplier * Ways * CascadeMultiplier.
// 3. Gold-Plated Symbol Feature (Base Game):
//    - Regular symbols on reels 2, 3, 4 (cols 1, 2, 3) can appear in gold.
//    - On any cascade, winning gold-plated symbols transform directly into WILD symbols on the next cascade.
// 4. Free Spins Feature:
//    - 3 Scatters trigger 10 Free Spins (+2 per additional scatter). Free Spins can be retriggered!
//    - CRITICAL RULE (from Screenshot 3):
//      "All symbols (excluding Wild and Scatter) in reel 3 will appear in gold."
//    - Progressive multipliers in Free Spins are boosted to: x2 -> x4 -> x6 -> x10!
// 5. Progressive Multiplier Feature:
//    - Base Game: 1st cascade = x1, 2nd cascade = x2, 3rd cascade = x3, 4th and beyond = x5.

import { TILE_SYMBOLS, MAHJONG_CONFIG } from './config';

export interface TileState {
  id: string;
  symbolId: string;
  isGold: boolean;
  isWild: boolean;
  isScatter: boolean;
  isWinning?: boolean;
}

export interface WinningLine {
  symbolId: string;
  count: number;
  ways: number;
  baseMultiplier: number;
  totalWin: number;
  matchedPositions: { col: number; row: number }[];
}

export interface CascadeStep {
  grid: TileState[][];
  winningLines: WinningLine[];
  stepWin: number;
  multiplier: number;
  scatterCount: number;
}

export interface SpinResult {
  initialGrid: TileState[][];
  steps: CascadeStep[];
  finalGrid: TileState[][];
  totalWin: number;
  freeSpinsTriggered: boolean;
  freeSpinsWon: number;
  scatterCount: number;
}

const REEL_OUTER_POOL: string[] = []; // Reels 1 & 5: No Wilds
const REEL_CENTER_POOL: string[] = []; // Reels 2, 3, 4: Can have Wilds

for (const [symId, def] of Object.entries(TILE_SYMBOLS)) {
  for (let i = 0; i < def.weight; i++) {
    REEL_CENTER_POOL.push(symId);
    if (!def.isWild) {
      REEL_OUTER_POOL.push(symId);
    }
  }
}

let tileCounter = 0;
export function createTile(colIdx: number, isFreeSpins = false, forceSymbol?: string, forceGold = false): TileState {
  tileCounter++;
  const pool = (colIdx >= 1 && colIdx <= 3) ? REEL_CENTER_POOL : REEL_OUTER_POOL;
  const symbolId = forceSymbol || pool[Math.floor(Math.random() * pool.length)];
  const def = TILE_SYMBOLS[symbolId];
  const isSpecial = def.isWild || def.isScatter;

  // RULE from Paytable Screenshot 3:
  // "All symbols (excluding Wild and Scatter) in reel 3 will appear in gold." in Free Spins!
  let isGold = false;
  if (!isSpecial) {
    if (isFreeSpins && colIdx === 2) {
      // Reel 3 is 100% GOLD in Free Spins!
      isGold = true;
    } else if (colIdx >= 1 && colIdx <= 3) {
      // Reels 2, 3, 4 have random chance of gold
      isGold = forceGold || Math.random() < MAHJONG_CONFIG.baseGoldTileChance;
    }
  }

  return {
    id: `phx_${Date.now()}_${tileCounter}_${Math.random().toString(36).substring(2, 6)}`,
    symbolId,
    isGold,
    isWild: !!def.isWild,
    isScatter: !!def.isScatter,
  };
}

export function generateInitialGrid(isFreeSpins = false): TileState[][] {
  const grid: TileState[][] = [];
  for (let c = 0; c < MAHJONG_CONFIG.cols; c++) {
    const colRows = MAHJONG_CONFIG.rowCounts[c];
    const col: TileState[] = [];
    for (let r = 0; r < colRows; r++) {
      col.push(createTile(c, isFreeSpins));
    }
    grid.push(col);
  }
  return grid;
}

export function cloneGrid(grid: TileState[][]): TileState[][] {
  return grid.map(col => col.map(tile => ({ ...tile })));
}

// 2,000 Ways evaluation matching Screenshot 4:
// Example from screenshot: "1 x 1 x 2 x 1 x 1 = 2 Ways. Total Winnings: 0.5 x 2 = 1"
export function evaluateWins(
  grid: TileState[][],
  currentMultiplier: number,
  betStake: number
): { winningLines: WinningLine[]; stepWin: number; matchedPositions: Set<string> } {
  const numCols = grid.length;
  const matchedPositions = new Set<string>();
  const winningLines: WinningLine[] = [];

  const candidateSymbols = Object.keys(TILE_SYMBOLS).filter(
    k => !TILE_SYMBOLS[k].isScatter && !TILE_SYMBOLS[k].isWild
  );

  for (const symId of candidateSymbols) {
    const def = TILE_SYMBOLS[symId];
    const matchingColCounts: number[] = [];
    const positionsInCol: { col: number; row: number }[][] = [];

    // Leftmost reel (Reel 1 / Col 0) must contain symbol
    for (let c = 0; c < numCols; c++) {
      const hitsInThisCol: { col: number; row: number }[] = [];
      const colRows = grid[c].length;

      for (let r = 0; r < colRows; r++) {
        const tile = grid[c][r];
        // Wild on reels 2, 3, 4 substitutes for any symbol
        if (tile && (tile.symbolId === symId || (c > 0 && tile.isWild))) {
          hitsInThisCol.push({ col: c, row: r });
        }
      }

      if (hitsInThisCol.length > 0) {
        matchingColCounts.push(hitsInThisCol.length);
        positionsInCol.push(hitsInThisCol);
      } else {
        break; // Ways must be strictly adjacent from left to right
      }
    }

    const consecutiveCols = matchingColCounts.length;
    // 3, 4, or 5 consecutive reels matching gives a win
    if (consecutiveCols >= 3) {
      // Calculate Ways = product of matching symbol counts on each consecutive reel
      const ways = matchingColCounts.reduce((acc, count) => acc * count, 1);
      const symbolPayoutMultiplier = def.payoutMultipliers[consecutiveCols] || 0;

      if (symbolPayoutMultiplier > 0) {
        // Formula matching Screenshot 4: TotalBet * SymbolPayoutMultiplier * Ways * CascadeMultiplier
        const totalWin = Math.round(betStake * symbolPayoutMultiplier * ways * currentMultiplier);

        const allMatched = positionsInCol.flat();
        for (const pos of allMatched) {
          matchedPositions.add(`${pos.col},${pos.row}`);
        }

        winningLines.push({
          symbolId: symId,
          count: consecutiveCols,
          ways,
          baseMultiplier: symbolPayoutMultiplier,
          totalWin,
          matchedPositions: allMatched,
        });
      }
    }
  }

  const stepWin = winningLines.reduce((acc, l) => acc + l.totalWin, 0);
  return { winningLines, stepWin, matchedPositions };
}

// Complete Mahjong Phoenix spin execution
export function executeSpin(
  betStake: number,
  isFreeSpins = false
): SpinResult {
  let grid = generateInitialGrid(isFreeSpins);

  const initialGrid = cloneGrid(grid);
  const steps: CascadeStep[] = [];
  const multipliers = isFreeSpins ? MAHJONG_CONFIG.freeSpinMultipliers : MAHJONG_CONFIG.baseMultipliers;

  let cascadeIndex = 0;
  let totalWin = 0;

  // Count Scatters on board
  let scatterCount = 0;
  for (let c = 0; c < grid.length; c++) {
    for (let r = 0; r < grid[c].length; r++) {
      if (grid[c][r]?.isScatter) scatterCount++;
    }
  }

  while (true) {
    const currentMultiplier = multipliers[Math.min(cascadeIndex, multipliers.length - 1)];
    const evalResult = evaluateWins(grid, currentMultiplier, betStake);

    if (evalResult.winningLines.length === 0) {
      break;
    }

    totalWin += evalResult.stepWin;

    const stepGrid = cloneGrid(grid);
    for (const posStr of evalResult.matchedPositions) {
      const [c, r] = posStr.split(',').map(Number);
      if (stepGrid[c][r]) {
        stepGrid[c][r].isWinning = true;
      }
    }

    steps.push({
      grid: stepGrid,
      winningLines: evalResult.winningLines,
      stepWin: evalResult.stepWin,
      multiplier: currentMultiplier,
      scatterCount,
    });

    // Gold-Plated Transformation Rule (from Screenshot 1):
    // "Every new round after the new symbols have cascaded down, any gold-plated symbols
    // that is involved in a win in previous round will be transformed into Wild symbol."
    const nextGrid: TileState[][] = [];
    for (let c = 0; c < MAHJONG_CONFIG.cols; c++) {
      const targetRowCount = MAHJONG_CONFIG.rowCounts[c];
      const newCol: TileState[] = [];

      for (let r = 0; r < grid[c].length; r++) {
        const isMatched = evalResult.matchedPositions.has(`${c},${r}`);
        const currentTile = grid[c][r];

        if (isMatched) {
          if (currentTile.isGold && !currentTile.isWild) {
            // Gold tile transforms into Wild symbol for the next cascade!
            newCol.push(createTile(c, isFreeSpins, 'wild'));
          }
          // Regular winning tiles vanish
        } else {
          newCol.push(currentTile);
        }
      }

      // Replenish reel from above to maintain exact 4-5-5-5-4 height
      while (newCol.length < targetRowCount) {
        newCol.unshift(createTile(c, isFreeSpins));
      }
      nextGrid.push(newCol);
    }

    grid = nextGrid;
    cascadeIndex++;

    if (cascadeIndex > 15) break;
  }

  // 3 Scatters trigger 10 Free Spins (+2 per additional scatter)
  const freeSpinsTriggered = scatterCount >= MAHJONG_CONFIG.scattersForBonus;
  const extraScatters = Math.max(0, scatterCount - MAHJONG_CONFIG.scattersForBonus);
  const freeSpinsWon = freeSpinsTriggered
    ? MAHJONG_CONFIG.freeSpinsAwarded + extraScatters * MAHJONG_CONFIG.extraFreeSpinsPerScatter
    : 0;

  return {
    initialGrid,
    steps,
    finalGrid: grid,
    totalWin: Math.round(totalWin),
    freeSpinsTriggered,
    freeSpinsWon,
    scatterCount,
  };
}
