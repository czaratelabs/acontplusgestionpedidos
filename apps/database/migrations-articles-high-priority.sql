-- =============================================================================
-- Script: Mejoras prioridad alta para módulo Articles
-- Basado en análisis BD.sql - ejecutar sobre BD existente
-- =============================================================================

BEGIN;

-- ─── 1. ELIMINAR FKs DUPLICADAS ─────────────────────────────────────────────
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_brand_id_fkey;
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_category_id_fkey;
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_company_id_fkey;
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_tax_id_fkey;
ALTER TABLE article_images DROP CONSTRAINT IF EXISTS article_images_article_id_fkey;
ALTER TABLE article_variants DROP CONSTRAINT IF EXISTS article_variants_article_id_fkey;
ALTER TABLE article_variants DROP CONSTRAINT IF EXISTS article_variants_company_id_fkey;
ALTER TABLE article_batches DROP CONSTRAINT IF EXISTS article_batches_article_variant_id_fkey;
ALTER TABLE article_batches DROP CONSTRAINT IF EXISTS article_batches_company_id_fkey;
ALTER TABLE article_variant_prices DROP CONSTRAINT IF EXISTS article_variant_prices_article_variant_id_fkey;

-- ─── 2. ÍNDICE article_images(article_id) ───────────────────────────────────
CREATE INDEX IF NOT EXISTS IDX_article_images_article_id ON article_images(article_id);

-- ─── 3. ÍNDICES article_batches ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS IDX_article_batches_company_id ON article_batches(company_id);
CREATE INDEX IF NOT EXISTS IDX_article_batches_expiration ON article_batches(expiration_date)
  WHERE expiration_date IS NOT NULL;

-- ─── 4. ÍNDICE article_variant_prices(article_variant_id) ────────────────────
CREATE INDEX IF NOT EXISTS IDX_article_variant_prices_variant ON article_variant_prices(article_variant_id);

-- ─── 5. articles.name NOT NULL ──────────────────────────────────────────────
UPDATE articles SET name = '(Sin nombre)' WHERE name IS NULL;
ALTER TABLE articles ALTER COLUMN name SET NOT NULL;

-- ─── 6. article_variant_prices.price NOT NULL ────────────────────────────────
UPDATE article_variant_prices SET price = 0 WHERE price IS NULL;
ALTER TABLE article_variant_prices ALTER COLUMN price SET NOT NULL;


COMMIT;
