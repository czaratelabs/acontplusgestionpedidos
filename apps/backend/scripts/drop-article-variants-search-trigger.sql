-- T2: Eliminar trigger/función que actualizan search_vector en article_variants
-- (la columna fue eliminada en migraciones; el trigger provoca fallos en INSERT/UPDATE).
-- Ejecutar en Supabase SQL editor o psql si aún existe el trigger en tu BD.

DROP TRIGGER IF EXISTS article_variants_search_trigger ON public.article_variants;
DROP FUNCTION IF EXISTS public.article_variants_search_trigger();
