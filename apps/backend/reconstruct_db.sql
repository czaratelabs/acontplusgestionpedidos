-- =============================================================================
-- reconstruct_db.sql - Schema PostgreSQL consolidado para Supabase
-- Generado a partir de entidades TypeORM y migraciones del backend.
-- Ejecutar en Supabase SQL Editor o psql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONES Y TIPOS ENUM
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
    CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE');
  END IF;
END$$;


-- -----------------------------------------------------------------------------
-- 2. TABLAS INDEPENDIENTES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "price" decimal(12,2) NOT NULL,
  "implementation_fee" decimal(12,2) NOT NULL DEFAULT 0,
  "limits" jsonb NOT NULL DEFAULT '{}',
  "modules" jsonb NOT NULL DEFAULT '{}',
  "is_active" boolean NOT NULL DEFAULT true,
  CONSTRAINT "PK_subscription_plans" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "full_name" character varying NOT NULL,
  "email" character varying NOT NULL,
  "password_hash" character varying NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "is_super_admin" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_users" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_users_email" UNIQUE ("email")
);


-- -----------------------------------------------------------------------------
-- 3. TABLAS DEPENDIENTES DE COMPANY
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "companies" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "ruc_nit" character varying NOT NULL,
  "address" character varying,
  "phone" character varying,
  "email" character varying,
  "logo_url" character varying,
  "is_active" boolean NOT NULL DEFAULT true,
  "plan_id" uuid,
  "subscription_start_date" date,
  "subscription_end_date" date,
  "subscription_period" character varying(20),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_companies" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_companies_ruc_nit" UNIQUE ("ruc_nit"),
  CONSTRAINT "FK_companies_plan" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "description" character varying,
  "is_active" boolean NOT NULL DEFAULT true,
  "company_id" uuid,
  "permissions" jsonb NOT NULL DEFAULT '{}',
  CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
  CONSTRAINT "FK_roles_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_roles_name_system"
  ON "roles" ("name") WHERE "company_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_roles_name_company"
  ON "roles" ("name", "company_id") WHERE "company_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "user_companies" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  CONSTRAINT "PK_user_companies" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_user_companies_user_company" UNIQUE ("user_id", "company_id"),
  CONSTRAINT "FK_user_companies_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_user_companies_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_user_companies_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IDX_user_companies_user_id" ON "user_companies" ("user_id");
CREATE INDEX IF NOT EXISTS "IDX_user_companies_company_id" ON "user_companies" ("company_id");

CREATE TABLE IF NOT EXISTS "establishments" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "address" character varying NOT NULL,
  "phone" character varying,
  "email" character varying,
  "series" character varying(3) NOT NULL DEFAULT '001',
  "is_active" boolean NOT NULL DEFAULT true,
  "logo_url" character varying,
  "company_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_establishments" PRIMARY KEY ("id"),
  CONSTRAINT "FK_establishments_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_establishments_company_id" ON "establishments" ("company_id");

CREATE TABLE IF NOT EXISTS "emission_points" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "code" character varying(3) NOT NULL,
  "name" character varying NOT NULL,
  "invoice_sequence" integer NOT NULL DEFAULT 1,
  "proforma_sequence" integer NOT NULL DEFAULT 1,
  "order_sequence" integer NOT NULL DEFAULT 1,
  "delivery_note_sequence" integer NOT NULL DEFAULT 1,
  "dispatch_sequence" integer NOT NULL DEFAULT 1,
  "is_active" boolean NOT NULL DEFAULT true,
  "establishment_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_emission_points" PRIMARY KEY ("id"),
  CONSTRAINT "FK_emission_points_establishment" FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "warehouses" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "establishment_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_warehouses" PRIMARY KEY ("id"),
  CONSTRAINT "FK_warehouses_establishment" FOREIGN KEY ("establishment_id") REFERENCES "establishments"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "taxes" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "percentage" decimal(5,2) NOT NULL,
  "code" character varying,
  "is_active" boolean NOT NULL DEFAULT true,
  "company_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_taxes" PRIMARY KEY ("id"),
  CONSTRAINT "FK_taxes_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_taxes_company_id" ON "taxes" ("company_id");

