-- ==============================================================================
-- AddaBuzz Live: Dedicated Supabase Game State Schema
-- ==============================================================================

-- 1. Table for Realtime Game Boards (Single source of truth for Fruit Manor & Golden Flower)
CREATE TABLE IF NOT EXISTS public.game_boards (
    game_type TEXT PRIMARY KEY, -- 'fruit_manor' | 'golden_flower'
    round_id TEXT NOT NULL,
    seq BIGINT NOT NULL DEFAULT 1,
    phase TEXT NOT NULL DEFAULT 'OPEN', -- 'SCHEDULED' | 'OPEN' | 'LOCKED' | 'DRAWN' | 'SETTLING' | 'SETTLED' | 'VOIDED'
    phase_ends_at BIGINT NOT NULL,
    result_data JSONB DEFAULT '{}'::jsonb,
    recent_results JSONB DEFAULT '[]'::jsonb,
    leader_uid TEXT,
    leader_lease_until BIGINT NOT NULL DEFAULT 0,
    config_version TEXT DEFAULT 'fm-v1',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initialize default boards if not present
INSERT INTO public.game_boards (game_type, round_id, seq, phase, phase_ends_at, recent_results, leader_uid, leader_lease_until)
VALUES 
  ('fruit_manor', 'FM-1', 1, 'OPEN', (EXTRACT(EPOCH FROM NOW()) * 1000 + 15000)::BIGINT, '[]'::jsonb, 'system', (EXTRACT(EPOCH FROM NOW()) * 1000 + 60000)::BIGINT),
  ('golden_flower', 'GF-1', 1, 'OPEN', (EXTRACT(EPOCH FROM NOW()) * 1000 + 15000)::BIGINT, '[]'::jsonb, 'system', (EXTRACT(EPOCH FROM NOW()) * 1000 + 60000)::BIGINT)
ON CONFLICT (game_type) DO NOTHING;

-- Grant permissions
GRANT ALL ON TABLE public.game_boards TO anon, authenticated, service_role;
ALTER TABLE public.game_boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read game_boards" ON public.game_boards;
DROP POLICY IF EXISTS "Public manage game_boards" ON public.game_boards;
CREATE POLICY "Public read game_boards" ON public.game_boards FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public manage game_boards" ON public.game_boards FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable Realtime for game_boards
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_boards;
