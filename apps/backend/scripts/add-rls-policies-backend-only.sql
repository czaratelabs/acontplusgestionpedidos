-- =============================================================================
-- Añadir políticas RLS para resolver "RLS Enabled No Policy" (linter Supabase)
-- Una política por tabla que permite todo solo al rol postgres (conexión backend).
-- anon/authenticated siguen sin ver filas; el backend (postgres) no se ve afectado.
-- Ejecutar en Supabase: SQL Editor > New query > Pegar y Run.
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
-- =============================================================================

-- Política por tabla: acceso completo solo para el rol postgres (backend)
CREATE POLICY "allow_backend_full" ON public.article_batches         FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.article_images         FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.article_variant_barcodes FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.article_variant_prices FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.article_variants       FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.articles              FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.audit_logs            FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.brands                FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.business_rules        FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.categories            FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.colors                FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.companies             FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.contacts              FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.emission_points       FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.establishments        FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.flavors               FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.measures              FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.roles                 FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.sizes                 FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.subscription_plans    FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.system_settings       FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.taxes                  FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.user_companies        FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.users                 FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "allow_backend_full" ON public.warehouses             FOR ALL TO postgres USING (true) WITH CHECK (true);

-- =============================================================================
-- ROLLBACK: eliminar políticas (solo si necesitas deshacer)
-- =============================================================================
/*
DROP POLICY IF EXISTS "allow_backend_full" ON public.article_batches;
DROP POLICY IF EXISTS "allow_backend_full" ON public.article_images;
DROP POLICY IF EXISTS "allow_backend_full" ON public.article_variant_barcodes;
DROP POLICY IF EXISTS "allow_backend_full" ON public.article_variant_prices;
DROP POLICY IF EXISTS "allow_backend_full" ON public.article_variants;
DROP POLICY IF EXISTS "allow_backend_full" ON public.articles;
DROP POLICY IF EXISTS "allow_backend_full" ON public.audit_logs;
DROP POLICY IF EXISTS "allow_backend_full" ON public.brands;
DROP POLICY IF EXISTS "allow_backend_full" ON public.business_rules;
DROP POLICY IF EXISTS "allow_backend_full" ON public.categories;
DROP POLICY IF EXISTS "allow_backend_full" ON public.colors;
DROP POLICY IF EXISTS "allow_backend_full" ON public.companies;
DROP POLICY IF EXISTS "allow_backend_full" ON public.contacts;
DROP POLICY IF EXISTS "allow_backend_full" ON public.emission_points;
DROP POLICY IF EXISTS "allow_backend_full" ON public.establishments;
DROP POLICY IF EXISTS "allow_backend_full" ON public.flavors;
DROP POLICY IF EXISTS "allow_backend_full" ON public.measures;
DROP POLICY IF EXISTS "allow_backend_full" ON public.roles;
DROP POLICY IF EXISTS "allow_backend_full" ON public.sizes;
DROP POLICY IF EXISTS "allow_backend_full" ON public.subscription_plans;
DROP POLICY IF EXISTS "allow_backend_full" ON public.system_settings;
DROP POLICY IF EXISTS "allow_backend_full" ON public.taxes;
DROP POLICY IF EXISTS "allow_backend_full" ON public.user_companies;
DROP POLICY IF EXISTS "allow_backend_full" ON public.users;
DROP POLICY IF EXISTS "allow_backend_full" ON public.warehouses;
*/
