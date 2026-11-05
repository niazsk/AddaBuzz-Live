# ADDABUZZ LIVE — COMPLETE PRODUCT INVENTORY (Jetpack Compose rebuild spec)

Repo read: `C:/Users/Gigabyte/Documents/Qoder/2026-11-03/e4b2fc2e`. Source of truth: React 18 + TS + Vite 6 + Tailwind v4 SPA in `app/`, zero-dependency-HTTP Node ≥22.5 backend in `server/`, Capacitor 7 Android shell (`live.addabuzz.app`). No router library — navigation is a hand-rolled state machine in `app/src/App.tsx`. One global context store (`app/src/lib/realtime.tsx`).

Deviation from the brief, resolved by evidence (details in §11): the design-token file is `app/src/styles.css` (there is no `app/src/index.css`); the app has **no Bengali strings** (Bengali exists only in the out-of-app file `blogger-landing.html`); there is **no screen-share path** (no `getDisplayMedia` anywhere in `app/src`).

---

## 1. SCREEN INVENTORY & NAVIGATION

### 1.1 Root tree (`App.tsx`)
`AppProvider` → `PhoneFrame` → `Router` + `Toasts` (toasts always mounted, above everything).

`Router` state: `tab: Tab`, `roomOpen: boolean`, `adminOpen: boolean`, `gamesOpen: boolean`, `splashDone: boolean`, `deepLink: useRef(false)`.

Render order (first match wins):
1. `booting || !splashDone` → `Splash` (splash min-hold = `setTimeout(1600)` after boot resolves).
2. `!user` → `SignIn`.
3. `roomOpen && room` → `LiveRoom` (full-bleed, no bottom nav).
4. `adminOpen && user.role === 'admin'` → `Admin` (full-bleed, no bottom nav).
5. `gamesOpen` → `Games` (full-bleed, no bottom nav).
6. default → one of `Home` / `GoLive` / `Leaderboard` / `Messages` / `Profile` + `BottomNav`.

Effects: `!room → setRoomOpen(false)`; `user.role !== 'admin' → setAdminOpen(false)`; deep link on mount/live change: `new URLSearchParams(location.search).get('room')`, matched against `live[].id`, then `openRoom(match)` + `setRoomOpen(true)` (fires once, guarded by `deepLink` ref, only when `user` exists).

Offline banner (all tab screens): `!online` → strip at `absolute inset-x-0 top-9 z-50 bg-amber-900/70 py-1 text-center text-[10px] font-bold text-amber-100`, text verbatim **"Reconnecting to the AddaBuzz server…"**.

### 1.2 Bottom nav (`components/BottomNav.tsx`) — order, label, icon
`type Tab = 'home' | 'golive' | 'leaderboard' | 'messages' | 'profile'`

| # | tab key | label shown | lucide icon |
|---|---|---|---|
| 1 | `home` | `Home` | Compass |
| 2 | `golive` | `Go Live` | Radio |
| 3 | `leaderboard` | `Rankings` | Trophy |
| 4 | `messages` | `Messages` | MessageCircle |
| 5 | `profile` | `Profile` | User |

Bar: `safe-bottom absolute inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-purple-900/50 bg-[#161022]/95 px-2 backdrop-blur-xl`. Icon `h-5 w-5`; label `text-[10px] font-medium`. Colors: active → `text-purple-400`; inactive `golive` → `text-pink-400`; other inactive → `text-gray-400 hover:text-gray-200`. `golive` icon is wrapped in a circular pill `flex h-8 w-8 items-center justify-center rounded-full`; active pill = `bg-gradient-to-tr from-purple-600 to-pink-600 text-white`, inactive pill = `bg-purple-950/60 text-pink-300`.

### 1.3 Profile tile grid keys + labels (`screens/Profile.tsx`) — verbatim
Main grid `TILES` (4 columns, 8 items, order preserved):

| key | label | icon (color) |
|---|---|---|
| `reward` | `Reward` | Gift / rose-400 |
| `rank` | `Rank` | Trophy / amber-400 |
| `games` | `Games` | Dices / emerald-400 → **opens the `Games` screen, not an empty panel** |
| `store` | `Store` | ShoppingBag / cyan-400 |
| `invite` | `Invite` | UserPlus / orange-400 |
| `honor` | `Honor Level` | ShieldCheck / violet-400 |
| `fanclub` | `Fan Club` | Heart / pink-400 |
| `medals` | `Medal Wall` | Medal / yellow-400 |

Agent block `AGENT_TILES` (4 columns, 4 items):

| key | label | icon (color) |
|---|---|---|
| `agent` | `Agent` | Users / sky-400 |
| `addhost` | `Add Host` | UserCog / violet-400 |
| `inviteagent` | `Invite Agent` | Share2 / teal-400 |
| `coinstrading` | `Coins Trading` | ArrowLeftRight / amber-400 |

Agent rows `AGENT_ROWS` (2 columns, 4 items, `h-4 w-4` icons):

| key | label | icon (color) |
|---|---|---|
| `agentrewards` | `Agent Rewards` | Ticket / orange-400 |
| `agentranking` | `Agent Ranking` | BarChart3 / sky-400 |
| `diamondagent` | `Diamond Agent` | Gem / indigo-400 |
| `agentactivities` | `Agent Activities` | Activity / rose-400 |

Two pseudo-keys: `vip` → panel label `VIP · Privileges`; `agentall` → panel label `Agent`. Panel heading for a real tile = its label (`LABELS` map over TILES+AGENT_TILES+AGENT_ROWS). Every tile except `games` toggles a dashed `EmptyPanel`.

### 1.4 Every modal / sheet / overlay
| Component | File | Trigger | Notes |
|---|---|---|---|
| `GiftSheet` | `components/Sheets.tsx` | LiveRoom 🎁 button | bottom sheet |
| `ShareSheet` | `components/Sheets.tsx` | LiveRoom Share2 button | bottom sheet; room-link only |
| `ProfileCard` | `components/Sheets.tsx` | LiveRoom host pill tap | centered dialog + `bg-black/60 backdrop-blur-sm` |
| `ServerDialog` | `components/Sheets.tsx` | **never rendered — dead code** (SignIn uses `window.prompt`) | centered dialog |
| `Toasts` | `components/Shell.tsx` | any toast | top overlay stack |
| `LiveRoom` seat strip / chat / composer | inline | party rooms | not a sheet |
| `Admin` user accordion | inline | row tap | in-screen disclosure, not a sheet |
| `Profile` editing card | inline | pencil button | in-screen disclosure |
| Profile tile panels | inline | tile tap | in-screen disclosure |
| Home search bar | inline | header search button | in-screen disclosure |
| Splash dot cycle | inline | 400 ms interval | `.`×0..3 |
| `PhoneFrame` fake status bar | `components/Shell.tsx` | web only | see §2.9 |

Bottom sheet container (`Sheet`): `absolute inset-0 z-50` + scrim `absolute inset-0 bg-black/50` + panel `animate-slide-up absolute inset-x-0 bottom-0 rounded-t-[30px] border-t border-purple-800/50 bg-[#1a1325]/97 p-5 backdrop-blur-xl`; tap anywhere on scrim closes; `onClick` stopPropagation on panel.

---

## 2. DESIGN SYSTEM (exactly as coded)

### 2.1 Global (`app/src/styles.css`, imported by `main.tsx`)
- `@import 'tailwindcss'` (Tailwind v4, no config file; oklch default palette).
- `:root { color-scheme: dark }`.
- `html, body, #root { height: 100% }`.
- `body { margin: 0; background: #050308; font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-tap-highlight-color: transparent; overscroll-behavior: none }`.
- `.scrollbar-none { scrollbar-width: none }` + `::-webkit-scrollbar { display: none }`.
- `.safe-bottom { padding-bottom: env(safe-area-inset-bottom) }`.
- `video { background: #000 }`.

### 2.2 Backgrounds in use
| Token | Where |
|---|---|
| `#050308` | body (web page behind device frame) |
| `#121212` | native shell root, Profile, GoLive, Admin, Messages, Leaderboard, input fields, dialog inputs |
| `#07050c` | Home screen + Games screen root; sticky headers use `bg-[#07050c]/80` |
| `#161022` | bottom nav (`/95`) |
| `#1a1325` | bottom sheet (`/97`), Admin panels, Profile edit card, LiveRoom composer input |
| `#181322` | Profile wallet/agent/tile containers |
| `#0d0713` | SignIn root |
| `#1e152d` | ProfileCard, ServerDialog cards |
| `#1c1624` | GoLive inputs/party option cards |
| `#171021` | GoLive party-settings panel |
| `#1b0626` | camera-placeholder gradient start (`from-[#1b0626] to-black`) |
| `#250837` | Leaderboard podium wash (`from-[#250837]/50 to-transparent`) |
| `#0e0a18` | Home card bottom fade (`from-[#0e0a18] via-transparent`) |
| `#1b0a2b` | SignIn bottom fade |
| `#12031c` | synthetic demo canvas gradient stop 1 |

