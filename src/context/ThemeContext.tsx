import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

const LIGHT_THEME_CSS = `
  /* ==========================================================================
     MODERN LIGHT THEME SPECIFICATION - A TO Z COMPREHENSIVE OVERRIDE
     ========================================================================== */

  html.light,
  html.light body {
    color-scheme: light !important;
    background-color: #f8fafc !important;
    color: #0f172a !important;
  }

  html.light .app-ambient::before {
    background:
      radial-gradient(900px 500px at 10% -10%, rgba(99, 102, 241, 0.08), transparent 60%),
      radial-gradient(800px 500px at 90% 0%, rgba(14, 165, 233, 0.08), transparent 60%),
      radial-gradient(700px 500px at 50% 100%, rgba(236, 72, 153, 0.05), transparent 60%) !important;
  }

  html.light .app-ambient::after {
    opacity: 0.35 !important;
    background-image:
      linear-gradient(rgba(15, 23, 42, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(15, 23, 42, 0.035) 1px, transparent 1px) !important;
  }

  /* 1. Global Typography: enforce dark readable slate everywhere by default */
  html.light * {
    border-color: #e2e8f0;
  }

  html.light h1,
  html.light h2,
  html.light h3,
  html.light h4,
  html.light h5,
  html.light h6 {
    color: #0f172a !important;
  }

  html.light p,
  html.light span,
  html.light label,
  html.light div,
  html.light button {
    color: inherit;
  }

  html.light .text-white,
  html.light .text-slate-100,
  html.light .text-slate-200 {
    color: #0f172a !important;
  }

  html.light .text-slate-300 {
    color: #334155 !important;
  }

  html.light .text-slate-400 {
    color: #475569 !important;
  }

  html.light .text-slate-500 {
    color: #64748b !important;
  }

  html.light .section-label {
    color: #64748b !important;
    font-weight: 700 !important;
  }

  /* 2. Glassmorphic Sidebar & Header */
  html.light aside,
  html.light header,
  html.light nav.fixed.bottom-0 {
    background: rgba(255, 255, 255, 0.95) !important;
    backdrop-filter: blur(20px) !important;
    background-image: none !important;
    border-color: #e2e8f0 !important;
    box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05) !important;
  }

  /* 3. Modern Menu Bar Items & Icons */
  html.light aside nav button,
  html.light nav.fixed.bottom-0 button {
    color: #1e293b !important;
    border-radius: 12px !important;
  }

  html.light aside nav button span,
  html.light nav.fixed.bottom-0 button span,
  html.light aside nav button div,
  html.light aside nav button p {
    color: #1e293b !important;
    font-weight: 500 !important;
  }

  html.light aside nav button svg,
  html.light nav.fixed.bottom-0 button svg {
    color: #334155 !important;
  }

  html.light aside nav button:hover,
  html.light nav.fixed.bottom-0 button:hover {
    background-color: #f1f5f9 !important;
  }

  /* Active Menu Item Pill */
  html.light aside nav button[class*="from-sky-500/15"],
  html.light aside nav button.active {
    background: #eff6ff !important;
    box-shadow: inset 0 0 0 1px #bfdbfe, 0 4px 12px -2px rgba(37, 99, 235, 0.12) !important;
  }

  html.light aside nav button[class*="from-sky-500/15"] span,
  html.light aside nav button.active span,
  html.light aside nav button[class*="from-sky-500/15"] svg,
  html.light aside nav button.active svg {
    color: #1d4ed8 !important;
    font-weight: 600 !important;
  }

  /* Fix Go Live button */
  html.light aside button[class*="from-violet-600"][class*="to-sky-500"] {
    background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #0284c7 100%) !important;
    box-shadow: 0 10px 25px -10px rgba(99, 102, 241, 0.7) !important;
  }

  html.light aside button[class*="from-violet-600"][class*="to-sky-500"] span,
  html.light aside button[class*="from-violet-600"][class*="to-sky-500"] svg {
    color: #ffffff !important;
  }

  /* Fix LIVE and LIVE NOW badges */
  html.light span[class*="from-rose-500/15"],
  html.light span[class*="from-rose-500/20"],
  html.light span[class*="bg-rose-500/10"],
  html.light span[class*="border-rose-400/25"],
  html.light span[class*="border-rose-500/20"] {
    background: #fee2e2 !important;
    border-color: #fca5a5 !important;
  }

  html.light span[class*="from-rose-500/15"] span,
  html.light span[class*="from-rose-500/20"] span,
  html.light span[class*="bg-rose-500/10"] span {
    color: #dc2626 !important;
    -webkit-text-fill-color: #dc2626 !important;
  }

  /* Fix search, bell, ledger, coins/diamonds and action icons */
  html.light svg {
    color: #475569;
  }

  html.light svg.lucide-coins,
  html.light .lucide-coins {
    color: #d97706 !important;
    stroke: #d97706 !important;
  }

  html.light svg.lucide-gem,
  html.light .lucide-gem {
    color: #0284c7 !important;
    stroke: #0284c7 !important;
  }

  html.light button[aria-label="Notifications"] svg {
    color: #0284c7 !important;
  }

  html.light aside button[title="Sign out"] svg {
    color: #e11d48 !important;
  }

  /* 4. Brand Logo & Gradient Headings */
  html.light .bg-clip-text {
    background-image: linear-gradient(135deg, #0f172a 0%, #2563eb 55%, #7c3aed 100%) !important;
    -webkit-background-clip: text !important;
    background-clip: text !important;
    color: transparent !important;
  }

  html.light .live-dot {
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.8) !important;
  }

  /* 5. Clean Modern Cards & Surfaces */
  html.light [class*="bg-[#111420]"],
  html.light [class*="bg-[#121625]"],
  html.light [class*="bg-[#131827]"],
  html.light [class*="bg-[#141827]"],
  html.light [class*="bg-[#15192B]"],
  html.light [class*="bg-[#171B2D]"],
  html.light [class*="bg-[#181C2E]"],
  html.light [class*="bg-[#1A1F33]"],
  html.light [class*="bg-[#0F121D]"],
  html.light [class*="bg-[#0E111B]"],
  html.light [class*="bg-[#0D101B]"],
  html.light [class*="bg-[linear-gradient(160deg"],
  html.light .bg-slate-900,
  html.light .bg-slate-950,
  html.light .bg-black {
    background-color: #ffffff !important;
    background-image: none !important;
    border-color: #e2e8f0 !important;
    box-shadow: 0 2px 10px -2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03) !important;
  }

  /* Dark container backgrounds -> Clean light background */
  html.light [class*="bg-[#08090E]"],
  html.light [class*="bg-[#070810]"],
  html.light [class*="bg-[#090B12]"],
  html.light [class*="bg-[#0B0E17]"],
  html.light [class*="bg-[#05060A]"] {
    background-color: #f8fafc !important;
    background-image: none !important;
  }

  /* 6. Coins & Diamonds Cards */
  html.light button[class*="from-[#131827]"] {
    background: #ffffff !important;
    background-image: none !important;
    border-color: #e2e8f0 !important;
    box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.06) !important;
  }

  html.light button[class*="from-[#131827]"] span {
    color: #475569 !important;
    font-weight: 500 !important;
  }

  html.light button[class*="from-[#131827]"] p {
    color: #0f172a !important;
    font-weight: 700 !important;
  }

  /* 7. Inputs, Search Bars, Modals */
  html.light input,
  html.light textarea,
  html.light select {
    background-color: #ffffff !important;
    color: #0f172a !important;
    border-color: #cbd5e1 !important;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
  }

  html.light input::placeholder,
  html.light textarea::placeholder {
    color: #94a3b8 !important;
  }

  /* 8. Modern Buttons & Pills */
  html.light button:not([class*="bg-gradient-to-r"]):not([class*="bg-gradient-to-br"]):not([class*="bg-violet"]):not([class*="bg-sky"]) {
    border-color: #e2e8f0;
  }

  html.light button:not([class*="bg-gradient-to-r"]):not([class*="bg-gradient-to-br"]):not([class*="bg-violet"]):not([class*="bg-sky"]):hover {
    background-color: #f1f5f9;
  }

  /* Alerts button */
  html.light button[aria-label="Notifications"] {
    background-color: #ffffff !important;
    border-color: #e2e8f0 !important;
    color: #334155 !important;
  }

  html.light button[aria-label="Notifications"] span {
    color: #334155 !important;
  }

  /* Download APK Button */
  html.light a[title*="Download Android APK"],
  html.light button[title*="Download Android APK"] {
    background: #f0fdf4 !important;
    border-color: #bbf7d0 !important;
    color: #15803d !important;
  }

  html.light a[title*="Download Android APK"] span,
  html.light button[title*="Download Android APK"] span,
  html.light a[title*="Download Android APK"] svg,
  html.light button[title*="Download Android APK"] svg {
    color: #15803d !important;
  }

  /* User profile card in sidebar */
  html.light aside .rounded-xl.bg-gradient-to-r {
    background: #f8fafc !important;
    border-color: #e2e8f0 !important;
  }

  html.light aside .rounded-xl.bg-gradient-to-r p {
    color: #0f172a !important;
  }

  html.light aside .rounded-xl.bg-gradient-to-r p.text-slate-400 {
    color: #64748b !important;
  }

  /* 9. CRITICAL EXCEPTION: Solid & Gradient CTA Buttons KEEP White Text (Go Live, Start First Live Room) */
  html.light .shimmer,
  html.light .shimmer *,
  html.light button.shimmer,
  html.light button.shimmer *,
  html.light button[class*="from-violet-600"][class*="to-sky-500"],
  html.light button[class*="from-violet-600"][class*="to-sky-500"] *,
  html.light a[class*="from-violet-600"][class*="to-sky-500"],
  html.light a[class*="from-violet-600"][class*="to-sky-500"] * {
    color: #ffffff !important;
  }
`;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('addabuzz-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // fallback
    }
    return 'dark';
  });

  const setTheme = (nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem('addabuzz-theme', nextTheme);
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const root = document.documentElement;
    const styleId = 'addabuzz-light-theme';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      document.body.classList.remove('bg-[#08090E]', 'text-[#F4F6FB]');
      document.body.classList.add('bg-slate-50', 'text-slate-900');

      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = LIGHT_THEME_CSS;
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      document.body.classList.remove('bg-slate-50', 'text-slate-900');
      document.body.classList.add('bg-[#08090E]', 'text-[#F4F6FB]');

      if (styleEl) {
        styleEl.remove();
      }
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