CREATE TABLE IF NOT EXISTS "contacts" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "trade_name" character varying,
  "sri_document_type_code" character varying(1) NOT NULL DEFAULT 'R',
  "sri_person_type" character varying(2) DEFAULT '01',
  "tax_id" character varying NOT NULL,
  "email" character varying,
  "phone" character varying,
  "address" character varying,
  "is_client" boolean NOT NULL DEFAULT false,
  "is_supplier" boolean NOT NULL DEFAULT false,
  "is_employee" boolean NOT NULL DEFAULT false,
  "job_title" character varying,
  "salary" decimal(14,2),
  "is_active" boolean NOT NULL DEFAULT true,
  "company_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_contacts" PRIMARY KEY ("id"),
  CONSTRAINT "FK_contacts_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_contacts_company_id" ON "contacts" ("company_id");

CREATE TABLE IF NOT EXISTS "system_settings" (
  "company_id" uuid NOT NULL,
  "key" character varying NOT NULL,
  "value" text NOT NULL,
  "description" character varying,
  CONSTRAINT "PK_system_settings" PRIMARY KEY ("company_id", "key"),
  CONSTRAINT "FK_system_settings_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "business_rules" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "company_id" uuid NOT NULL,
  "rule_key" character varying NOT NULL,
  "is_enabled" boolean NOT NULL DEFAULT false,
  "metadata" jsonb,
  CONSTRAINT "PK_business_rules" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_business_rules_company_rule" UNIQUE ("company_id", "rule_key"),
  CONSTRAINT "FK_business_rules_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_business_rules_company_id" ON "business_rules" ("company_id");


-- -----------------------------------------------------------------------------
-- 4. CATÁLOGOS POR COMPANY (measures, colors, sizes, flavors, brands, categories)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "measures" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "company_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_measures" PRIMARY KEY ("id"),
  CONSTRAINT "FK_measures_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_measures_company_id" ON "measures" ("company_id");

CREATE TABLE IF NOT EXISTS "colors" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "company_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_colors" PRIMARY KEY ("id"),
  CONSTRAINT "FK_colors_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "UQ_colors_company_name" UNIQUE ("company_id", "name")
);

CREATE INDEX IF NOT EXISTS "IDX_colors_company_id" ON "colors" ("company_id");

CREATE TABLE IF NOT EXISTS "sizes" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "company_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_sizes" PRIMARY KEY ("id"),
  CONSTRAINT "FK_sizes_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "UQ_sizes_company_name" UNIQUE ("company_id", "name")
);

CREATE INDEX IF NOT EXISTS "IDX_sizes_company_id" ON "sizes" ("company_id");

CREATE TABLE IF NOT EXISTS "flavors" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "company_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_flavors" PRIMARY KEY ("id"),
  CONSTRAINT "FK_flavors_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "UQ_flavors_company_name" UNIQUE ("company_id", "name")
);

CREATE INDEX IF NOT EXISTS "IDX_flavors_company_id" ON "flavors" ("company_id");

CREATE TABLE IF NOT EXISTS "brands" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "company_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_brands" PRIMARY KEY ("id"),
  CONSTRAINT "FK_brands_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_brands_company_id" ON "brands" ("company_id");

CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "company_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_categories" PRIMARY KEY ("id"),
  CONSTRAINT "FK_categories_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_categories_company_id" ON "categories" ("company_id");


-- -----------------------------------------------------------------------------
-- 5. ARTICLES Y TABLAS DE DETALLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "articles" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "brand_id" uuid,
  "category_id" uuid,
  "tax_id" uuid,
  "company_id" uuid NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "observations" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_articles" PRIMARY KEY ("id"),
  CONSTRAINT "FK_articles_brand" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL,
  CONSTRAINT "FK_articles_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL,
  CONSTRAINT "FK_articles_tax" FOREIGN KEY ("tax_id") REFERENCES "taxes"("id") ON DELETE SET NULL,
  CONSTRAINT "FK_articles_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);

