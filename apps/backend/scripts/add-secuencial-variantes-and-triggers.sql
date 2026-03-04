-- =============================================================================
-- 1. Agregar secuencial_variantes a categories
-- =============================================================================

ALTER TABLE "categories"
ADD COLUMN IF NOT EXISTS "secuencial_variantes" integer NOT NULL DEFAULT 1;


-- =============================================================================
-- 2. Trigger: incrementar secuencial de artículo al guardar en articles
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_increment_category_secuencial_article()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    UPDATE categories
    SET secuencial = secuencial + 1
    WHERE id = NEW.category_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_insert_article ON public.articles;

CREATE TRIGGER trg_after_insert_article
  AFTER INSERT ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_increment_category_secuencial_article();


-- =============================================================================
-- 3. Trigger: incrementar secuencial de variante al guardar en article_variants
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_increment_category_secuencial_variante()
RETURNS TRIGGER AS $$
DECLARE
  _category_id uuid;
BEGIN
  SELECT a.category_id INTO _category_id
  FROM articles a
  WHERE a.id = NEW.article_id;

  IF _category_id IS NOT NULL THEN
    UPDATE categories
    SET secuencial_variantes = secuencial_variantes + 1
    WHERE id = _category_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_insert_variant ON public.article_variants;

CREATE TRIGGER trg_after_insert_variant
  AFTER INSERT ON public.article_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_increment_category_secuencial_variante();
