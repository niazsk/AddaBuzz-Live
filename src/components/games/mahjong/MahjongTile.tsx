import React from 'react';
import { TileState } from '../../../games/mahjongWays/engine';

interface MahjongTileProps {
  tile: TileState;
  isSpinning?: boolean;
}

export const MahjongTile: React.FC<MahjongTileProps> = ({ tile, isSpinning = false }) => {
  const isScatter = tile.isScatter;
  const isWild = tile.isWild;
  const isGold = tile.isGold && !isWild && !isScatter;
  const isWinning = tile.isWinning;

  // Exact reproduction of the tile artwork from the user's paytable screenshots:
  const renderTileSymbol = () => {
    // 1. SCATTER: Flaming 3D Golden/Red "胡"
    if (isScatter) {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute inset-0 rounded bg-gradient-to-t from-red-600/30 via-amber-500/25 to-transparent animate-pulse pointer-events-none" />
          <span
            className="text-xl sm:text-2xl font-serif font-black select-none leading-none"
            style={{
              color: '#ef4444',
              textShadow: '0 0 10px #fbbf24, 0 0 16px #ef4444, 0 2px 2px #7f1d1d',
            }}
          >
            胡
          </span>
        </div>
      );
    }

    // 2. WILD: Golden Sycee Ingot with "WILD" text
    if (isWild) {
      return (
        <div className="relative w-full h-full flex flex-col items-center justify-center leading-none">
          <span className="text-[7px] font-black tracking-widest text-amber-900 uppercase">
            WILD
          </span>
          <div className="relative flex flex-col items-center justify-center my-0.5">
            <span
              className="text-lg sm:text-xl font-serif font-black select-none leading-none"
              style={{
                color: '#b45309',
                textShadow: '0 1px 1px #fef08a, 0 0 8px #f59e0b',
              }}
            >
              金
            </span>
          </div>
          <div className="w-4 h-1.5 rounded-full bg-gradient-to-r from-purple-500 via-pink-400 to-purple-500 shadow-xs" />
        </div>
      );
    }

    // 3. GREEN DRAGON (發)
    if (tile.symbolId === 'green_dragon') {
      return (
        <span
          className="text-xl sm:text-2xl font-serif font-black select-none leading-none tracking-tight"
          style={{
            color: '#16a34a',
            textShadow: '0 1px 0 rgba(0,0,0,0.1)',
          }}
        >
          發
        </span>
      );
    }

    // 4. RED DRAGON (中)
    if (tile.symbolId === 'red_dragon') {
      return (
        <span
          className="text-xl sm:text-2xl font-serif font-black select-none leading-none tracking-tight"
          style={{
            color: '#dc2626',
            textShadow: '0 1px 0 rgba(0,0,0,0.1)',
          }}
        >
          中
        </span>
      );
    }

    // 5. WHITE DRAGON / BAI BAN (Blue double-framed rectangle)
    if (tile.symbolId === 'white_board') {
      return (
        <div className="w-4 h-6 sm:w-5 sm:h-7 rounded-[3px] border-2 border-blue-700 p-0.5 flex items-center justify-center bg-blue-50/20">
          <div className="w-full h-full rounded-[1px] border border-blue-500" />
        </div>
      );
    }

    // 6. 8 CHARACTER (八萬 - Ba Wan)
    if (tile.symbolId === 'char_8') {
      return (
        <div className="flex flex-col items-center justify-center leading-[0.85]">
          <span className="text-base sm:text-lg font-serif font-black text-blue-700">八</span>
          <span className="text-xs sm:text-sm font-serif font-black text-red-600">萬</span>
        </div>
      );
    }

    // 7. 5 DOTS (五筒 - Wu Tong)
    if (tile.symbolId === 'dot_5') {
      return (
        <div className="w-5 h-6 sm:w-6 sm:h-7 grid grid-cols-2 grid-rows-2 gap-1 p-0.5 relative place-items-center">
          <div className="w-2 h-2 rounded-full border border-blue-700 flex items-center justify-center bg-white">
            <div className="w-0.5 h-0.5 rounded-full bg-blue-700" />
          </div>
          <div className="w-2 h-2 rounded-full border border-green-700 flex items-center justify-center bg-white">
            <div className="w-0.5 h-0.5 rounded-full bg-green-700" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border border-red-600 flex items-center justify-center bg-white">
            <div className="w-1 h-1 rounded-full bg-red-600" />
          </div>
          <div className="w-2 h-2 rounded-full border border-green-700 flex items-center justify-center bg-white">
            <div className="w-0.5 h-0.5 rounded-full bg-green-700" />
          </div>
          <div className="w-2 h-2 rounded-full border border-blue-700 flex items-center justify-center bg-white">
            <div className="w-0.5 h-0.5 rounded-full bg-blue-700" />
          </div>
        </div>
      );
    }

    // 8. 5 BAMBOO (五條 - Wu Tiao)
    if (tile.symbolId === 'bamboo_5') {
      return (
        <div className="flex flex-col items-center justify-center gap-0.5">
          <div className="flex gap-1">
            <div className="w-1 h-2.5 rounded-xs bg-green-700" />
            <div className="w-1 h-2.5 rounded-xs bg-green-700" />
          </div>
          <div className="w-1 h-1.5 rounded-xs bg-red-600" />
          <div className="flex gap-1">
            <div className="w-1 h-2.5 rounded-xs bg-green-700" />
            <div className="w-1 h-2.5 rounded-xs bg-green-700" />
          </div>
        </div>
      );
    }

    // 9. 3 DOTS (三筒 - San Tong)
    if (tile.symbolId === 'dot_3') {
      return (
        <div className="flex flex-col items-center justify-center gap-1 rotate-12">
          <div className="w-2 h-2 rounded-full border border-blue-700 flex items-center justify-center bg-white">
            <div className="w-0.5 h-0.5 rounded-full bg-blue-700" />
          </div>
          <div className="w-2 h-2 rounded-full border border-red-600 flex items-center justify-center bg-white">
            <div className="w-0.5 h-0.5 rounded-full bg-red-600" />
          </div>
          <div className="w-2 h-2 rounded-full border border-green-700 flex items-center justify-center bg-white">
            <div className="w-0.5 h-0.5 rounded-full bg-green-700" />
          </div>
        </div>
      );
    }

    // 10. 2 DOTS (二筒 - Er Tong)
    if (tile.symbolId === 'dot_2') {
      return (
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full border border-blue-700 flex items-center justify-center bg-white">
            <div className="w-0.5 h-0.5 rounded-full bg-blue-700" />
          </div>
          <div className="w-2.5 h-2.5 rounded-full border border-green-700 flex items-center justify-center bg-white">
            <div className="w-0.5 h-0.5 rounded-full bg-green-700" />
          </div>
        </div>
      );
    }

    // 11. 2 BAMBOO (二條 - Er Tiao)
    return (
      <div className="flex flex-col items-center justify-center gap-1">
        <div className="w-1.5 h-3 rounded-xs bg-green-700" />
        <div className="w-1.5 h-3 rounded-xs bg-green-700" />
      </div>
    );
  };

  return (
    <div
      className={`relative w-full aspect-[3.5/4.5] rounded-lg flex items-center justify-center select-none transition-transform duration-150 ${
        isWinning ? 'scale-105 z-20 ring-2 ring-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.9)] animate-pulse' : ''
      } ${isSpinning ? 'opacity-70 blur-[0.5px]' : ''}`}
      style={{
        background: isGold
          ? 'linear-gradient(180deg, #fef08a 0%, #fde047 30%, #eab308 85%, #ca8a04 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #fafafa 55%, #f1f0eb 100%)',
        boxShadow: isGold
          ? '0 2px 0 #a16207, 0 3px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.9)'
          : '0 2px 0 #cbd5e1, 0 3px 4px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.95)',
        border: isGold ? '1px solid #eab308' : '1px solid #e2e8f0',
      }}
    >
      <div className="relative flex items-center justify-center w-full h-full p-0.5">
        {renderTileSymbol()}
      </div>

      {/* Clear golden winning frame overlay */}
      {isWinning && (
        <div className="absolute inset-0 rounded-lg bg-yellow-400/25 border-2 border-yellow-300 pointer-events-none" />
      )}
    </div>
  );
};
