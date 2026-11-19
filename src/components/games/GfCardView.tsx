import React from 'react';
import { GfCard as CardModel, RANK_LABEL, SUIT_NAME, SUIT_SYMBOL, cardLabel } from '../../games/goldenFlower/config';

interface Props {
  card?: CardModel | null;
  faceDown?: boolean;
  small?: boolean;
  delay?: number;
}

export const GfCardView: React.FC<Props> = ({ card, faceDown, small, delay = 0 }) => {
  const size = small ? 'h-12 w-9 text-[10px]' : 'h-20 w-14 text-sm';
  if (faceDown || !card) {
    return (
      <div
        className={`${size} gf-deal grid place-items-center rounded-lg border border-cyan-300/40 bg-[linear-gradient(140deg,#0E7490,#164E63)] shadow-[0_4px_14px_-6px_rgba(0,0,0,0.7)]`}
        style={{ animationDelay: `${delay}ms` }}
        aria-label="Face-down card"
      >
        <span className="text-lg text-cyan-200/80" aria-hidden="true">✦</span>
      </div>
    );
  }
  const red = card.suit === 'H' || card.suit === 'D';
  return (
    <div
      className={`${size} gf-deal relative rounded-lg border border-slate-300/60 bg-[#F8FAFC] font-bold shadow-[0_4px_14px_-6px_rgba(0,0,0,0.7)] ${red ? 'text-rose-600' : 'text-slate-900'}`}
      style={{ animationDelay: `${delay}ms` }}
      aria-label={`${RANK_LABEL[card.rank]} of ${SUIT_NAME[card.suit]}`}
    >
      <span className="absolute left-1 top-0.5 leading-none">{RANK_LABEL[card.rank]}</span>
      <span className="absolute left-1 top-3 leading-none text-[0.8em]">{SUIT_SYMBOL[card.suit]}</span>
      <span className="absolute inset-0 grid place-items-center text-[1.6em]" aria-hidden="true">{SUIT_SYMBOL[card.suit]}</span>
      <span className="sr-only">{cardLabel(card)}</span>
    </div>
  );
};