ALTER TABLE "articles" DROP COLUMN IF EXISTS "search_vector";
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('spanish', coalesce("name", '') || ' ' || coalesce("observations", ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS "IDX_articles_search_vector" ON "articles" USING gin ("search_vector");
CREATE INDEX IF NOT EXISTS "IDX_articles_company_active"
  ON "articles" ("company_id", "is_active") WHERE "is_active" = true;

CREATE TABLE IF NOT EXISTS "article_variants" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "article_id" uuid NOT NULL,
  "sku" character varying NOT NULL,
  "barcode" character varying,
  "cost" decimal(18,4) NOT NULL DEFAULT 0,
  "color_id" uuid,
  "size_id" uuid,
  "flavor_id" uuid,
  "measure" character varying,
  "measure_id" uuid,
  "stock_actual" decimal(18,4) NOT NULL DEFAULT 0,
  "stock_min" decimal(18,4) NOT NULL DEFAULT 0,
  "company_id" uuid NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "observations" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_article_variants" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_article_variants_company_sku" UNIQUE ("company_id", "sku"),
  CONSTRAINT "FK_article_variants_article" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_article_variants_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_article_variants_color" FOREIGN KEY ("color_id") REFERENCES "colors"("id") ON DELETE SET NULL,
  CONSTRAINT "FK_article_variants_size" FOREIGN KEY ("size_id") REFERENCES "sizes"("id") ON DELETE SET NULL,
  CONSTRAINT "FK_article_variants_flavor" FOREIGN KEY ("flavor_id") REFERENCES "flavors"("id") ON DELETE SET NULL,
  CONSTRAINT "FK_article_variants_measure" FOREIGN KEY ("measure_id") REFERENCES "measures"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IDX_article_variants_barcode" ON "article_variants" ("barcode");
CREATE INDEX IF NOT EXISTS "IDX_article_variants_sku" ON "article_variants" ("sku");
CREATE INDEX IF NOT EXISTS "IDX_article_variants_company_id" ON "article_variants" ("company_id");
CREATE INDEX IF NOT EXISTS "IDX_article_variants_article_company" ON "article_variants" ("article_id", "company_id");
CREATE INDEX IF NOT EXISTS "IDX_article_variants_company_active"
  ON "article_variants" ("company_id", "is_active") WHERE "is_active" = true;

CREATE TABLE IF NOT EXISTS "article_variant_prices" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "article_variant_id" uuid NOT NULL,
  "price_type" character varying NOT NULL,
  "price" decimal(18,4) NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "unit_id" uuid,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_article_variant_prices" PRIMARY KEY ("id"),
  CONSTRAINT "FK_article_variant_prices_variant" FOREIGN KEY ("article_variant_id") REFERENCES "article_variants"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_article_variant_prices_unit" FOREIGN KEY ("unit_id") REFERENCES "measures"("id") ON DELETE SET NULL,
  CONSTRAINT "CHK_article_variant_prices_price_type_not_empty" CHECK (price_type IS NOT NULL AND char_length(trim(price_type)) > 0),
  CONSTRAINT "UQ_article_variant_prices_variant_type" UNIQUE ("article_variant_id", "price_type")
);

CREATE INDEX IF NOT EXISTS "IDX_article_variant_prices_variant_default"
  ON "article_variant_prices" ("article_variant_id", "is_default") WHERE "is_default" = true;
CREATE INDEX IF NOT EXISTS "IDX_article_variant_prices_variant" ON "article_variant_prices" ("article_variant_id");

CREATE TABLE IF NOT EXISTS "article_images" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "article_id" uuid NOT NULL,
  "url" text NOT NULL,
  "is_main" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_article_images" PRIMARY KEY ("id"),
  CONSTRAINT "FK_article_images_article" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_article_images_article_id" ON "article_images" ("article_id");

CREATE TABLE IF NOT EXISTS "article_batches" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "article_variant_id" uuid NOT NULL,
  "batch_number" character varying(100) NOT NULL,
  "expiration_date" date,
  "current_stock" decimal(18,4) NOT NULL DEFAULT 0,
  "company_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_article_batches" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_article_batches_variant_number" UNIQUE ("article_variant_id", "batch_number"),
  CONSTRAINT "FK_article_batches_variant" FOREIGN KEY ("article_variant_id") REFERENCES "article_variants"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_article_batches_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_article_batches_company_id" ON "article_batches" ("company_id");
CREATE INDEX IF NOT EXISTS "IDX_article_batches_expiration"
  ON "article_batches" ("expiration_date") WHERE "expiration_date" IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 6. AUDIT_LOGS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "entity_name" character varying NOT NULL,
  "entity_id" character varying NOT NULL,
  "company_id" character varying,
  "action" audit_action NOT NULL,
  "performed_by" uuid,
  "old_values" jsonb,
  "new_values" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
  CONSTRAINT "FK_audit_logs_performed_by" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IDX_audit_logs_entity" ON "audit_logs" ("entity_name", "entity_id");
CREATE INDEX IF NOT EXISTS "IDX_audit_logs_created_at" ON "audit_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "IDX_audit_logs_company_id" ON "audit_logs" ("company_id");


-- -----------------------------------------------------------------------------
-- 7. DATOS POR DEFECTO
-- -----------------------------------------------------------------------------

-- Roles del sistema (owner, admin, seller) con company_id NULL (idempotente)
DO $$
BEGIN
  INSERT INTO "roles" ("id", "name", "description", "company_id", "is_active", "permissions")
  SELECT uuid_generate_v4(), 'owner', 'Propietario de la empresa', NULL, true, '{}'
  WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'owner' AND "company_id" IS NULL);
  INSERT INTO "roles" ("id", "name", "description", "company_id", "is_active", "permissions")
  SELECT uuid_generate_v4(), 'admin', 'Administrador', NULL, true, '{}'
  WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'admin' AND "company_id" IS NULL);
  INSERT INTO "roles" ("id", "name", "description", "company_id", "is_active", "permissions")
  SELECT uuid_generate_v4(), 'seller', 'Vendedor', NULL, true, '{}'
  WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'seller' AND "company_id" IS NULL);
