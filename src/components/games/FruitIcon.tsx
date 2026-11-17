import React, { useId } from 'react';
import { FruitId } from '../../games/fruitManor/config';

interface FruitIconProps {
  fruitId: FruitId;
  className?: string;
}

export const FruitIcon: React.FC<FruitIconProps> = ({ fruitId, className }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const g = (name: string) => `${name}${uid}`;
  const url = (name: string) => `url(#${g(name)})`;

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={g('straw')} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FF8FA3" />
          <stop offset="55%" stopColor="#FF4D6D" />
          <stop offset="100%" stopColor="#C81E4E" />
        </radialGradient>
        <radialGradient id={g('apple')} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FF8A8A" />
          <stop offset="55%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#B01235" />
        </radialGradient>
        <linearGradient id={g('banana')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="55%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#D99E06" />
        </linearGradient>
        <radialGradient id={g('orange')} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="55%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#D9640F" />
        </radialGradient>
        <radialGradient id={g('grape')} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="55%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#701AC7" />
        </radialGradient>
        <radialGradient id={g('cherry')} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="55%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#9F0729" />
        </radialGradient>
        <radialGradient id={g('melon')} cx="50%" cy="20%" r="90%">
          <stop offset="0%" stopColor="#FF7B8E" />
          <stop offset="60%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#D01B44" />
        </radialGradient>
        <linearGradient id={g('rind')} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
        <radialGradient id={g('plum')} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="55%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#5B21B6" />
        </radialGradient>
        <linearGradient id={g('leaf')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#86EFAC" />
          <stop offset="100%" stopColor="#16A34A" />
        </linearGradient>
      </defs>

      {fruitId === 'strawberry' && (
        <g>
          <path d="M32 16 C43 14 53 21 53 31 C53 45 43 55 32 58 C21 55 11 45 11 31 C11 21 21 14 32 16 Z" fill={url('straw')} />
          <path d="M32 16 C43 14 53 21 53 31 C53 45 43 55 32 58 C21 55 11 45 11 31 C11 21 21 14 32 16 Z" fill="none" stroke="#8F0F35" strokeOpacity="0.35" strokeWidth="1.5" />
          {[[22, 30], [32, 27], [42, 30], [18, 39], [27, 38], [37, 38], [46, 39], [24, 47], [32, 46], [40, 47], [32, 53]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="1.5" ry="2.2" fill="#FFE9A8" opacity="0.9" />
          ))}
          <path d="M32 6 L32 14" stroke="#3F6212" strokeWidth="3" strokeLinecap="round" />
          <path d="M32 13 L22 9 L26 16 L16 16 L24 21 L32 18 L40 21 L48 16 L38 16 L42 9 Z" fill={url('leaf')} />
          <ellipse cx="24" cy="25" rx="5" ry="3.4" fill="#FFFFFF" opacity="0.3" transform="rotate(-24 24 25)" />
        </g>
      )}

      {fruitId === 'apple' && (
        <g>
          <path d="M32 20 C27 13 14 14 12 28 C10 42 20 56 32 56 C44 56 54 42 52 28 C50 14 37 13 32 20 Z" fill={url('apple')} />
          <path d="M32 20 C30 15 30 11 33 7" stroke="#7C4A12" strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <path d="M34 12 C40 6 48 8 50 12 C46 18 38 18 34 12 Z" fill={url('leaf')} />
          <ellipse cx="23" cy="29" rx="5.5" ry="7" fill="#FFFFFF" opacity="0.28" transform="rotate(-18 23 29)" />
        </g>
      )}

      {fruitId === 'banana' && (
        <g>
          <path d="M13 17 C13 38 28 52 49 51 C54 50.5 56 46 53 44.5 C36 46 22 35 19.5 16.5 C19 12.5 13 13 13 17 Z" fill={url('banana')} />
          <path d="M13 17 C13 38 28 52 49 51 C54 50.5 56 46 53 44.5" fill="none" stroke="#A16207" strokeOpacity="0.5" strokeWidth="1.6" />
          <path d="M19.5 16.5 C22 35 36 46 53 44.5" fill="none" stroke="#FEF3C7" strokeOpacity="0.7" strokeWidth="2" />
          <path d="M12.5 14 L19.5 13.5 L20 18 L13.5 18.5 Z" fill="#854D0E" />
          <path d="M52 44 L56 45.5 L54.5 49.5 L51 48 Z" fill="#854D0E" />
        </g>
      )}

      {fruitId === 'orange' && (
        <g>
          <circle cx="32" cy="37" r="22" fill={url('orange')} />
          {[[24, 32], [36, 28], [44, 38], [28, 45], [40, 48], [20, 41], [33, 38]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.1" fill="#C2570B" opacity="0.45" />
          ))}
          <path d="M32 15 L32 10" stroke="#3F6212" strokeWidth="3" strokeLinecap="round" />
          <path d="M33 13 C39 7 47 9 49 13 C45 19 37 19 33 13 Z" fill={url('leaf')} />
          <ellipse cx="24" cy="29" rx="6" ry="4.4" fill="#FFFFFF" opacity="0.3" transform="rotate(-24 24 29)" />
        </g>
      )}

      {fruitId === 'grapes' && (
        <g>
          <path d="M32 14 L32 8" stroke="#7C4A12" strokeWidth="3" strokeLinecap="round" />
          <path d="M33 11 C39 5 47 7 49 11 C45 17 37 17 33 11 Z" fill={url('leaf')} />
          {[[24, 24], [40, 24], [16, 35], [32, 33], [48, 35], [24, 45], [40, 45], [32, 54]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="8.6" fill={url('grape')} />
              <ellipse cx={x - 2.6} cy={y - 3} rx="2.6" ry="1.8" fill="#FFFFFF" opacity="0.35" />
            </g>
          ))}
        </g>
      )}

      {fruitId === 'cherries' && (
        <g>
          <path d="M22 40 C24 26 28 18 35 11" stroke="#4D7C0F" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M44 42 C42 28 39 18 35 11" stroke="#4D7C0F" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M35 11 C41 5 50 7 52 11 C48 17 39 17 35 11 Z" fill={url('leaf')} />
          <circle cx="21" cy="46" r="11.5" fill={url('cherry')} />
          <circle cx="44" cy="48" r="11.5" fill={url('cherry')} />
          <ellipse cx="17.5" cy="42" rx="3.4" ry="2.4" fill="#FFFFFF" opacity="0.4" transform="rotate(-24 17.5 42)" />
          <ellipse cx="40.5" cy="44" rx="3.4" ry="2.4" fill="#FFFFFF" opacity="0.4" transform="rotate(-24 40.5 44)" />
        </g>
      )}

      {fruitId === 'watermelon' && (
        <g>
          <path d="M6 26 A26 26 0 0 0 58 26 Z" fill={url('rind')} />
          <path d="M10 26 A22 22 0 0 0 54 26 Z" fill="#ECFCCB" />
          <path d="M13 26 A19 19 0 0 0 51 26 Z" fill={url('melon')} />
          {[[22, 33], [32, 30], [42, 33], [27, 41], [37, 41], [32, 47]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="1.6" ry="2.4" fill="#1F2937" transform={`rotate(${i % 2 ? 14 : -14} ${x} ${y})`} />
          ))}
          <path d="M6 26 L58 26" stroke="#166534" strokeWidth="1.6" opacity="0.5" />
        </g>
      )}

      {fruitId === 'plum' && (
        <g>
          <circle cx="32" cy="38" r="20" fill={url('plum')} />
          <path d="M32 19 C27 28 27 48 32 57" stroke="#4C1D95" strokeWidth="2" fill="none" opacity="0.55" />
          <path d="M32 18 L32 11" stroke="#7C4A12" strokeWidth="3" strokeLinecap="round" />
          <path d="M33 14 C39 8 47 10 49 14 C45 20 37 20 33 14 Z" fill={url('leaf')} />
          <ellipse cx="24" cy="30" rx="5.4" ry="4" fill="#FFFFFF" opacity="0.35" transform="rotate(-24 24 30)" />
        </g>
      )}
    </svg>
  );
};