-- ==============================================================================
-- AddaBuzz Live: Fix Table Permissions for Supabase 'anon' and 'authenticated'
-- ==============================================================================

-- 1. Grant table access to anon and authenticated roles
GRANT ALL ON TABLE public.game_wallets TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.game_rounds TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.game_bets TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.arcade_history TO anon, authenticated, service_role;

-- 2. Grant sequence access if needed
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Re-ensure Row Level Security (RLS) policies allow access
DROP POLICY IF EXISTS "Public read game_rounds" ON public.game_rounds;
DROP POLICY IF EXISTS "Public manage game_rounds" ON public.game_rounds;
CREATE POLICY "Public read game_rounds" ON public.game_rounds FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public manage game_rounds" ON public.game_rounds FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read game_bets" ON public.game_bets;
DROP POLICY IF EXISTS "Public insert game_bets" ON public.game_bets;
CREATE POLICY "Public read game_bets" ON public.game_bets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert game_bets" ON public.game_bets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read arcade_history" ON public.arcade_history;
DROP POLICY IF EXISTS "Public insert arcade_history" ON public.arcade_history;
CREATE POLICY "Public read arcade_history" ON public.arcade_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert arcade_history" ON public.arcade_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read game_wallets" ON public.game_wallets;
DROP POLICY IF EXISTS "Public upsert game_wallets" ON public.game_wallets;
CREATE POLICY "Public read game_wallets" ON public.game_wallets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public upsert game_wallets" ON public.game_wallets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
