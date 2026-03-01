-- =============================================================================
-- Script: Crear llave foránea article_variants.measure_id -> measures.id
-- Requiere: tabla article_variants con columna measure_id ya creada
-- =============================================================================

-- Crear la FK solo si la columna measure_id existe y la restricción no existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'article_variants'
      AND column_name = 'measure_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'article_variants'
      AND constraint_name = 'FK_article_variants_measure'
  ) THEN
    ALTER TABLE public.article_variants
      ADD CONSTRAINT FK_article_variants_measure
      FOREIGN KEY (measure_id) REFERENCES public.measures(id) ON DELETE SET NULL;
    RAISE NOTICE 'FK FK_article_variants_measure creada correctamente.';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'article_variants' AND column_name = 'measure_id'
  ) THEN
    RAISE NOTICE 'La columna measure_id no existe en article_variants. Créala primero.';
  ELSE
    RAISE NOTICE 'La FK FK_article_variants_measure ya existe.';
  END IF;
END $$;