### 2.3 Gradients (verbatim stops / angles)
- Brand purple→pink CTA: `bg-gradient-to-r from-purple-600 to-pink-600` (buttons: profile save, convert, room CTA, Go Live active pill, notification icon, follow button, dialogs).
- Brand purple→fuchsia: `from-purple-600 to-fuchsia-500` (Home logo chip, LiveParty CTA pill), `from-purple-600 to-fuchsia-600` (Home segmented pill + LIVE pill + FOLLOWING chip), `from-purple-600 to-pink-600` (Go Live start), `to-fuchsia-500` in SignIn submit.
- Seat-join CTA: `bg-gradient-to-r from-fuchsia-600 to-purple-600`.
- Amber money CTA: `bg-gradient-to-r from-amber-500 to-pink-600` (diamond Send button, GiftSheet top-up chips).
- Coins bar (Games): `bg-gradient-to-br from-[#ff7b00] to-[#ffae00]`, `text-black` glyph.
- Splash: `bg-gradient-to-br from-[#121212] via-[#2A0845] to-[#121212]`; icon tile `bg-gradient-to-tr from-[#8A2BE2] to-[#da70d6]`; wordmark `bg-gradient-to-r from-purple-400 via-pink-400 to-white` + `bg-clip-text text-transparent`.
- Wordmark in Home header: `from-purple-300 via-fuchsia-300 to-pink-300` clipped.
- Gift button: `bg-gradient-to-tr from-amber-500 to-pink-500`; heart button `bg-gradient-to-tr from-purple-600 to-pink-600`.
- ActionButton (Games): inline `linear-gradient(115deg, accent0, accent1)` with `boxShadow: 0 20px 44px -26px rgba(accent1, .95)` and a `inset-x-4 top-0 h-px bg-white/50` highlight hairline.
- GameTile: `radial-gradient(120% 130% at 88% 8%, tint(from,.75), transparent 62%), linear-gradient(150deg, tint(to,.5), rgba(255,255,255,0.04))`, `boxShadow: 0 26px 54px -34px tint(from,.95)`.
- Table header: `radial-gradient(130% 130% at 12% 0%, tint(from,.62), transparent 66%), linear-gradient(120deg, tint(to,.42), rgba(255,255,255,0.03))`, `boxShadow: 0 30px 70px -40px tint(from,.9)`.
- Stage: `radial-gradient(75% 95% at 50% 0%, tint(from,.3), transparent 72%)`.
- Poker felt: `radial-gradient(120% 130% at 50% 0%, tint(from,.42), rgba(0,0,0,0.6) 72%)` + `inset 0 0 70px -22px tint(to,.65)`.
- Outcome (win): `radial-gradient(130% 160% at 0% 0%, rgba(16,185,129,0.22), transparent 62%)`, border `rgba(16,185,129,0.42)`, shadow `0 20px 44px -30px rgba(16,185,129,0.8)`.
- Outcome (loss): `radial-gradient(130% 160% at 0% 0%, rgba(244,63,94,0.18), transparent 62%)`, border `rgba(244,63,94,0.38)`.
- Dice face: `linear-gradient(160deg, rgba(255,255,255,0.16), rgba(0,0,0,0.5))`, border `rgba(255,255,255,0.14)`, shadow `0 22px 40px -26px tint(to,.9)`.
- Slot reel: `linear-gradient(180deg, rgba(255,255,255,0.14), rgba(0,0,0,0.55))`; idle inner highlight `inset 0 1px 0 rgba(255,255,255,0.16)`; jackpot shadow `0 18px 38px -20px rgba(#ffae00,.9)`.
- History row chip: `linear-gradient(140deg, tint(from,.75), tint(to,.5))`.
- Home card scrim stack: `bg-gradient-to-t from-black via-black/55 to-transparent` + `inset-x-0 bottom-0 h-40 from-black` + spotlight radial `bg-[radial-gradient(75%_45%_at_25%_0%,rgba(217,70,239,0.35),transparent_70%)]`.
- Seat-tile name strip: `bg-gradient-to-t from-black/90 to-transparent`.
- Home top glow: `bg-[radial-gradient(90%_55%_at_50%_0%,rgba(147,51,234,0.30),transparent_70%)]`, `h-72`.
- Games top glow (`fixed`): `bg-[radial-gradient(85%_60%_at_50%_0%,rgba(147,51,234,0.24),transparent_72%)]`, `h-[260px]`.
- Divider hairline: `bg-gradient-to-r from-white/12 to-transparent`.
- Avatar fallback (deterministic): `linear-gradient(135deg, hsl(H 72% 34%), hsl((H+58)%360 78% 17%))` where `H = hashCode(seed) % 360`, `hashCode`: `h = (h*31 + charCodeAt(i)) >>> 0`, seed = `hostId`.
- Skeleton shimmer: `linear-gradient(90deg, rgba(138,43,226,0.06), rgba(138,43,226,0.18), rgba(138,43,226,0.06))`, `background-size: 200% 100%`.

### 2.4 Accent colors
`#8A2BE2` (brand violet) · `#da70d6` (brand orchid) · `#ff7b00` (orange — coins/games/low-arrow/eyebrow spark) · **`#ffae00` (gold/amber — used for the poker HOLD ring, HOLD badge, slot-jackpot border, coin input glyph, chips tone, diamond Send gradient start)** · `#00f5d4` (teal — multipliers, paytable non-hit, high-arrow) · `#11998e`/`#38ef7d` (Cash out action pair) · `#ff5c8a` (hot text) · `#ff0055` (hot ping dot) · `#e9d5ff`, `#f9a8d4` (demo canvas text) · heart palette `ec4899 8b5cf6 f43f5e a855f7 fb7185` · Tailwind roles: `purple-400/500/600/950`, `fuchsia-300/400/500/600/900/950`, `pink-300/400/500/600`, `amber-100..500`, `emerald-300/400/500`, `rose-300/400/500`, `cyan-400`, `violet-400`, `sky-400`, `teal-400`, `indigo-400`, `orange-400`, `yellow-400`, `green-600`, `gray-300..600`, `red-200/300/400/800/900/950`.
Game brand pairs (from server): jungle `#e65c00→#f9d423`, ocean `#0052d4→#4364f7`, fishing `#3a7bd5→#3a6073`, cards `#0d9488→#115e59`, fruit `#11998e→#38ef7d`, dice `#00b4db→#0083b0`, poker `#870000→#190a05`.

