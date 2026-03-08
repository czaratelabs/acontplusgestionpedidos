-- =============================================================================
-- Habilitar Row Level Security (RLS) en tablas del schema public
-- Para cumplir con el linter de Supabase (Performance / Security).
-- Ejecutar en Supabase: SQL Editor > New query > Pegar y Run.
-- El backend NestJS (usuario postgres) no se ve afectado; PostgREST queda protegido.
-- =============================================================================

-- Habilitar RLS en todas las tablas listadas por el linter
ALTER TABLE IF EXISTS public.subscription_plans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.companies               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.roles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_companies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.establishments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.emission_points         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.warehouses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.taxes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contacts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.business_rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.measures                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.colors                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sizes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.flavors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.brands                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.articles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.article_variants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.article_images          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.article_batches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.article_variant_prices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.article_variant_barcodes ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ROLLBACK (solo si necesitas deshacer): descomenta y ejecuta por separado
-- =============================================================================
/*
ALTER TABLE IF EXISTS public.subscription_plans       DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.companies               DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.roles                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_companies          DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.establishments          DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.emission_points         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.warehouses              DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.taxes                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contacts                DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_settings         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.business_rules          DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.measures                DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.colors                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sizes                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.flavors                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories             DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.brands                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.articles                DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.article_variants        DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.article_images          DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.article_batches         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs              DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.article_variant_prices  DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.article_variant_barcodes DISABLE ROW LEVEL SECURITY;
*/
