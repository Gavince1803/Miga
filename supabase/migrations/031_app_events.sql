-- First-party usage events (lib/analytics.ts): signup funnel, paywall, quotes
-- shared, recipes scanned. Insert-only from the app; read with SQL.
-- Events before signup have user_id NULL and are linked by device_id.
BEGIN;

CREATE TABLE IF NOT EXISTS public.app_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id text CHECK (char_length(device_id) <= 64),
    name text NOT NULL CHECK (char_length(name) <= 40),
    props jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(props) <= 2048),
    platform text CHECK (platform IN ('ios', 'android', 'web')),
    app_version text CHECK (char_length(app_version) <= 20),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_events_name_created_idx ON public.app_events (name, created_at);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Anyone may insert, but only as themselves (or anonymously before signup).
-- No SELECT/UPDATE/DELETE policies: the app can't read or change events.
CREATE POLICY "insert own or anonymous events" ON public.app_events
    FOR INSERT TO anon, authenticated
    WITH CHECK (user_id IS NOT DISTINCT FROM (SELECT auth.uid()));

COMMIT;
