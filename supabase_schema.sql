-- ==============================================================================
-- AddaBuzz Live: Supabase SQL Schema for Game Backend & Realtime Synchronization
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Game Wallets (Stores arcade/game coin balance for users)
CREATE TABLE IF NOT EXISTS public.game_wallets (
    user_id TEXT PRIMARY KEY,
    coins BIGINT NOT NULL DEFAULT 100000 CHECK (coins >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Game Rounds (For multiplayer live games: Fruit Manor & Golden Flower)
CREATE TABLE IF NOT EXISTS public.game_rounds (
    id TEXT PRIMARY KEY,
    game_type TEXT NOT NULL, -- 'fruit_manor' | 'golden_flower' | 'arcade'
    seq BIGINT NOT NULL,
    phase TEXT NOT NULL, -- 'BETTING' | 'REVEALING' | 'SETTLED'
    result_data JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    leader_id TEXT,
    leader_leased_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for speedy lookups
CREATE INDEX IF NOT EXISTS idx_game_rounds_type_seq ON public.game_rounds (game_type, seq DESC);

-- 3. Game Bets (Bets placed on active rounds)
CREATE TABLE IF NOT EXISTS public.game_bets (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL REFERENCES public.game_rounds(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    bet_data JSONB NOT NULL, -- e.g. { fruitId: 'WATERMELON', multiplier: 5 }
    stake BIGINT NOT NULL CHECK (stake > 0),
    status TEXT NOT NULL DEFAULT 'ACCEPTED', -- 'ACCEPTED' | 'WON' | 'LOST' | 'REFUNDED'
    payout BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_bets_round ON public.game_bets (round_id);
CREATE INDEX IF NOT EXISTS idx_game_bets_user ON public.game_bets (user_id);

-- 4. Arcade Game History (Coin Flip, Plinko, Crash, Mines, Hi-Lo, etc.)
CREATE TABLE IF NOT EXISTS public.arcade_history (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL,
    game_name TEXT NOT NULL,
    stake BIGINT NOT NULL,
    multiplier NUMERIC(10, 2) NOT NULL,
    outcome TEXT NOT NULL, -- 'WIN' | 'LOSS'
    payout BIGINT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arcade_history_user ON public.arcade_history (user_id, created_at DESC);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.game_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_history ENABLE ROW LEVEL SECURITY;

-- Allow public read & write for game client (or customize with Supabase Auth)
CREATE POLICY "Public read game_wallets" ON public.game_wallets FOR SELECT USING (true);
CREATE POLICY "Public upsert game_wallets" ON public.game_wallets FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read game_rounds" ON public.game_rounds FOR SELECT USING (true);
CREATE POLICY "Public manage game_rounds" ON public.game_rounds FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read game_bets" ON public.game_bets FOR SELECT USING (true);
CREATE POLICY "Public insert game_bets" ON public.game_bets FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read arcade_history" ON public.arcade_history FOR SELECT USING (true);
CREATE POLICY "Public insert arcade_history" ON public.arcade_history FOR ALL USING (true) WITH CHECK (true);

-- 6. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_bets;
