-- =============================================================================
-- Migration 001 — device_tokens table
-- Project : Plumb Leveled & Square
-- Run in  : Supabase Dashboard → SQL Editor (once per environment)
-- =============================================================================

-- ─── Table ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_tokens (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      TEXT,                                 -- nullable; links token to auth user
    device_token TEXT         UNIQUE NOT NULL,         -- 64-char hex APNs token
    platform     TEXT         NOT NULL DEFAULT 'ios',  -- 'ios' | 'macos'
    bundle_id    TEXT         NOT NULL
                              DEFAULT 'com.brickoutdoorliving.plumbleveledandsquare',
    environment  TEXT         NOT NULL DEFAULT 'production', -- 'development' | 'production'
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.device_tokens                IS 'APNs device tokens registered by the PLS iOS app';
COMMENT ON COLUMN public.device_tokens.device_token   IS '64-char lowercase hex APNs device token';
COMMENT ON COLUMN public.device_tokens.environment    IS '"development" = sandbox; "production" = live APNs';
COMMENT ON COLUMN public.device_tokens.user_id        IS 'auth.users.id — null for unauthenticated devices';

-- ─── Auto-update trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_device_tokens_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_device_tokens_updated_at ON public.device_tokens;
CREATE TRIGGER trg_device_tokens_updated_at
    BEFORE UPDATE ON public.device_tokens
    FOR EACH ROW EXECUTE FUNCTION public.set_device_tokens_updated_at();

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id
    ON public.device_tokens (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_device_tokens_environment
    ON public.device_tokens (environment);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON public.device_tokens
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ─── Rollback (keep commented; uncomment only if dropping the migration) ──────
-- DROP TABLE IF EXISTS public.device_tokens;
-- DROP FUNCTION IF EXISTS public.set_device_tokens_updated_at();
