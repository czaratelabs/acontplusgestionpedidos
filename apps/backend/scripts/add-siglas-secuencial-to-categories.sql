-- =============================================================================
-- ADD siglas y secuencial a categories
-- =============================================================================
-- Ejecutar en Supabase SQL Editor, psql o tu cliente PostgreSQL.
-- Si las columnas ya existen, salta los pasos 1-2 o comenta las líneas ALTER.
-- =============================================================================

-- 1. Añadir columnas (omitir si ya existen)
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "siglas" varchar(20) DEFAULT '' NOT NULL;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "secuencial" integer DEFAULT 1 NOT NULL;

-- 2. Función temporal para generar siglas
-- 1 palabra → 3 letras (ej: Herramientas → HER)
-- 2+ palabras → 2 letras primera + 1 por resto (ej: Pintura en Aerosol → PIEA)
CREATE OR REPLACE FUNCTION _fn_compute_siglas(_name text) RETURNS text AS $$
DECLARE
  _words text[];
  _result text := '';
  _i int;
BEGIN
  _name := TRIM(COALESCE(_name, ''));
  IF _name = '' THEN RETURN ''; END IF;
  _words := regexp_split_to_array(_name, '\s+');
  IF array_length(_words, 1) = 1 THEN
    RETURN UPPER(LEFT(_words[1], 3));
  END IF;
  _result := UPPER(LEFT(_words[1], 2));
  FOR _i IN 2..array_length(_words, 1) LOOP
    _result := _result || UPPER(LEFT(_words[_i], 1));
  END LOOP;
  RETURN _result;
END;
$$ LANGUAGE plpgsql;

-- 3. Actualizar siglas para categorías existentes
UPDATE "categories"
SET "siglas" = _fn_compute_siglas("name"),
    "secuencial" = COALESCE("secuencial", 1);

-- 4. Eliminar función temporal
DROP FUNCTION IF EXISTS _fn_compute_siglas(text);