END$$;

-- Planes de suscripción por defecto (idempotente por nombre)
DO $$
BEGIN
  INSERT INTO "subscription_plans" ("id", "name", "price", "implementation_fee", "limits", "modules", "is_active")
  SELECT uuid_generate_v4(), 'Plan Pyme', 45.00, 0,
    '{"max_sellers": 3, "max_establishments": 2, "max_warehouses": 1, "max_inventory_items": 500, "storage_gb": 1, "max_total_users": 3}'::jsonb,
    '{"audit": true, "logistics": false, "business_rules": true, "sri": true, "directory_clients": true, "directory_providers": true, "directory_employees": true, "admin_users_roles": true, "admin_establishments": true, "admin_company_config": true, "admin_general_config": true, "admin_taxes": true, "admin_audit": true, "admin_roles": true, "admin_business_rules": true}'::jsonb,
    true
  WHERE NOT EXISTS (SELECT 1 FROM "subscription_plans" WHERE "name" = 'Plan Pyme');
  INSERT INTO "subscription_plans" ("id", "name", "price", "implementation_fee", "limits", "modules", "is_active")
  SELECT uuid_generate_v4(), 'Plan Crecimiento', 95.00, 0,
    '{"max_sellers": 10, "max_establishments": 2, "max_warehouses": 3, "max_inventory_items": 5000, "storage_gb": 10, "max_total_users": 10}'::jsonb,
    '{"audit": true, "logistics": true, "business_rules": true, "sri": true, "directory_clients": true, "directory_providers": true, "directory_employees": true, "admin_users_roles": true, "admin_establishments": true, "admin_company_config": true, "admin_general_config": true, "admin_taxes": true, "admin_audit": true, "admin_roles": true, "admin_business_rules": true}'::jsonb,
    true
  WHERE NOT EXISTS (SELECT 1 FROM "subscription_plans" WHERE "name" = 'Plan Crecimiento');
  INSERT INTO "subscription_plans" ("id", "name", "price", "implementation_fee", "limits", "modules", "is_active")
  SELECT uuid_generate_v4(), 'Plan Corporativo', 190.00, 0,
    '{"max_sellers": -1, "max_establishments": -1, "max_warehouses": -1, "max_inventory_items": -1, "storage_gb": 50, "max_total_users": -1}'::jsonb,
    '{"audit": true, "logistics": true, "business_rules": true, "sri": true, "directory_clients": true, "directory_providers": true, "directory_employees": true, "admin_users_roles": true, "admin_establishments": true, "admin_company_config": true, "admin_general_config": true, "admin_taxes": true, "admin_audit": true, "admin_roles": true, "admin_business_rules": true}'::jsonb,
    true
  WHERE NOT EXISTS (SELECT 1 FROM "subscription_plans" WHERE "name" = 'Plan Corporativo');
END$$;
