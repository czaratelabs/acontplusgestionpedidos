-- =============================================================================
-- Corregir "Function Search Path Mutable" (linter Supabase)
-- Fija search_path en funciones del schema public para evitar riesgos de seguridad.
-- Ejecutar en Supabase: SQL Editor > New query > Pegar y Run.
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- =============================================================================

-- Funciones sin argumentos (trigger functions)
ALTER FUNCTION public.fn_sync_cost_to_profitability() SET search_path = public;
ALTER FUNCTION public.fn_calculate_article_profitability() SET search_path = public;
ALTER FUNCTION public.fn_increment_category_secuencial_article() SET search_path = public;
ALTER FUNCTION public.fn_increment_category_secuencial_variante() SET search_path = public;

-- article_variants_search_trigger: si existe (puede haberse eliminado en migraciones)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'article_variants_search_trigger'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.article_variants_search_trigger() SET search_path = public';
  END IF;
END $$;
