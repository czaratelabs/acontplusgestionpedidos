-- =============================================================================
-- FIX: record "new" has no field "article_variant_id"
-- =============================================================================
-- El trigger trg_sync_cost_update en article_variants estaba llamando 
-- fn_calculate_article_profitability(), que espera NEW.article_variant_id (de 
-- article_variant_prices). En article_variants NEW tiene "id", no "article_variant_id".
--
-- Ejecutar en Supabase SQL Editor, psql o tu cliente PostgreSQL.
-- =============================================================================

-- 1. Eliminar el trigger problemático
DROP TRIGGER IF EXISTS trg_sync_cost_update ON public.article_variants;

-- 2. Crear función correcta para article_variants (usa NEW.id)
CREATE OR REPLACE FUNCTION public.fn_sync_cost_to_profitability()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.cost IS DISTINCT FROM NEW.cost) THEN
    UPDATE article_variant_prices
    SET updated_at = now()
    WHERE article_variant_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recrear trigger con la función correcta
CREATE TRIGGER trg_sync_cost_update
AFTER UPDATE OF cost ON public.article_variants
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_cost_to_profitability();
