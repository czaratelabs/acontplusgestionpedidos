-- Tabla de códigos de barras adicionales por variante.
-- El código principal sigue en article_variants.barcode (Master Barcode).
-- Requiere: extensión uuid-ossp (uuid_generate_v4()) si no existe.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.article_variant_barcodes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_variant_id  UUID NOT NULL,
  barcode             VARCHAR(100) NOT NULL,
  description         VARCHAR(255) NULL,

  CONSTRAINT UQ_article_variant_barcodes_barcode UNIQUE (barcode),
  CONSTRAINT FK_article_variant_barcodes_variant FOREIGN KEY (article_variant_id)
    REFERENCES public.article_variants(id) ON DELETE CASCADE
);

CREATE INDEX IDX_article_variant_barcodes_variant
  ON public.article_variant_barcodes(article_variant_id);

COMMENT ON TABLE public.article_variant_barcodes IS 'Códigos de barras adicionales por variante (ej. otro envase o sabor).';
COMMENT ON COLUMN public.article_variant_barcodes.barcode IS 'Código único en la empresa.';
COMMENT ON COLUMN public.article_variant_barcodes.description IS 'Descripción opcional (ej. Sabor fresa).';
