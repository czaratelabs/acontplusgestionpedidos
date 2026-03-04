-- =============================================================================
-- TRIGGER: Incrementar secuencial de categoría al insertar en article_variants
-- =============================================================================
-- Automatiza el contador en categories.secuencial cuando se inserta una variante.
-- Seguridad: si el artículo no tiene categoría, no hace nada (no falla el INSERT).
--
-- IMPORTANTE: Este trigger incrementa por cada variante insertada.
-- Si un artículo tiene N variantes, secuencial aumentará N veces.
-- Si necesitas 1 incremento por artículo (no por variante), usa un trigger
-- en la tabla articles en lugar de article_variants.
--
-- Ejecutar en Supabase SQL Editor, psql o tu cliente PostgreSQL.
-- =============================================================================

-- 1. Función del trigger
CREATE OR REPLACE FUNCTION public.fn_increment_category_sequential()
RETURNS TRIGGER AS $$
DECLARE
  _category_id uuid;
BEGIN
  -- Obtener category_id del artículo asociado (article_variants -> articles -> categories)
  SELECT a.category_id INTO _category_id
  FROM articles a
  WHERE a.id = NEW.article_id;

  -- Incrementar solo si existe categoría (evita fallo si category_id es NULL)
  IF _category_id IS NOT NULL THEN
    UPDATE categories
    SET secuencial = secuencial + 1
    WHERE id = _category_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Eliminar trigger si existe (por re-ejecución)
DROP TRIGGER IF EXISTS trg_after_insert_variant ON public.article_variants;

-- 3. Crear trigger
CREATE TRIGGER trg_after_insert_variant
  AFTER INSERT ON public.article_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_increment_category_sequential();