### 2.5 Radius scale as coded
`rounded-full` · `rounded-sm` · `rounded-lg` (8) · `rounded-xl` (12) · `rounded-2xl` (16) · `rounded-3xl` (24) · explicit px: `rounded-[18px]` (ActionButton, BetBar chips? no—`rounded-2xl`, games error card, history rows, dice `rounded-[20px]`… exact list: `rounded-[18px]`, `rounded-[20px]` Outcome, `rounded-[22px]` Panel/Stage/GameTile/Home cards/Games coin bar, `rounded-[24px]` Table header / SignIn logo / Home empty state, `rounded-[28px]` Home spotlight, `rounded-[30px]` sheet top, `rounded-[40px]` web device frame, `rounded-[24px]` logo, `rounded-t-[30px]` sheet.

### 2.6 Borders
`border-white/10`, `border-white/8`, `border-white/[0.07]`, `border-white/[0.15]` (via `border-white/15`), `border-white/20`, `border-white/25`, `border-white/30`, `border-white/50`, `border-white/60`, `border-white/80`, `border-purple-900/30|/40|/50|/60`, `border-purple-800/30|/50|/60`, `border-purple-700/50`, `border-purple-500/20|/30`, `border-purple-950`, `border-fuchsia-400/40|/60`, `border-fuchsia-500/30|/70`, `border-fuchsia-400` (on-stage seat), `border-amber-300/40`, `border-amber-400/40`, `border-amber-500/70`, `border-amber-700/60`, `border-amber-900/50`, `border-emerald-400/30`, `border-emerald-500/40`, `border-emerald-700/50`, `border-emerald-800/40`, `border-emerald-900/50`, `border-rose-500/40`, `border-red-500/40`, `border-red-700/60`, `border-red-800/50|/60`, `border-red-900/30|/50|/60`, `border-dashed border-purple-800/50`, `border-dashed border-white/15`, `border-gray-900` (device frame, 8 px), `border-2 border-purple-500` (avatars), `ring-1 ring-white/10`, `ring-2 ring-fuchsia-400/70`, `ring-1 ring-white/20`, `ring-2 ring-[#ffae00]` (HOLD), `border-2 border-purple-500/30 border-t-purple-400` (spinner).

### 2.7 Glassmorphism / blur
`backdrop-blur-xl` (nav, Panels, seat controls, Outcome, Stage-less cards, Games coin bar, dice choice buttons, poker felt buttons), `backdrop-blur-md` (all LiveRoom overlays, toast, gift flight pill, host footer), `backdrop-blur-sm` (system/gift chat bubble, safety strip, dialog scrims), `backdrop-blur` (Home pills, badges, empty state), `blur-[1px]` (spinning reels), `blur-[100px]` / `blur-[110px]` (SignIn blobs), `blur-xl` (splash glow). Translucent fills: `bg-white/[0.03]`, `/[0.04]`, `/[0.05]`, `/[0.06]`, `/[0.09]`, `bg-white/5`, `bg-black/30`, `/35`, `/40`, `/45`, `/50`, `/60`, `/70`, `/80`, `/90`, `/95`, `bg-[#1a1325]/97`.

### 2.8 Type roles (exact utilities)
- Eyebrow (Games): `text-[9px] font-black uppercase tracking-[0.2em]`, tone dim `text-white/40`, accent `text-white/75`.
- Chip label: `text-[9px] font-black uppercase tracking-[0.14em] text-white/65`.
- Section eyebrow (Home "Trending now", "Recently ended"): `text-[9px] font-black uppercase tracking-[0.16em]` / `text-[11px] font-black uppercase tracking-[0.16em]`.
- Sign-in eyebrow: `text-[11px] font-bold tracking-[0.32em] uppercase text-purple-300/80`.
- Micro-labels in Games: `text-[8px] font-black uppercase tracking-[0.14em]` / `tracking-[0.16em]`.
- Body: `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[12.5px]`, `text-[13px]`, `text-xs`(12), `text-sm`(14).
- Headlines: `text-[15px] font-black tracking-tight` (Home wordmark), `text-[19px] font-black leading-none tracking-tight` (table name), `text-[20px] font-black` (spotlight title), `text-[26px] leading-tight font-extrabold tracking-tight` (SignIn), `text-3xl font-extrabold tracking-wider` (Splash wordmark), `text-[13px] font-black` (Games header), `text-[10.5px] font-bold` (agent rows).
- Numbers: `tabular-nums` everywhere in Games; `text-[16px] font-black tabular-nums` (coin balance), `text-[13px] font-black tabular-nums` (outcome), `text-[11px] font-black tabular-nums` (wagered/returned/rounds), `text-[10px] font-black tabular-nums text-[#00f5d4]` (live multiplier), `text-[17px] font-extrabold text-white` (profile stats), `text-lg font-extrabold` (wallet cards), `text-sm font-bold` (admin tiles).
- Formatting helpers to reimplement: `toLocaleString()` for coin/diamond counts; `money()`: `>=1e6 → (v/1e6).toFixed(1)` stripped `.0` + `M`; `>=1000 → (v/1000).toFixed(abs>=10000?0:1)` stripped `.0` + `k`; else raw. `compactCount()`: `<1000` raw, else `Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1})`. `timeAgo()/when()/ago()`: `just now` / `{m}m ago` / `{h}h ago` / `{d}d ago`. Games `ago()`: `{s}s` / `{m}m` / `{h}h` / `{d}d`. Profile `when()`: `Mon d · HH:MM` (2-digit, locale).
- `tint(hex, alpha)` → `rgba(r,g,b,a)`; supports 3- and 6-digit hex, pads/truncates to 6.

### 2.9 Fake status-bar treatment
Web preview only (`PhoneFrame` non-native branch): outer `flex min-h-[100dvh] items-center justify-center bg-gray-950 p-2 font-sans text-white select-none sm:p-4`; device `relative flex h-[min(847px,100dvh)] w-full max-w-[412px] flex-col overflow-hidden rounded-[40px] border-[8px] border-gray-900 bg-[#121212] shadow-[0_0_50px_rgba(138,43,226,0.3)]`. Status bar: `pointer-events-none absolute top-0 right-0 left-0 z-50 flex h-9 items-center justify-between px-6 text-xs font-semibold text-white/90`, left = live 24 h clock (`toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false})`), center notch `absolute top-1.5 left-1/2 h-4 w-20 -translate-x-1/2 rounded-full bg-black`, right = `text-[10px]` group: `5G` badge `rounded border border-white/60 px-1` + battery `h-2.5 w-3.5 rounded-sm border border-white/80 p-0.5` filled with `bg-white`. Native branch: `flex h-[100dvh] w-full flex-col overflow-hidden bg-[#121212] text-white select-none` (no status bar). Every screen reserves top space with `pt-9`/`pt-11`/`pt-12` and bottoms with `pb-16`/`pb-20`.

### 2.10 Animations (name → duration/easing)
| CSS class | keyframes | timing |
|---|---|---|
| `animate-fade-in` | `ab-fade-in` (`opacity 0→1`, `translateY(6px)→0`) | `0.4s ease-out both` |
| `animate-slide-up` | `ab-slide-up` (`translateY(100%)→0`) | `0.25s ease-out both` |
| `animate-scale-up` | `ab-scale-up` (`opacity 0→1`, `scale(.9)→1`) | `0.2s ease-out both` |
| `animate-float-up` | `ab-float-up` (`0%: opacity 0, translateY(0) scale(.6) rotate(-6deg)`; `15%: opacity 1`; `100%: opacity 0, translateY(-320px) scale(1.25) rotate(9deg)`) | `1.8s ease-out both` |
| `animate-gift-fly` | `ab-gift-fly` (`0%: opacity 0, translateX(-40%) scale(.5)`; `12%: opacity 1, translateX(0) scale(1.1)`; `75%: opacity 1`; `100%: opacity 0, translateX(120%) scale(.9)`) | `2.6s ease-in-out both` |
| `ab-shimmer` (via `.skeleton`) | `background-position -200% 0 → 200% 0` | `1.4s linear infinite` |
Tailwind built-ins also used: `animate-ping` (LIVE dot, hot dot), `animate-pulse` (glow blob, busted tile, mic icon in Go Live, spinner radio), `animate-bounce` (dice faces while busy, crown medal), `animate-spin` (refresh while loading, room spinner), `duration-300` segmented pill slide, `duration-200`/`duration-500` tile hover, `transition-transform`, `active:scale-[0.98]`/`[0.985]`/`[0.99]`/`active:scale-95`, `animate-fade-in` stagger `style={{animationDelay: Math.min(i,8)*45 + 'ms'}}` (Home cards), `animate-slide-up` on GameTile.

### 2.11 Emoji / icon vocabulary
Games (server-supplied): 🐯 jungle, 🐋 ocean, 🐠 fishing, 🍀 cards, 🍉 fruit, 🎲 dice, 🃏 poker. Hit/bust glyphs: 💎/💣 (jungle), 🐠/🦈 (fishing), 🍀/🥀 (cards). Slot reel sets: ocean 🐟🦀🐬🐙🐋🎁, fruit 🍒🍉🍇🔔⭐💎. Dice faces (unicode): ⚀ ⚁ ⚂ ⚃ ⚄ ⚅ (placeholder before roll = 🎲). Card suits: ♠ ♥ ♦ ♣.
Gifts: 🌹 💝 🎈 🎂 🎁 💐 🐶 💍. Currencies: 🪙 coins, 💎 diamonds. Room UI: ❤️ floating hearts (literal glyph, color styling from `heart.color`), 🎁 gift button, 🔥 likes prefix, 🔒 safety strip, ⚡ media-label chip prefix, ✕ chair-release, ✓/+ follow, "🎙 VOICE PARTY", "🪑 VIDEO PARTY · n/m". Profile: 🇧🇩 flag when `region.includes('BD')`. Leaderboard podium: 👑 🥈 🥉.
lucide icon set used (names to map to Material icons): Compass, Radio, Trophy, MessageCircle, User, Video, VideoOff, Mic, MicOff, Users, UserCog, UserPlus, Share2, Heart, Gift, Send, X, Zap, Dices, Gem, Medal, ShieldCheck, ShoppingBag, ArrowLeftRight, BarChart3, Activity, Ticket, Sparkles, Coins, Wallet, Pencil, Copy, ChevronRight, ChevronLeft, ChevronDown, LogOut, Search, Link2, Crown, Bell, Mail, KeyRound, MapPin, UserRound, Globe2, Eye, EyeOff, WifiOff, Gamepad2, History, RefreshCw, ArrowUp, ArrowDown, Ban, Trash2, Shield, Camera, Volume2, VolumeX, BadgeCheck.

---

## 3. PER-SCREEN LAYOUT, TOP → BOTTOM, WITH VERBATIM COPY

### 3.1 Splash (`screens/Splash.tsx`)
Container `animate-fade-in flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-[#121212] via-[#2A0845] to-[#121212] p-6 text-center`.
1. Glow `absolute inset-4 animate-pulse rounded-full bg-purple-600/30 blur-xl` behind icon tile `relative flex h-24 w-24 rotate-3 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#8A2BE2] to-[#da70d6] shadow-2xl` containing `<Video className="h-12 w-12 animate-bounce text-white"/>`.
2. `h1` wordmark: **`ADDABUZZ LIVE`**.
3. Tagline: **`Connect, Stream & Shine Together`** (`text-sm font-medium text-purple-300/70`).
4. Cycling dots `{'.'.repeat(dots)}` where dots cycles 0→3 every 400 ms (`h-4 text-[11px] text-purple-400`).

### 3.2 SignIn (`screens/SignIn.tsx`)
Root `relative flex flex-1 flex-col overflow-hidden bg-[#0d0713]`; three decorative layers: blob `-top-28 -left-20 h-80 w-80 rounded-full bg-purple-700/35 blur-[100px]`, blob `-right-24 top-1/3 h-80 w-80 rounded-full bg-fuchsia-600/25 blur-[110px]`, bottom fade `inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#1b0a2b] to-transparent`. Scroll body `px-6 pt-10 pb-6`.
1. Header: `img` = bundled `assets/addabuzz-icon.jpg`, `h-[84px] w-[84px] rounded-[24px] shadow-[0_18px_44px_rgba(168,85,247,0.5)] ring-1 ring-white/10`, alt `AddaBuzz Live`; eyebrow **`AddaBuzz Live`**.
2. Headline: login **`Welcome back!`** / signup **`Create account`**; sub: **`Sign in to watch, chat and go live`** / **`One account to watch, chat and go live`**.
3. Form fields, signup first: Pill(UserRound, **`Your stage name`**, required), Pill(MapPin, **`Dhaka, BD`**); always: Pill(Mail, type email, **`Username / Email`**, required), Pill(KeyRound, type password/text, **`Password`**, required, minLength 8) with eye toggle (`aria-label` = **`Hide password`** / **`Show password`**).
   Pill styling: wrapper `flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] pr-3 pl-1.5 focus-within:border-fuchsia-400/60 focus-within:bg-white/[0.09]`; icon circle `h-8 w-8 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white`; input `py-3 text-[14px] text-white placeholder:text-purple-200/40`.
4. Error band (only when set): `rounded-2xl border border-red-800/50 bg-red-950/40 px-3 py-2 text-center text-[11px] font-semibold text-red-200`. Copy map: `offline` → **`Cannot reach ${serverUrl || 'the AddaBuzz server'} — set the server address.`**; `invalid-credentials` → **`Email or password is wrong.`**; `email-taken` → **`That email already has an account.`**; else raw code.
5. Submit `w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 py-3.5 text-[15px] font-bold shadow-[0_16px_34px_rgba(168,85,247,0.45)]`: **`Connecting…`** while busy, else **`Login`** / **`Create account`**.
6. Swap line: **`Don't have an account? `** + link **`Sign Up`** / **`Already registered? `** + link **`Sign in`**.
7. Footer status line (`text-[11px] font-semibold`): online → **`● Connected to your AddaBuzz server`** (emerald-400); connecting → **`○ Reconnecting…`** (purple-300); else WifiOff + **`Will connect as soon as you sign in`**.
8. Disclosure button **`Server & demo accounts`** + ChevronDown (`rotate-180` when open). Panel: server chip button showing `serverUrl || 'Set server address'`, tap → `window.prompt('AddaBuzz server URL', serverUrl)` → `configureServer`. Then block: bold **`Demo accounts (password addabuzz123)`**, **`viewer@addabuzz.live — watches, 150,000 🪙`**, **`host@addabuzz.live — goes live, 200,000 🪙 / 8,000 💎`**.
9. Fine print: **`Streams, chat and gifts run realtime on your own AddaBuzz server. Never share passwords.`**
Initial state: email `viewer@addabuzz.live`, password `addabuzz123`, region `Dhaka, BD`, displayName empty, mode `login`.

### 3.3 Home (`screens/Home.tsx`)
Root `scrollbar-none relative flex flex-1 flex-col overflow-y-auto bg-[#07050c] pb-20` + top radial glow (see §2.3).
1. Sticky header `sticky top-0 z-20 border-b border-white/5 bg-[#07050c]/80 pt-9 backdrop-blur-xl`, `px-4 pb-2.5`: brand chip `h-9 w-9 rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-500 shadow-lg shadow-fuchsia-950/60` with Radio; wordmark `AddaBuzz` (clipped gradient) + `Live` (`text-white/85`) at `text-[15px] font-black tracking-tight`; subtitle = `user?.region || 'your feed'` (`text-[10px] text-white/35`). Right: online-viewer chip (green dot + `compactCount(sum of viewers)`), search toggle button (Search ⇄ X; active `border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-200`).
2. Segmented control `TABS = ['Feature','Nearby','Newest']`: track `relative flex rounded-2xl border border-white/10 bg-white/5 p-1`; sliding pill `absolute inset-y-1 w-[calc((100%-8px)/3)] rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow-lg shadow-purple-950/70 transition-transform duration-300 ease-out`, `left:4`, `translateX(0% | 100% | 200%)`; labels `text-[11px] font-bold`, active `text-white` else `text-white/45`. Filtering: `Nearby` = exact `s.region === user.region`; `Newest` = started within 24 h, sorted `startedAt desc`; search matches title / host.displayName / region (case-insensitive substring).
3. Search bar (when open, `animate-fade-in`): container `rounded-2xl border border-fuchsia-500/30 bg-white/5 px-3.5 py-2.5 backdrop-blur`, placeholder **`Search titles, hosts, regions`**, `autoFocus`.
4. Count row: Sparkles + **`{n} room{s} broadcasting`** or **`Nobody is live yet`** (`text-[11px] font-semibold tracking-wide text-white/45`); right button **`Refresh ↻`** (`text-[10px] font-bold text-fuchsia-300 active:scale-95`) → `refreshStreams()`.
5. Own-live banner (only when `room?.role === 'host'` and its stream is in `live`): `rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-left backdrop-blur` + left accent bar `w-1 bg-gradient-to-b from-emerald-300 to-emerald-500`; text `Radio (animate-pulse)` + **`You are live — tap to return`**; right **`{compactCount(viewers)} watching`**.
6. Spotlight (only when `!searching && tab==='Feature' && rows.length>=2`; = highest `viewers`), `rounded-[28px] border border-white/10 shadow-2xl shadow-purple-950/50 active:scale-[0.99]`: avatar cover `h-72 w-full sm:h-80`, scrims, top row `LivePill` + `PartyBadge`, viewer chip (Users + compact count); bottom: chip **`Trending now`**, title `text-[20px] font-black line-clamp-2 drop-shadow`, host row (avatar `h-9 w-9 rounded-full ring-2 ring-fuchsia-400/70`, name `text-xs font-bold`, **`{region || 'no region'} · {timeAgo}`**), CTA pill **`Watch`** + ChevronRight (`from-purple-500 to-fuchsia-500`).
7. Card grid `grid grid-cols-2 gap-3 px-4 pb-8`, each `rounded-[22px] border border-white/8 bg-white/[0.04] … active:scale-[0.98]`, staggered `animationDelay = min(i,8)*45 ms`; thumbnail `h-32` + `from-[#0e0a18]` fade; top-left `LivePill`, top-right viewers chip; bottom-left **`FOLLOWING`** chip when `broadcasts.following.includes(hostId)`; body: title `text-[12px] font-bold line-clamp-2`, `PartyBadge`, host avatar `h-5 w-5` + name, region · time line.
   - `LivePill` = `rounded-full border border-fuchsia-400/40 bg-gradient-to-r from-purple-600 to-fuchsia-600 px-2 py-[3px] text-[9px] font-black tracking-[0.14em] text-white shadow-lg shadow-fuchsia-900/40`, ping dot + **`LIVE`**.
   - `PartyBadge` (party rooms only): `rounded-full border border-amber-300/40 bg-amber-500/15 px-2 py-[3px] text-[9px] font-black tracking-wide text-amber-200 backdrop-blur`, text **`🎙 VOICE PARTY`** or **`🪑 VIDEO PARTY`** + ` · {seated}/{seatCount}`.
8. Skeleton state (`connecting && !live.length`): 4 × `skeleton h-48 rounded-[22px] border border-white/5` in the 2-col grid.
9. Empty state: `rounded-[24px] border border-dashed border-white/15 bg-white/[0.03] p-7 text-center`, icon circle `h-12 w-12 rounded-full bg-gradient-to-br from-purple-600/40 to-fuchsia-600/30`, **`No live rooms here`**, sub: Nearby+region → **`No one near ${user.region} is streaming. Try Feature, or go live yourself.`**, else **`Open the Go Live tab and be the first broadcaster.`**
10. **`Recently ended`** section (uppercase label `text-[11px] font-black uppercase tracking-[0.16em] text-white/40` + gradient hairline): first 4 `offline` rows — avatar `h-11 w-11 rounded-xl opacity-70 grayscale-[0.35]` with **`OFF`** corner badge, title, **`{hostName} · peak {compactCount(viewers)} viewers · {timeAgo}`**, trailing **`OFFLINE`** chip.

### 3.4 Go Live (`screens/GoLive.tsx`) — copy verbatim
Root `scrollbar-none flex flex-1 flex-col overflow-y-auto bg-[#121212] pt-12 pb-16`.
1. Header block (`border-b border-purple-950 px-4 py-3`): **`Broadcast live`**; **`Your camera goes straight to each viewer peer-to-peer over WebRTC. No recording, no delay.`**
2. Preview `relative mx-3 mt-4 h-72 overflow-hidden rounded-3xl border border-purple-900/50 bg-black`. Live → `StreamVideo` (muted, cover). Else placeholder `bg-gradient-to-br from-[#1b0626] to-black`: VideoOff, line 1 = party+audio → **`Party audio has no picture`** otherwise **`Camera preview appears here`**; line 2 = party+audio → **`Chairs carry voice only. Watchers still see the room cover and chat.`** otherwise **`Android asks for camera and microphone permission when you start.`**. Host overlays: `LIVE` red pill (`bg-red-600/90`, pulse dot), viewer chip (Users + `room.viewers.length`).
3. `mediaError` band: `rounded-xl border border-red-800/50 bg-red-950/50 px-3 py-2 text-[11px] text-red-200`.
4a. Host branch: `rounded-2xl border border-emerald-800/40 bg-emerald-950/30 p-4` → **`You are broadcasting “{room.title}”`**; party → **`{Audio|Video} party · {filled}/{seatCount} chairs taken · {runningCams} camera(s) running`**, solo → **`Solo live · you are the only one on camera`**; next line **`{n} watcher(s) · {n} likes · {n} media session(s)`**; party seat grid `grid-cols-3` per seat: **`#{index+1}`** + Mic/Video glyphs + **`empty chair`** or display name. Buttons: **`Open room & chat`**, **`Stop`** (Radio icon).
4b. Setup branch:
   - Label **`Room title`**, input `maxLength 80`, default value `` `${user?.displayName || 'Your'} live room` ``; submitted fallback title **`AddaBuzz live`**.
   - Mode cards (2-col): **`Solo Live`** / sub **`One person`** / note **`You broadcast, everyone else watches.`**; **`Party Room`** / sub **`Up to 15`** / note **`Guests take chairs and speak live.`** Active = `border-fuchsia-500/70 bg-fuchsia-950/40 shadow-lg shadow-fuchsia-900/30`.
   - Party panel (`rounded-2xl border border-purple-900/50 bg-[#171021] p-3`): label **`Party media`** with buttons **`Video party`** (Video) / **`Audio party`** (Mic); label **`Number of chairs`** with buttons `SEAT_CHOICES = [4, 6, 9, 12, 15]` (active `border-amber-500/70 bg-amber-900/30 text-amber-100`).
   - Demo toggle (Zap): on+audio → **`Synthetic test mic (no permission needed)`**; on+video/solo → **`Synthetic test camera (no permission needed)`**; off → **`Use the real camera & microphone`**.
   - Start CTA: busy → Camera(pulse) + **`Opening your media…`**; party → **`OPEN {seatCount}-CHAIR {VIDEO|AUDIO} PARTY`**; solo → **`START SOLO LIVE`**.
   - `myStream` notice: **`You already have a live room — viewers can join it from Home right now.`**
   - Info card (`rounded-2xl border border-purple-900/40 bg-purple-950/20 p-4 text-[11px]`): bold **`How delivery works`**; body **`Solo live opens one encrypted media session per viewer. A party room links every chair to the others, so seated guests see and hear one another, and watchers receive the chairs your device can carry at once. Peers negotiate through your AddaBuzz server; if both devices sit behind symmetric NATs, add TURN credentials (ADDABUZZ_TURN_URL) to the server env.`**; second line audio → **`In a voice party every chair may speak at the same time.`** video → **`In a video party a few cameras run at once and the rest of the room is heard only.`**; third line **`Coins earned: {n} · followers {n}`**.
Defaults: `mode 'solo'`, `partyType 'video'`, `seatCount 6`, `demoCamera = demoFlag()`.

### 3.5 LiveRoom (`screens/LiveRoom.tsx`)
Root `relative flex flex-1 flex-col justify-between overflow-hidden bg-black`.
Closed state (no room): centered Radio(animate-pulse), **`Room closed`**, button **`Back to Home`**.
1. Stage (`absolute inset-0 z-0`): renders `StreamVideo` when `stream && (voiceRoom || liveVideo(stream))`; `muted = stageIsSelf || !audioOn`; `fit="cover"`. Voice-party-with-no-video → `bg-gradient-to-br from-[#1b0626] to-black px-5 pt-28`: **`Voice party · {filled}/{seatCount} chairs taken`**, then **`Your mic is live in this room.`** (seated) / **`Tap a chair below to speak.`**, ghost Mic `h-40 w-40 text-white/5` centered. Otherwise spinner (`h-10 w-10 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-400`) + **`Preparing your broadcast…`** (host) / **`Connecting to the broadcast…`** (viewer), optional **`{displayName} has the camera off`**. Overlay `bg-gradient-to-b from-black/50 via-transparent to-black/90`.
   Stage-stream selection: per-seat tiles → own chair uses `localStream`, others use `remoteStreams[socketId]`; `stageTile` = featured peer, else first peer with a stream; if no peer streams, fall back to own tile; solo → host uses `localStream`, viewer uses `remoteStream`.
2. Reaction layer `pointer-events-none absolute inset-0 z-20 overflow-hidden`: hearts `animate-float-up absolute bottom-24 text-2xl` at `left: {heart.left}%` rendering literal `❤️`; gift flights `animate-gift-fly absolute bottom-40 left-4 … rounded-full border border-amber-400/40 bg-black/60 px-3 py-1.5 backdrop-blur-md` = icon `text-xl` + **`{userName} sent {name}{` x{qty}` when qty>1}`**.
3. Top bar `relative z-30 flex items-start justify-between px-3 pt-12`:
   - Host pill (`rounded-full border border-white/10 bg-black/40 p-1 pr-3 backdrop-blur-md`) → opens `ProfileCard`; avatar `h-8 w-8 rounded-full border border-purple-500` or initial circle `bg-purple-700`; name `max-w-[110px] truncate text-xs font-bold`, fallback **`You`** (host) / **`Broadcaster`**; likes line **`🔥 {room.likes} likes`** (`text-[10px] font-medium text-amber-400`); follow micro-button (viewers only) 24 px circle `+` / `✓`, following = `bg-green-600` else gradient.
   - Right cluster: viewers chip (Users + `room.viewers.length`); party chip `bg-fuchsia-500/20 text-[9px] font-bold text-fuchsia-200` = **`{voice|video} party · {filled}/{seatCount}`**; link-state chip: party → **`{n} link(s)`** (`{n} link` when 1), solo host → **`{connected}/{viewers} peers`**, solo viewer → first `linkStates` value (e.g. `connected`, `connecting`, `new`, `closed`) else **`waiting`**; green when a stage stream exists (`bg-emerald-500/20 text-emerald-300`) else amber (`bg-amber-500/20 text-amber-300`); audio toggle (Volume2/VolumeX, shown when `!isHost || isParty`); close `X`.
4. Lower stack `relative z-30 flex flex-1 flex-col justify-end px-3 pb-2`:
   - Safety strip (`text-[11px] text-purple-300 border border-purple-500/20 bg-black/40 rounded-xl backdrop-blur-sm`): **`🔒 AddaBuzz safety: never share bank details or passwords.`**
   - Party seat strip (`scrollbar-none mb-2 -mx-3 flex gap-2 overflow-x-auto px-3 pb-1`), tiles `h-[92px] w-[70px] shrink-0 overflow-hidden rounded-xl border backdrop-blur-md`: on-stage `border-fuchsia-400`, empty `border-white/10 bg-white/5`, occupied `border-white/15 bg-black/50`. Content: live video, else avatar `h-10 w-10 rounded-full` or initial circle `bg-purple-800`. Bottom strip: **`chair {index+1}`** for empty else name, suffix **` · you`** for own seat; status row Mic/MicOff (`emerald-300`/`red-300`) and, in video rooms, Video/VideoOff (`emerald-300`/`white/40`). Host sees a `X` badge (`h-4 w-4 rounded-full bg-black/70`) top-right on every occupied seat except index 0 → `releaseSeat`. Tap rule: empty seat while not seated → `takeSeat(index)`; otherwise set `featured`.
   - Seat controls: not seated (viewer) → **`Take a chair and speak`** (Mic, `from-fuchsia-600 to-purple-600`). Seated → mic toggle (`border-red-700/60 bg-red-950/60` when muted), camera toggle (video rooms only; off = `border-amber-700/60`), **`Leave chair {mySeatIndex+1}`**. Host → **`⚡ {room.mediaLabel} · tap a chair ✕ to free it`**.
   - Chat list `scrollbar-none mb-3 max-h-44 space-y-2 overflow-y-auto pr-2`, auto-scrolls to bottom on `messages`/`flights` change. Bubbles `inline-block max-w-[90%] rounded-2xl px-3 py-1.5 text-xs backdrop-blur-md`: system `bg-purple-900/40 text-purple-200`, gift `bg-amber-900/40 text-amber-100`, chat `bg-black/40 text-white/90`; prefix `{userName}: ` in `text-purple-300 font-bold`.
   - Composer: form submit `sendChat(input)` when non-empty; input `rounded-full border border-white/20 bg-black/50 py-2.5 pr-10 pl-4 text-xs backdrop-blur-md`, placeholder **`Say something nice…`** signed-in / **`Sign in to chat`** otherwise; Send button `h-6 w-6 rounded-full bg-purple-600`.
   - Action buttons: 🎁 (`h-10 w-10 rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 text-lg`), Share2 (`border border-white/20 bg-black/50`), Heart (`from-purple-600 to-pink-600`, filled).
   - Host footer (`rounded-xl border border-purple-800/40 bg-black/50 px-3 py-2 text-[10px] text-purple-200`): **`⚡ {mediaLabel}`** and **`{viewers} watching · {likes} likes`**.
   Audio state `audioOn` starts `false`; `leave()` = viewer → `closeRoom()` then `onExit()`; host → only `onExit()` (broadcast keeps running).

### 3.6 Rankings / Leaderboard (`screens/Leaderboard.tsx`)
Root `bg-[#121212] pt-12 pb-16`. Header (`border-b border-purple-950 px-4 py-3`): **`Creator rankings`**; period buttons `PERIODS = ['Daily','Weekly','Monthly','Totally']`, active `font-bold text-purple-400 underline`; the selected label is sent lowercased to `GET /leaderboard?period=…`. Sub-line: **`Coins earned from real gifts in this window.`**
Loading `skeleton mx-3 mt-4 h-40 rounded-2xl`; error band **`Could not load rankings.`**; empty (`rounded-2xl border border-dashed border-purple-800/50 bg-purple-950/20 p-6`): **`No gifts received yet`** + **`The {period} board fills as soon as viewers send gifts in a live room.`** (period lowercased).
Podium (only when ≥3 rows): `flex items-end justify-around bg-gradient-to-b from-[#250837]/50 to-transparent px-4 py-6`, render order `[1,0,2]` (2nd, 1st, 3rd); medal glyphs 1→**👑** (animate-bounce, `text-lg`), 2→**🥈**, 3→**🥉**; avatar rings 1→`border-amber-400` `h-16 w-16`, 2→`border-gray-300` `h-14 w-14`, 3→`border-amber-600` `h-14 w-14`; first place gets `mb-4`; name `max-w-[90px] truncate text-xs font-bold`; amount **`🪙 {coins.toLocaleString()}`**.
Rest list (`rows.slice(3)` when ≥3 else all rows): rank `text-purple-400`, avatar `h-10 w-10`, name, **`@{handle}`**, right chip Crown + `coins.toLocaleString()`.
Not-ranked note (signed-in user absent from a non-empty board): **`You are not ranked in this window yet — host a live room and collect gifts.`**

### 3.7 Messages (`screens/Messages.tsx`)
Root `bg-[#121212] pt-12 pb-16`; header **`Messages & notifications`** + **`Gifts, followers and system news — delivered realtime over your socket.`**
Icon per `kind` (`ICONS` map, fallback Bell): gift→Gift, follow→UserPlus, system→Sparkles, reward→Sparkles, live→Video. Row: 40 px circle `bg-gradient-to-tr from-purple-600 to-pink-600`, title `truncate text-xs font-bold`, right `when(createdAt)`, body (only if non-empty) `truncate text-[11px] text-gray-400`; list `divide-y divide-purple-950/60`; rows keyed `` `${id ?? index}-${createdAt}` ``.
Empty: Bell `h-6 w-6 text-purple-400/70`, **`Nothing yet`**, **`When someone gifts or follows you, it appears here instantly.`**
Mount calls `loadNotifications()` (which marks all server-side notifications read).

### 3.8 Profile (`screens/Profile.tsx`)
Root `bg-[#121212] pt-11 pb-16`.
1. Identity row: avatar `h-16 w-16 rounded-full border-2 border-purple-500` or initial on `bg-purple-900/60`; name `text-[15px] font-bold` + BadgeCheck (amber, admin) + 🇧🇩 (region contains `BD`); chips: **`Lv {level}`** (Sparkles, `bg-emerald-500/15 text-emerald-300`), **`{n} live`** (Video, `bg-rose-500/15 text-rose-300`), ID chip **`ID {shortId}`** + Copy → clipboard + toast **`Account ID copied.`**. Pencil button (`aria-label="Edit profile"`).
   `level = Math.max(1, Math.floor(Math.log10(Math.max(1, coinsEarned)) * 3))`; `shortId = user.userId ?? user.id.replace(/-/g,'').slice(0,8).toUpperCase()`.
2. Edit card (expanded): inputs placeholders **`Display name`**, **`Region (used by the Nearby tab)`**, **`Bio`** (textarea rows 2), **`Avatar URL (https://…)`**; button **`Save profile`** (`from-purple-600 to-pink-600`) → `saveProfile`.
3. Stats grid `grid-cols-4 border-y border-white/5 py-4`: **Friends** (hard 0), **Following** (`broadcasts.followingCount`), **Followers** (`broadcasts.followers`, rose dot when > 0), **Visitors** (hard 0). Values `text-[17px] font-extrabold` + `toLocaleString()`.
4. Wallet cards `grid-cols-2`: **Coins** `bg-gradient-to-br from-amber-400/25 to-amber-500/5`, label `text-amber-200/80`; **Diamonds** `from-cyan-400/20 to-indigo-500/5`, label `text-cyan-200/80`; amounts `text-lg font-extrabold` + `toLocaleString()`.
5. Wallet accordion row (`bg-[#181322] border border-purple-900/40 rounded-2xl`): Wallet glyph, **`Wallet`**, sub **`Convert coins · send to an agent`**, ChevronRight rotates 90° when open. Panel contents:
   - Package row `grid-cols-4`: label = `coins>=1e6 ? `${coins/1e6}M` : `${coins/1000}k`` in amber-400 `text-[11px] font-bold`, then `🪙` `text-[9px]`, then price `text-[9px] text-gray-500`.
   - Card **`Coins → Diamonds`** + numeric input (placeholder **`Amount`**, digits-only) + button **`Convert`** (ArrowLeftRight, purple→pink).
   - Card **`Send diamonds to an agent`** + input placeholder **`Agent ID (6 digits)`** (trims leading spaces, max 40 chars) + numeric **`Amount`** + button **`Send`** (Gem, amber→pink).
   - Footnote (Coins icon): **`Gifts and everything you buy are paid in coins.`**
6. VIP banner: **`VIP · Get privileges`** with ShieldCheck, right label **`View`**/**`Close`**, `bg-gradient-to-r from-amber-500/30 to-orange-400/15 rounded-t-2xl`.
7. Tile grid (§1.3) inside `bg-[#181322] border-x border-white/5`; then Agent block `rounded-b-2xl`: heading **`Agent`** + **`All`** + ChevronRight, 4 AGENT_TILES, 2-col AGENT_ROWS.
   Tile icon circle `h-11 w-11 rounded-2xl bg-white/5`, icon `h-6 w-6`, label `text-[10px] font-semibold text-gray-300`; agent-row chips `rounded-xl bg-white/5 px-2.5 py-3`, label `text-[10.5px] font-bold text-gray-200`.
8. `EmptyPanel` (dashed `border-purple-800/50 bg-purple-950/20 p-4`): label + X (`aria-label="Close {label}"`), **`Nothing here yet.`**, **`This section is empty on your account.`**
9. Account accordion: **`Account · wallet & history`** + **`Open`**/**`Hide`**. When open: **`My broadcast history`** (Video icon) rows — title, `when(startedAt)`, right column **`{viewers} peak`** / **`{likes} likes`**; admin tile (`user.role==='admin'`): **`Open admin control`** + **`Moderate every account, wallet, broadcast and chat message on this server.`**; **`Log out`** button (`border-red-900/30 bg-red-950/20 text-red-400`, LogOut).
Client pre-validation toasts (before any network call): empty agent ID → **`Enter the agent ID.`**; amount below the client threshold constant → **`That amount is too small.`** (the threshold value itself is server-side settled, never displayed in the app).

### 3.9 Games (`screens/Games.tsx`)
Root `bg-[#07050c] pb-16` + fixed top glow (`h-[260px]`, see §2.3).
1. Sticky header (`pt-9 pb-2.5 backdrop-blur-xl`): back ChevronLeft; title `Gamepad2` (text `#ff7b00`) + **`Games`**; sub **`settled on the server`** (`text-[9px] font-black uppercase tracking-[0.16em] text-white/35`); right RefreshCw (`animate-spin` while loading, `aria-label="Refresh games"`).
2. Wallet bar (`rounded-[22px] border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl`): coin chip `h-8 w-8 rounded-xl bg-gradient-to-br from-[#ff7b00] to-[#ffae00] text-black` + Coins glyph; balance `text-[16px] font-black tabular-nums`; unit **`coins`**; net pill `+ / − / = {abs(net)}` (emerald when >0, rose when <0, neutral `bg-white/[0.06] text-white/45`). Three stat cells: **`wagered`**, **`returned`**, **`rounds`** with `money()` values.
3. Failure band (`rounded-[18px] border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-[11px] font-bold text-rose-100`) — copy from `gameErrorText`, or **`Could not reach the games server`**.
4. Grid branch: Eyebrow(Sparkles `#ff7b00`) **`pick a table`**; `grid-cols-2 gap-3` of `GameTile`s (`animate-slide-up`); `wide` games get `col-span-2 h-[128px]`, normal `h-[132px]`; while loading with none → 4 × `skeleton h-[132px] rounded-[22px]`; none and done → **`No tables are open on this server yet.`**. Net line (only when `net !== 0`): arrow + **`{abs(net)} 🪙`** + **`net across {rounds} rounds`**. Then Eyebrow(History) **`recent rounds`**: up to 8 rows — 28 px gradient tile with the game emoji (fallback Dices), name, **`{KIND_LABEL} · {ago} ago`**, right side **`−{money(bet)}`** and result chip **`+{money(payout)} 🪙`** (emerald) or **`0` **🪙**`** (neutral). 3 × `skeleton h-[46px] rounded-[18px]` while loading; **`No rounds played yet.`** when empty.
5. Table branch (`Table`): **`All tables`** back link (uppercase `tracking-[0.18em]`); header card (see §2.3) with giant emoji `text-[104px] opacity-20`, kind chip (`KIND_ICON` + `KIND_LABEL`), `min {money(minBet)}` chip, `hot` chip (`tone #ff5c8a`), name `text-[19px] font-black`, blurb `max-w-[280px] text-[11px] text-white/70`; then the kind-specific body.
   - Shared `BetBar` (`Panel label="Stake"`, `Chip` = **`min {money(min)} - max {money(max)}`**): number input with Coins glyph `#ffae00` left and unit **`coins`** right; quick steps = `[minBet, minBet*5, minBet*10, minBet*50]` filtered `<= maxBet`, selected = `bg-white text-black shadow-[0_8px_20px_-8px_rgba(255,255,255,0.5)]`.
   - Shared `Outcome`: Trophy/ArrowDown + `result.label` (fallback **`Winner`** / **`No win`**), amount `+{payout} 🪙` / `-{bet} 🪙`, footnote **`Paid at ×{multiplier}`**.
   - `DiceTable`: two 78 px faces (`text-[46px]`, `animate-bounce` while busy) showing `⚀`–`⚅` or `🎲`; Chip = **`rolled total {n}`** / **`choose low or high`**; two choice buttons with ArrowDown `#ff7b00` (low) / ArrowUp `#00f5d4` (high), each labelled with the server `choice.label` and **`pays ×{multiplier}`**.
   - `SlotsTable`: three 74 px reels, `animate-pulse blur-[1px]` while spinning, jackpot → `border-[#ffae00]` + amber glow; Chip = **`three of a kind`** (tone `#ffae00`) / **`spin to settle`**; ActionButton label **`Spin · {bet} 🪙`** / **`Reels running…`**; local reel churn every 70 ms with a 5000 ms failsafe; `Panel label="Paytable"` in 2 cols: **`pair ×{pair} · three ×{triple}`**.
   - `MinesTable`: `Panel label="Board"` with live multiplier chip `×{multiplier.toFixed(2)}` (`#00f5d4`); status line **`{n} turned · {m} hidden`** / **`Set a stake to open the board`**; grid `grid-cols-3|4|5` of square tiles, hit → `meta.hit` on emerald, bust → `meta.bust` on rose + `animate-pulse`, unturned → translucent; revealed mines shown after the round closes. `Panel label="Ladder"` (Chip **`{done}/{len} turned`** or **`{len} steps`**) renders `×{step.toFixed(2)}` chips (done = white-on-black, next = bordered white, rest = dim). While open: ActionButton **`Cash out {value} 🪙`** (`['#11998e','#38ef7d']`, disabled until ≥1 pick) + Next-tile card **`Next tile`** / `×{n}` or **`board clear`**; when idle: **`Open board · {bet} 🪙`**.
   - `PokerTable`: 5 cards `aspect-[3/4]` `bg-gradient-to-b from-white to-white/80`, rank+suit (red-600 for ♥♦, gray-900 else), `?` placeholder; HOLD = `-translate-y-1.5 ring-2 ring-[#ffae00]` and strip **`hold`** (`bg-[#ffae00] text-black`), unheld strip **`tap`** (`bg-black/10 text-black/45`); caption **`tap to hold · then draw`**; ActionButton **`Draw and settle`** / **`Deal · {bet} 🪙`**; `Panel label="Paytable"` 2-col rows, matching result label highlighted `bg-white/10` with `#ffae00` multiplier else `#00f5d4`.
`KIND_LABEL` = mines **`Tile grid`**, slots **`Reels`**, dice **`High / low`**, poker **`Video poker`**. `KIND_ICON` = mines Gem, slots Zap, dice Dices, poker Trophy.

### 3.10 Admin (`screens/Admin.tsx`)
Root `bg-[#121212] pt-11`, `flex flex-1 flex-col overflow-hidden`.
Header: back ChevronLeft, Shield(amber) + **`Admin control`**, sub **`Users, wallets, broadcasts and chat moderation`**, RefreshCw (spin while `busy==='loading'`, `aria-label="Refresh"`).
Failure band: **`This account is not an administrator.`** when code `admin-only`, else **`Admin API unreachable ({code})`**, with X.
Panel switcher `grid-cols-4`: `Overview` / `Users` / `Live` / `Chat`; the `Live` label appends `` ` ${data.live.length}` ``.
- Overview: `grid-cols-3` tiles — `Accounts`, `Broadcasts`, `Admins`, `Agents`, `Chat msgs`, `Gifts`, `Follows`, then three `wide` (`col-span-3`) tiles `Gift 🪙`, `Wallet 🪙`, `Wallet 💎`; missing value renders `—`. Card **`Live right now — {n}`** listing ≤4 rows `{title} · {host.displayName ?? 'unknown'}` + `{viewers} watching` (rose); empty **`No rooms on air.`**. Card **`Latest gifts`** ≤8 rows `{fromName} → {toName} · {giftKey} ×{quantity}` + `🪙 {coins}`; empty **`No gifts recorded yet.`**
- Users: search field placeholder **`Search name, handle, email or region`** (matches displayName / userId / handle / email / region). Row: avatar or initial, name, `ADMIN` chip (`bg-amber-500/20 text-amber-300`) / `AGENT` chip (`bg-sky-500/20 text-sky-300`), detail line `{userId ?? id.slice(-6)} · @{handle} · 🪙 {coins} · 💎 {diamonds} · {broadcasts} broadcasts`. Expanded: `{email} · {region || 'no region'} · joined {ago}`; currency toggle `🪙 Coins` / `💎 Diamonds`; 4 quick-credit buttons per currency (`+{amount.toLocaleString()}`); custom amount input (**`Amount`**, digits-only) + **`Credit`** + **`Debit`**; role button **`Demote to member`** (admin) / **`Promote to admin`** (agent) / **`Make agent`** (member). Empty list → **`No accounts loaded.`** Quick amounts (UI-visible coins): 100,000 · 500,000 · 2,000,000 · 10,000,000; diamonds: 1,000 · 50,000 · 100,000 · 1,000,000.
- Live: rows `{title}` + `{host} · {viewers} viewers · {likes} likes · since {ago}` + **`Force stop`** (Ban). Empty: **`Nothing is broadcasting right now.`**
- Chat: rows `{userName} · {kind} · {ago}`, body, `{streamId}`, Trash2 (`aria-label="Delete message {id}"`). Empty: **`No chat stored yet.`**
Toasts: `Enter an amount first` (error); success strings **`{amount} {🪙|💎} added to {displayName}`**, **`{amount} {🪙|💎} removed from {displayName}`**, **`{displayName} is now {role}`**, **`Stopped “{title}”`**, **`Message removed from chat history`**; failures **`Failed: {message}`** (message falls back to `unknown error`).

---

## 4. DATA MODEL (`app/src/types.ts`, 248 lines, verbatim field lists)

```ts
Wallet = { diamonds: number, coins: number, coins_earned: number }          // snake_case from SQLite
User = { id: string, userId: string | null, handle, displayName, avatarUrl, region, bio,
         diamonds: number, coins: number, coinsEarned: number, email,
         role: 'member' | 'agent' | 'admin' }
HostSummary = { id, displayName, handle, avatarUrl, region, bio, coinsEarned: number, followers: number }
StreamMode = 'solo' | 'party';  PartyKind = 'video' | 'audio'
Seat = { index: number, empty: boolean, userId, socketId, displayName, avatarUrl,
         mic: boolean, cam: boolean, isOwner: boolean }
LiveStream = { id, hostId, title, region, startedAt: number(ms), viewers: number, likes: number,
               mode: StreamMode, partyType: PartyKind | '', seatCount: number, seats: Seat[], host: HostSummary }
OfflineStream = { id, hostId, title, region, startedAt: number, endedAt: number | null, live: number,
                  viewers: number /*peak_viewers*/, likes: number, hostName, hostAvatar, followers: number }
ChatKind = 'chat' | 'system' | 'gift'
ChatMessage = { id: number, streamId?: string, userId, kind: ChatKind, body, userName, createdAt: number }
Gift = { key, name, icon, coins: number }
ViewerInfo = { socketId, userId, displayName }
LeaderRow = { rank: number, id, name, avatar, handle, coins: number,
              topGifts: { key: string, times: number, coins: number }[] }
AppNotification = { id?: number, kind, title, body, createdAt: number, readAt?: number | null }
Heart = { id: number, color: string, left: number }
GiftFlight = { id: number, icon, name, userName, quantity: number }
RoomRole = 'host' | 'viewer'
Toast = { id: number, text, tone: 'info' | 'error' | 'good' }
AdminStats = { users, streams, messages, gifts, giftCoins, walletCoins, walletDiamonds, follows, admins, agents }  // all number
AdminUserRow = { id, userId: string | null, handle, displayName, email, region, avatarUrl,
                 diamonds, coins, coinsEarned, role, createdAt: number, broadcasts: number, followers: number }
AdminGiftRow = { id, streamId, giftKey, quantity, coins, createdAt, fromName, toName }
AdminMessageRow = { id, streamId, kind, body, createdAt, userName }
AdminOverview = { stats: AdminStats, live: LiveStream[], gifts: AdminGiftRow[], messages: AdminMessageRow[] }
GameKind = 'mines' | 'slots' | 'dice' | 'poker'
GameMeta = { key, name, emoji, from, to, hot: boolean, wide: boolean, kind, blurb,
             minBet: number, maxBet: number, cols?, rows?, cells?, mines?, hit?, bust?,
             ladder?: number[], reels?: string[], paytable?: {icon,pair,triple}[],
             choices?: {key,label,multiplier}[], pokerPaytable?: {key,label,multiplier}[] }
GameRound = { boardId, game, kind, bet, payout, status, createdAt }
RoundResult = { boardId, game, kind, bet, wallet: Wallet, payout?, multiplier?, label?, instant?,
                dice?: number[], total?, won?, icons?: string[], triple?, cells?, mineCount?,
                mines?: number[], picks?: number[], nextMultiplier?: number | null, busted?, cell?, cleared?, hand?: string[] }
```
Server row mapping: `publicUser(row)` → `userId = String(public_id)`, `coinsEarned = coins_earned`, `role = role || 'member'`. Admin SQL aliases produce exactly the camelCase names above (`q.adminUsers`, `q.adminGifts`, `q.adminMessages`, `q.adminStats`, `q.gameRounds`, `q.gameTotals`).
SQLite tables (`server/src/db.js`): `users(id PK, handle UNIQUE, display_name, email UNIQUE, password_hash, avatar_url, region, bio, diamonds, coins, coins_earned, role, created_at, public_id)`; `streams(id PK, host_id FK, title, region, started_at, ended_at, live, peak_viewers, likes, mode, party_type, seat_count)` + indexes `streams_live_idx(live,started_at)`, `streams_host_idx(host_id,started_at)`; `messages(id AUTOINC, stream_id, user_id, kind, body, created_at)` + `messages_stream_idx(stream_id,id)`; `gifts(id, stream_id, from_user_id, to_user_id, gift_key, quantity, coins, created_at)` + `gifts_to_idx`, `gifts_from_idx`; `follows(follower_id, host_id, created_at)` composite PK; `notifications(id, user_id, kind, title, body, created_at, read_at)` + `notifications_user_idx`; `push_tokens(user_id PK, push_token UNIQUE, platform, updated_at)`; `game_boards(id PK, user_id, game, kind, bet, payout, payload JSON, status, created_at, updated_at)` + `game_boards_user_idx`; `mirror_queue(id, entity, key)`, `mirror_meta(key PK, value)`. Pragmas `journal_mode = wal`, `foreign_keys = on`. Migrations add `users.role`, `users.coins` (backfill from `coins_earned`, then demo-account values), rename `gifts.diamonds→coins`, add `streams.mode/party_type/seat_count`, add `users.public_id` + unique index + `users_public_id` AFTER INSERT trigger. Six-digit account numbers: admin fixed at `111111`, every other account counts up from `112201`; internal `id` remains the key for streams/messages/wallets/socket rooms. Party constants: `PARTY_SEAT_CHOICES = [4,6,9,12,15]`, `PARTY_KINDS = ['video','audio']`. Guarded wallet SQL: `spendCoins`/`spendDiamonds` use `WHERE … >= ?` and require `changes === 1`; `addCoins`/`addDiamonds`/`adjust*` clamp with `max(0, …)`.

---

## 5. SERVER CONTRACT

### 5.1 REST (all JSON; `content-type: application/json`; `cache-control: no-store`; body cap 32 KB → `payload-too-large`)
| Method | Path | Purpose / notes |
|---|---|---|
| GET | `/health` | `{ok, service:'addabuzz-live', liveStreams, peers[], uptimeSec, mirror:'on'|'off'}`; client reads `{ok, liveStreams}` |
| GET | `/catalog` | `{gifts, tabs:['Feature','Nearby','Newest'], iceServers[]}` — client uses `gifts` + `iceServers`; `tabs` unused |
| GET | `/rtc/ice` | `{iceServers}` (not called by the SPA) |
| POST | `/auth/signup` | `{email,password,displayName,region}` → 201 `{token,user}`; grants the signup coin balance + `system` notification |
| POST | `/auth/login` | `{email,password}` → `{token,user}` |
| GET | `/auth/me` | bearer → `{user}`; 401 `unauthorized` |
| GET | `/streams` | `{live: LiveStream[], offline: OfflineStream[] (last 12 ended)}`; `live` sorted by region match, viewers desc, startedAt desc |
| GET | `/leaderboard?period=` | `daily|weekly|monthly|anything-else=all-time`; `{period, ranked:[{id,rank,name,avatar,handle,coins,topGifts[]}]}` (top 20) |
| GET | `/notifications` | marks all unread as read; `{items:[{id,kind,title,body,createdAt,readAt}]}` (50 max) |
| POST | `/notifications/token` | `{token,platform}` → `{ok}`; 400 `bad-token` |
| DELETE | `/notifications/token` | clears the account token → `{ok}` |
| POST | `/wallet/topup` | `{package:'small'|'medium'|'large'|'mega'}` → `{wallet}`; 403 `topup-disabled` when `ADDABUZZ_ALLOW_TOPUP==='0'` |
| POST | `/wallet/convert` | `{amount}` coins → `{wallet}` |
| POST | `/wallet/transfer` | `{agentId, diamonds}` → `{wallet}` |
| GET | `/follows` | `{following:[{id,display_name,avatar_url}], followers, followingCount, broadcasts: last 20 ended streams}` |
| PUT | `/profile` | `{displayName,avatarUrl,region,bio}` (limits 40/400/64/200) → `{user}` |
| GET | `/games` | `{games: listGames()}` — full catalogue incl. names, odds, limits |
| GET | `/games/rounds` | `{rounds: last 20, totals:{staked,won,rounds}}` |
| POST | `/games/play` | `{game,bet,choice?}` → `RoundResult` |
| POST | `/games/pick` | `{boardId,index}` → `RoundResult` |
| POST | `/games/cashout` | `{boardId}` → `RoundResult` |
| POST | `/games/draw` | `{boardId,holds:number[]}` → `RoundResult` |
| GET | `/admin/overview` | `{stats, live, gifts(20), messages(30), mirror, you}` — client keeps only stats/live/gifts/messages |
| GET | `/admin/users?limit=` | 1..500, default 200 → `{users: AdminUserRow[]}` (client requests 300) |
| POST | `/admin/users/adjust` | `{userId,currency:'coins'|'diamonds',amount(±, |Δ| ≤ 1e8, ≠0)}` → `{user,wallet}` + notifies + pushes + `wallet:updated` + `notification:new` |
| POST | `/admin/users/role` | `{userId, role:'member'|'agent'|'admin'}` → `{user}` |
| POST | `/admin/streams/stop` | `{streamId}` → `{ok,streamId}`; 404 `not-live` |
| DELETE | `/admin/messages/:id` | → `{ok,id}` + `message:deleted` fan-out |
| GET | `/selftest` | dev-only (`NODE_ENV!=='production'`) HTML harness |
| GET | `/*` | static SPA from `app/dist` with `index.html` fallback; `.html` no-store, others `max-age=300`; path traversal → 403 `forbidden` |

Error codes: `invalid-signup`, `email-taken`, `too-many-attempts`, `unauthorized`, `invalid-credentials`, `unknown-package`, `topup-disabled`, `bad-amount`, `below-minimum`, `not-enough-coins`, `not-enough-diamonds`, `self-transfer`, `not-an-agent`, `avatar-must-be-http`, `admin-only`, `no-such-user`, `bad-role`, `last-admin`, `not-live`, `no-such-message`, `unknown-admin-route`, `method-not-allowed`, `payload-too-large`, `bad-json`, `internal`, `not-found`, `no-such-game`(404), `round-closed`(409), `bad-bet`, `bad-choice`, `bad-cell`, `already-picked`, `nothing-to-cash`, `wrong-game`, `forbidden`, `unauthorized`. Throttles: signup 8/60 s per IP, login 12/60 s per IP. CORS: `access-control-allow-origin: req.headers.origin || '*'`, allow headers `content-type,authorization`, methods `GET,POST,PUT,DELETE,OPTIONS`, 204 on OPTIONS.
Client method wrappers (`lib/net.ts api`): `health, catalog, login, signup, me, streams, leaderboard, notifications, registerPushToken, clearPushToken, topup, convert, transfer, follows, saveProfile, adminOverview, adminUsers, adminAdjustWallet, adminSetRole, adminStopStream, adminDeleteMessage, games, gamePlay, gamePick, gameCashOut, gameDraw, gameRounds`.
Client resolution rules: `serverBase()` = `localStorage['addabuzz.server']` else, when in the native shell (`capacitor://` or `localhost`) **or** the page origin is not private, the build-time baked `__ADDABUZZ_DEFAULT_SERVER__` (default `http://192.168.0.106:8787`), else the page origin. `setServerBase` requires `^https?://`. Requests attach `Authorization: Bearer ${localStorage['addabuzz.token']}`, `cache:'no-store'`, and throw `ApiError(0,'offline')` on network failure; `no-server` when no base.

### 5.2 socket.io contract
Server: `path '/socket.io'`, `cors {origin:true, credentials:true}`, `serveClient: NODE_ENV!=='production'`, `pingInterval 10000`, `pingTimeout 20000`, `maxHttpBufferSize 1e6`. Auth middleware reads `socket.handshake.auth.token` → `verifyToken` → `socket.data.user = publicUser(row)`; failure → `Error('unauthorized')`. Rooms: each socket joins `u:${userId}` plus the stream id when in a room.
Client socket: `io(serverBase, { path:'/socket.io', auth:{token}, transports:['websocket','polling'], reconnection:true, reconnectionDelay:800, reconnectionDelayMax:4000 })`.

On `connection` the server emits, in order: `stream:list` (region-ranked live list), `wallet:updated`, `notification:list` (each item gets `unread: readAt == null`).

Client → server (emit order after connect: none — the client waits for events; then `stream:start` or `stream:join` first, followed by interaction events).

| Client emit | Payload | Ack (server → client) |
|---|---|---|
| `stream:start` | `{title, region, mode, partyType, seatCount}` | `{ok, streamId, iceServers, summary, seats}` · errors `already-live`, `internal` |
| `stream:stop` | `{}` | `{ok, stopped}` |
| `stream:join` | `{streamId}` | `{ok, streamId, role:'viewer', hostSocketId, iceServers, summary, viewers, seats, media:{send,recv}, messages(last 40)}` · errors `not-live`, `own-stream` |
| `room:leave` | `{streamId}` | (no ack; fire-and-forget) |
| `webrtc:signal` | `{streamId, toSocketId, data}` where `data` = `{type:'offer'|'answer'|'ice-candidate', sdp?, candidate?}` | (no ack) |
| `seat:take` | `{streamId, seatIndex?}` | `{ok, seatIndex, seats, cameraCap}` · errors `not-a-party-room`, `not-in-room`, `already-seated`, `slow-down`, `seat-taken`, `bad-seat`, `room-full` |
| `seat:leave` | `{streamId}` | `{ok, seats}` · errors `not-seated`, `owner-chair` |
| `seat:set` | `{streamId, mic?, cam?}` (+ server accepts `seatIndex`) | `{ok, seats, cameraCap}` · errors `not-a-party-room`, `not-seated`, `not-allowed`, `camera-limit` |
| `seat:kick` | `{streamId, seatIndex}` | `{ok, seats}` · errors `not-allowed`, `not-seated` |
| `chat:send` | `{streamId, body}` | `{ok}` · errors `not-in-room`, `slow-down`, `empty` |
| `reaction:heart` | `{streamId}` | (no ack) |
| `gift:send` | `{streamId, giftKey, quantity}` | `{ok, coins, diamonds}` · errors `not-in-room`, `unknown-gift`, `slow-down`, `not-enough-coins` (+ `needed`) |
| `follow:set` | `{hostId, following}` | `{ok, following, followers, host}` · error `invalid-target` |

| Server emit | Payload | Client listener side effect |
|---|---|---|
| `stream:list` | `LiveStream[]` | replaces `live` |
| `wallet:updated` | `Wallet` | patches `user.diamonds/coins/coinsEarned` |
| `notification:list` | `AppNotification[]` | replaces notifications |
| `notification:new` | `AppNotification` | prepend, cap 50, `createdAt` fallback `Date.now()` |
| `chat:new` | `ChatMessage` (+`userName`,`avatarUrl`) | append, dedupe by `id`, cap 120 |
| `message:deleted` | `{id, streamId}` | removes from list |
| `reaction:heart` | `{streamId, socketId, userId, likes, color, left}` | push heart (cap 24, TTL 1800 ms), update `room.likes` when same stream |
| `gift:new` | `{streamId, fromUserId, fromUserName, gift, quantity, coins}` | push flight (cap 4, TTL 2600 ms) |
| `host:stats` | `{streamId, coinsEarned}` | **emitted to the host but never listened to (dead)** |
| `viewer:list` | `{streamId, viewers: ViewerInfo[]}` | replaces `room.viewers` |
| `viewer:joined` | `{viewerSocketId, viewer:{id,displayName,avatarUrl}}` | toast `` `${displayName} joined` `` (good) — host only |
| `viewer:left` | `{viewerSocketId}` | closes that peer link |
| `media:send` | `{streamId, peers: socketId[]}` | opens sendonly `PeerLink`s |
| `media:recv` | `{streamId, peers: socketId[]}` | opens recvonly `PeerLink`s |
| `media:stop` | `{streamId, peers: socketId[]}` | closes those links |
| `seat:list` | `{streamId, seats}` | replaces seats, recomputes `mySeatIndex` from `user.id` |
| `seat:released` | `{streamId, seatIndex}` | toast `You were asked to leave chair {seatIndex+1}` |
| `webrtc:signal` | `{streamId, fromSocketId, data}` | feeds the matching link's `accept()` |
| `stream:closed` | `{streamId, reason}` | teardown + toast: `host-ended` → `The broadcast has ended`; `admin-stopped` → `An admin stopped this broadcast`; else → `Connection to the broadcaster was lost` |

Server-side limits & rules: `LIMITS {title:80, region:64, chat:300, giftQty:99}` (quantity clamped 0..99, default 1); token buckets per socket — chat `4 cap / 2 per s`, heart `12 / 8`, seat `6 / 2`, gift `3 / 1`; `cleanText` strips C0 control chars and trims; title fallback `"{displayName} is live"`; party defaults: invalid `partyType`→`video`, invalid `seatCount`→`6`; a host of a party room auto-occupies seat 0 with `mic:true`, `cam: partyType==='video'`; seat take grants `cam` only if video party and cameras running < cap; `webrtc:signal` is relayed only when the target is in the sender's `send` or `recv` set, SDP must be a string `< 200000` chars, publishers must send `offer` and subscribers `answer`, ICE requires `candidate != null`; likes persist to SQL every 10th heart; `stream:closed` reasons `host-ended` / `admin-stopped` / `host-disconnected` (disconnect of the host socket); on any disconnect the server removes the socket from all viewer lists and seats.
Server-generated `system` chat bodies (verbatim templates): `` {displayName} started the live stream ``, `` {displayName} opened a party room ({partyType}, {seatCount} chairs) ``, `` {displayName} joined the room ``, `` {displayName} took chair {n} ``, `` {displayName} left chair {n} ``, `` {displayName} was asked to leave chair {n} ``. `gift` chat body: `` sent {qty}x {name} {icon} `` (the `{qty}x ` prefix only when quantity > 1).

---

## 6. GAMES — all 7 tables

**Names, tag