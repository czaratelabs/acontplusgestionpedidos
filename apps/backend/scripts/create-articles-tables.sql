-- =============================================================================
-- Script SQL: Crear tablas del módulo Artículos y Variantes
-- Requiere: tablas 'companies' y 'taxes' existentes
-- =============================================================================

-- Extensión para UUID (si no existe)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. TABLA: brands
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brands (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT now(),
    updated_at  TIMESTAMP DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. TABLA: categories
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT now(),
    updated_at  TIMESTAMP DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 3. TABLA: articles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         VARCHAR(255),
    brand_id     UUID REFERENCES brands(id) ON DELETE SET NULL,
    category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
    tax_id       UUID REFERENCES taxes(id) ON DELETE SET NULL,
    company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    is_active    BOOLEAN DEFAULT true,
    observations TEXT,
    created_at   TIMESTAMP DEFAULT now(),
    updated_at   TIMESTAMP DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. TABLA: article_variants
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS article_variants (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id   UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    sku          VARCHAR(255),
    barcode      VARCHAR(255),
    cost         DECIMAL(18, 4) DEFAULT 0,
    color        VARCHAR(255),
    size         VARCHAR(255),
    flavor       VARCHAR(255),
    measure      VARCHAR(255),
    stock_actual DECIMAL(18, 4) DEFAULT 0,
    stock_min    DECIMAL(18, 4) DEFAULT 0,
    company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    is_active    BOOLEAN DEFAULT true,
    observations TEXT,
    created_at   TIMESTAMP DEFAULT now(),
    updated_at   TIMESTAMP DEFAULT now()
);

-- Índices y restricciones únicas para article_variants
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_article_variants_company_sku"
    ON article_variants (company_id, sku);
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_article_variants_company_barcode"
    ON article_variants (company_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS "IDX_article_variants_barcode" ON article_variants (barcode);
CREATE INDEX IF NOT EXISTS "IDX_article_variants_sku" ON article_variants (sku);
CREATE INDEX IF NOT EXISTS "IDX_article_variants_company_id" ON article_variants (company_id);

-- -----------------------------------------------------------------------------
-- 5. TABLA: article_variant_prices
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS article_variant_prices (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_variant_id  UUID NOT NULL REFERENCES article_variants(id) ON DELETE CASCADE,
    price_type          VARCHAR(255),
    price               DECIMAL(18, 4),
    is_default          BOOLEAN DEFAULT false,
    unit_id             UUID,
    created_at          TIMESTAMP DEFAULT now(),
    updated_at          TIMESTAMP DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 6. TABLA: article_images
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS article_images (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    is_main     BOOLEAN DEFAULT false,
    created_at  TIMESTAMP DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 7. TABLA: article_batches
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS article_batches (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_variant_id  UUID NOT NULL REFERENCES article_variants(id) ON DELETE CASCADE,
    batch_number        VARCHAR(100) NOT NULL,
    expiration_date     DATE,
    current_stock       DECIMAL(18, 4) DEFAULT 0,
    company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at          TIMESTAMP DEFAULT now(),
    updated_at          TIMESTAMP DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 8. TABLAS: Catálogos (medidas, colores, tallas, sabores)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS measures (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT now(),
    updated_at  TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS colors (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT now(),
    updated_at  TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sizes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT now(),
    updated_at  TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flavors (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT now(),
    updated_at  TIMESTAMP DEFAULT now()
);

-- =============================================================================
-- MEJORAS DE ESCALABILIDAD E INTEGRIDAD (post catálogos)
-- =============================================================================

-- Columna measure_id en article_variants (FK a measures)
ALTER TABLE article_variants ADD COLUMN IF NOT EXISTS measure_id UUID REFERENCES measures(id) ON DELETE SET NULL;

-- FK unit_id en article_variant_prices (requiere measures existente)
DO $$ BEGIN
    ALTER TABLE article_variant_prices ADD CONSTRAINT FK_article_variant_prices_unit
        FOREIGN KEY (unit_id) REFERENCES measures(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; -- Ya existe
END $$;

-- CHECK price_type no vacío
ALTER TABLE article_variant_prices DROP CONSTRAINT IF EXISTS CHK_article_variant_prices_price_type_not_empty;
ALTER TABLE article_variant_prices ADD CONSTRAINT CHK_article_variant_prices_price_type_not_empty
    CHECK (price_type IS NOT NULL AND char_length(trim(price_type)) > 0);

-- Índices compuestos para reportes y queries <200ms
CREATE INDEX IF NOT EXISTS IDX_articles_company_active
    ON articles (company_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS IDX_article_variants_article_company
    ON article_variants (article_id, company_id);
CREATE INDEX IF NOT EXISTS IDX_article_variants_company_active
    ON article_variants (company_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS IDX_article_variant_prices_variant_default
    ON article_variant_prices (article_variant_id, is_default) WHERE is_default = true;
