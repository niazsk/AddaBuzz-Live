import React, { useState } from 'react';
import {
  ArrowLeft,
  Gift,
  Coins,
  Gem,
  ShoppingBag,
  Sparkles,
  Search,
} from 'lucide-react';
import { GiftCatalogItem } from '../../types/app';
import { GIFT_CATALOG } from '../../data/gifts';

interface StoreViewProps {
  coinBalance: number;
  diamondBalance: number;
  onBack: () => void;
  onToast?: (title: string, desc?: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const StoreView: React.FC<StoreViewProps> = ({
  coinBalance,
  diamondBalance,
  onBack,
  onToast,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'CLASSIC' | 'PREMIUM' | 'LUXURY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGift, setSelectedGift] = useState<GiftCatalogItem | null>(null);

  const filteredGifts = GIFT_CATALOG.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedCategory === 'CLASSIC') return g.price < 500;
    if (selectedCategory === 'PREMIUM') return g.price >= 500 && g.price < 300000;
    if (selectedCategory === 'LUXURY') return g.price >= 300000;
    return true;
  });

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
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
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h1 className="font-display text-lg font-bold text-white">Store & Gift Shop</h1>
          </div>
        </div>

        {/* User Balance Chips */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono font-bold text-amber-300">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{coinBalance.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs font-mono font-bold text-sky-300">
            <Gem className="w-3.5 h-3.5 text-sky-400" />
            <span>{diamondBalance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-500/20 via-violet-600/15 to-fuchsia-600/20 border border-amber-500/25 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold">
            <Sparkles className="w-3 h-3" />
            <span>Official Gift Collection</span>
          </span>
          <h2 className="text-xl font-bold text-white">Interactive Live Gifts</h2>
          <p className="text-xs text-slate-300 max-w-md">
            Browse exclusive virtual gifts for live streaming, room celebrations, and creator appreciation.
          </p>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-950/40">
          <Gift className="w-8 h-8" />
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111420] border border-white/[0.08] w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'CLASSIC', 'PREMIUM', 'LUXURY'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-[#0B0D14] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat === 'ALL' ? 'All Gifts' : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gifts..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-[#111420] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Gifts Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredGifts.map((gift) => {
          const isSelected = selectedGift?.giftId === gift.giftId;
          return (
            <button
              key={gift.giftId}
              type="button"
              onClick={() => setSelectedGift(gift)}
              className={`group relative rounded-2xl bg-[#111420] border transition-all text-left p-3.5 flex flex-col items-center gap-2.5 ${
                isSelected
                  ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-950/50'
                  : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              {/* Gift Image */}
              <div className="w-16 h-16 rounded-xl bg-white/[0.04] p-1.5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <img
                  src={gift.imageUrl}
                  alt={gift.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to gift icon
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Details */}
              <div className="w-full text-center">
                <p className="text-xs font-semibold text-white truncate">{gift.name}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span className="font-mono text-xs font-bold text-amber-300">
                    {gift.price.toLocaleString()}
                  </span>
                </div>
              </div>

              {gift.effect && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 capitalize">
                  {gift.effect}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Gift Preview Modal / Card */}
      {selectedGift && (
        <div className="rounded-3xl bg-gradient-to-r from-amber-500/10 via-[#111420] to-[#111420] border border-amber-500/30 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 p-2 flex items-center justify-center">
              <img
                src={selectedGift.imageUrl}
                alt={selectedGift.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{selectedGift.name}</h3>
              <p className="text-xs text-slate-400">
                Cost: <span className="text-amber-400 font-bold font-mono">{selectedGift.price.toLocaleString()} Coins</span> · Effect: <span className="capitalize text-sky-400">{selectedGift.effect || 'Standard'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onToast?.(
                'Live Gift Ready',
                `"${selectedGift.name}" is available in any Live Room to send to hosts & creators!`,
                'info'
              );
              setSelectedGift(null);
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0B0D14] text-xs font-bold transition-colors shadow-md"
          >
            Send in Live Room
          </button>
        </div>
      )}
    </div>
  );
};
