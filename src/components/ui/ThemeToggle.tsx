import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', compact = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
        title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
        className={`relative inline-flex items-center justify-center p-2 rounded-xl transition-all duration-200 ${
          isDark
            ? 'bg-white/[0.06] hover:bg-white/[0.1] text-amber-300 border border-white/10'
            : 'bg-slate-100 hover:bg-slate-200 text-amber-600 border border-slate-200 shadow-sm'
        } ${className}`}
      >
        {isDark ? <Sun className="w-4 h-4 transition-transform hover:rotate-45" /> : <Moon className="w-4 h-4 transition-transform hover:-rotate-12" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
        isDark
          ? 'text-slate-300 hover:text-white hover:bg-white/[0.06] border border-white/[0.06]'
          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-sm bg-white'
      } ${className}`}
    >
      <span className="flex items-center gap-2.5">
        <span
          className={`grid h-7 w-7 place-items-center rounded-lg transition-transform group-hover:scale-105 ${
            isDark
              ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
              : 'bg-amber-50 text-amber-600 border border-amber-200'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </span>
        <span className="font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
      </span>
      <span
        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
          isDark
            ? 'bg-white/[0.08] text-slate-400'
            : 'bg-slate-100 text-slate-600 border border-slate-200'
        }`}
      >
        {isDark ? 'Dark' : 'Light'}
      </span>
    </button>
  );
};
