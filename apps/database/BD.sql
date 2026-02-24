-- public.migrations definition

-- Drop table

-- DROP TABLE public.migrations;

CREATE TABLE public.migrations (
	id serial4 NOT NULL,
	"timestamp" int8 NOT NULL,
	"name" varchar NOT NULL,
	CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id)
);

-- Permissions

ALTER TABLE public.migrations OWNER TO "admin";
GRANT ALL ON TABLE public.migrations TO "admin";


-- public.subscription_plans definition

-- Drop table

-- DROP TABLE public.subscription_plans;

CREATE TABLE public.subscription_plans (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	price numeric(10, 2) NOT NULL,
	implementation_fee numeric(10, 2) NOT NULL,
	limits jsonb DEFAULT '{}'::jsonb NOT NULL,
	modules jsonb DEFAULT '{}'::jsonb NOT NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT subscription_plans_pkey PRIMARY KEY (id)
);

-- Permissions

ALTER TABLE public.subscription_plans OWNER TO "admin";
GRANT ALL ON TABLE public.subscription_plans TO "admin";


-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	full_name varchar NOT NULL,
	email varchar NOT NULL,
	password_hash varchar NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	is_super_admin bool DEFAULT false NULL,
	CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id),
	CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email)
);

-- Permissions

ALTER TABLE public.users OWNER TO "admin";
GRANT ALL ON TABLE public.users TO "admin";


-- public.audit_logs definition

-- Drop table

-- DROP TABLE public.audit_logs;

CREATE TABLE public.audit_logs (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	entity_name varchar NOT NULL,
	entity_id varchar NOT NULL,
	company_id varchar NULL,
	"action" varchar NOT NULL,
	old_values jsonb NULL,
	new_values jsonb NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	performed_by uuid NULL,
	CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id),
	CONSTRAINT "FK_audit_logs_performed_by" FOREIGN KEY (performed_by) REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX "IDX_2cd10fda8276bb995288acfbfb" ON public.audit_logs USING btree (created_at);
CREATE INDEX "IDX_4057c4849108f6d6ccb77a4e91" ON public.audit_logs USING btree (entity_name);
CREATE INDEX "IDX_50d854b973295d7c51bcf346ef" ON public.audit_logs USING btree (company_id);
CREATE INDEX "IDX_85c204d8e47769ac183b32bf9c" ON public.audit_logs USING btree (entity_id);
CREATE INDEX "IDX_9ac4b82f0b0f68801024154d19" ON public.audit_logs USING btree (entity_name, entity_id);

-- Permissions

ALTER TABLE public.audit_logs OWNER TO "admin";
GRANT ALL ON TABLE public.audit_logs TO "admin";


-- public.companies definition

-- Drop table

-- DROP TABLE public.companies;

CREATE TABLE public.companies (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar NOT NULL,
	ruc_nit varchar NOT NULL,
	logo_url varchar NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	address varchar NULL,
	phone varchar NULL,
	email varchar NULL,
	plan_id uuid NULL,
	subscription_start_date date NULL,
	subscription_end_date date NULL,
	subscription_period varchar(20) NULL,
	CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY (id),
	CONSTRAINT "UQ_7a378de076f0035db75fc6090de" UNIQUE (ruc_nit),
	CONSTRAINT companies_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id)
);

-- Permissions

ALTER TABLE public.companies OWNER TO "admin";
GRANT ALL ON TABLE public.companies TO "admin";


-- public.contacts definition

-- Drop table

-- DROP TABLE public.contacts;

CREATE TABLE public.contacts (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar NOT NULL,
	"tradeName" varchar NULL,
	"taxId" varchar NOT NULL,
	email varchar NULL,
	phone varchar NULL,
	address varchar NULL,
	"isClient" bool DEFAULT false NOT NULL,
	"isSupplier" bool DEFAULT false NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	company_id uuid NULL,
	"sriDocumentTypeCode" varchar(1) DEFAULT 'R'::character varying NOT NULL,
	"sriPersonType" varchar(2) DEFAULT '01'::character varying NULL,
	"isEmployee" bool DEFAULT false NOT NULL,
	"jobTitle" varchar NULL,
	salary numeric(14, 2) NULL,
	is_active bool DEFAULT true NULL,
	CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY (id),
	CONSTRAINT "FK_f4809f4f9ad4a220959788def42" FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

-- Permissions

ALTER TABLE public.contacts OWNER TO "admin";
GRANT ALL ON TABLE public.contacts TO "admin";


-- public.establishments definition

-- Drop table

-- DROP TABLE public.establishments;

CREATE TABLE public.establishments (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar NOT NULL,
	address varchar NOT NULL,
	phone varchar NULL,
	email varchar NULL,
	series varchar(3) DEFAULT '001'::character varying NOT NULL,
	logo_url varchar NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	"companyId" uuid NULL,
	is_active bool DEFAULT true NULL,
	CONSTRAINT "PK_7fb6da6c365114ccb61b091bbdf" PRIMARY KEY (id),
	CONSTRAINT "FK_6951d1a6d6dfd80297e395a8dae" FOREIGN KEY ("companyId") REFERENCES public.companies(id)
);

-- Permissions

ALTER TABLE public.establishments OWNER TO "admin";
GRANT ALL ON TABLE public.establishments TO "admin";


-- public.flavors definition

-- Drop table

-- DROP TABLE public.flavors;

CREATE TABLE public.flavors (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	company_id uuid NOT NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT "UQ_flavors_company_name" UNIQUE (company_id, name),
	CONSTRAINT flavors_pkey PRIMARY KEY (id),
	CONSTRAINT "FK_4f811941f9c25346bc857d65642" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);
CREATE INDEX "IDX_flavors_company_id" ON public.flavors USING btree (company_id);

-- Permissions

ALTER TABLE public.flavors OWNER TO "admin";
GRANT ALL ON TABLE public.flavors TO "admin";


-- public.measures definition

-- Drop table

-- DROP TABLE public.measures;

CREATE TABLE public.measures (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar NOT NULL,
	company_id uuid NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "PK_ec34a47385441849095def20546" PRIMARY KEY (id),
	CONSTRAINT "FK_10e59b90eb894294b367bddd689" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Permissions

ALTER TABLE public.measures OWNER TO "admin";
GRANT ALL ON TABLE public.measures TO "admin";


-- public.roles definition

-- Drop table

-- DROP TABLE public.roles;

CREATE TABLE public.roles (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar NOT NULL,
	description varchar NULL,
	is_active bool DEFAULT true NOT NULL,
	company_id uuid NULL,
	permissions jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY (id),
	CONSTRAINT "FK_4bc1204a05dde26383e3955b0a1" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX "IDX_roles_name_company" ON public.roles USING btree (name, company_id) WHERE (company_id IS NOT NULL);
CREATE UNIQUE INDEX "IDX_roles_name_system" ON public.roles USING btree (name) WHERE (company_id IS NULL);

-- Permissions

ALTER TABLE public.roles OWNER TO "admin";
GRANT ALL ON TABLE public.roles TO "admin";


-- public.sizes definition

-- Drop table

-- DROP TABLE public.sizes;

CREATE TABLE public.sizes (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	company_id uuid NOT NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT "UQ_sizes_company_name" UNIQUE (company_id, name),
	CONSTRAINT sizes_pkey PRIMARY KEY (id),
	CONSTRAINT "FK_2b748849e50755c99d76359c488" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);
CREATE INDEX "IDX_sizes_company_id" ON public.sizes USING btree (company_id);

-- Permissions

ALTER TABLE public.sizes OWNER TO "admin";
GRANT ALL ON TABLE public.sizes TO "admin";


-- public.system_settings definition

-- Drop table

-- DROP TABLE public.system_settings;

CREATE TABLE public.system_settings (
	"key" varchar NOT NULL,
	value text NOT NULL,
	description varchar NULL,
	company_id uuid NOT NULL,
	CONSTRAINT "PK_14cca0c73de16965d83e27f7475" PRIMARY KEY (company_id, key),
	CONSTRAINT "UQ_14cca0c73de16965d83e27f7475" UNIQUE (company_id, key),
	CONSTRAINT "FK_566c04225283d94fdd9e338c45c" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Permissions

ALTER TABLE public.system_settings OWNER TO "admin";
GRANT ALL ON TABLE public.system_settings TO "admin";


-- public.taxes definition

-- Drop table

-- DROP TABLE public.taxes;

CREATE TABLE public.taxes (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar NOT NULL,
	percentage numeric(5, 2) NOT NULL,
	code varchar NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	company_id uuid NULL,
	CONSTRAINT "PK_6c58c9cbb420c4f65e3f5eb8162" PRIMARY KEY (id),
	CONSTRAINT "FK_taxes_company_id" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Permissions

ALTER TABLE public.taxes OWNER TO "admin";
GRANT ALL ON TABLE public.taxes TO "admin";


-- public.user_companies definition

-- Drop table

-- DROP TABLE public.user_companies;

CREATE TABLE public.user_companies (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NOT NULL,
	company_id uuid NOT NULL,
	role_id uuid NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT "PK_f41bd3ea569c8c877b9a9063abb" PRIMARY KEY (id),
	CONSTRAINT "UQ_ca73b87c901966a9fb8960916df" UNIQUE (user_id, company_id),
	CONSTRAINT "FK_50c7d6aeb4ab214ad9fff29ab68" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
	CONSTRAINT "FK_835012dffbb8de58d9209373ca4" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT,
	CONSTRAINT "FK_9e735e90e4fd3bbb4268ed96d94" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);
CREATE INDEX "IDX_user_companies_company_id" ON public.user_companies USING btree (company_id);
CREATE INDEX "IDX_user_companies_user_id" ON public.user_companies USING btree (user_id);

-- Permissions

ALTER TABLE public.user_companies OWNER TO "admin";
GRANT ALL ON TABLE public.user_companies TO "admin";


-- public.warehouses definition

-- Drop table

-- DROP TABLE public.warehouses;

CREATE TABLE public.warehouses (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar NOT NULL,
	description text NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	"establishmentId" uuid NULL,
	is_active bool DEFAULT true NULL,
	CONSTRAINT "PK_56ae21ee2432b2270b48867e4be" PRIMARY KEY (id),
	CONSTRAINT "FK_86bc755c55fdf9ab936698af910" FOREIGN KEY ("establishmentId") REFERENCES public.establishments(id)
);

-- Permissions

ALTER TABLE public.warehouses OWNER TO "admin";
GRANT ALL ON TABLE public.warehouses TO "admin";


-- public.brands definition

-- Drop table

-- DROP TABLE public.brands;

CREATE TABLE public.brands (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NULL,
	company_id uuid NOT NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT brands_pkey PRIMARY KEY (id),
	CONSTRAINT "FK_654d6ae4688cbf4580b6cfa3b5c" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
	CONSTRAINT brands_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Permissions

ALTER TABLE public.brands OWNER TO "admin";
GRANT ALL ON TABLE public.brands TO "admin";


-- public.business_rules definition

-- Drop table

-- DROP TABLE public.business_rules;

CREATE TABLE public.business_rules (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	company_id uuid NOT NULL,
	rule_key varchar NOT NULL,
	is_enabled bool DEFAULT false NOT NULL,
	metadata jsonb NULL,
	CONSTRAINT "PK_7aee3b4a19978365c8832034d1d" PRIMARY KEY (id),
	CONSTRAINT "UQ_a6647717a1be6a92abc913680f2" UNIQUE (company_id, rule_key),
	CONSTRAINT "FK_c6529e3bcba36dcd321e9a699e8" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);
CREATE INDEX "IDX_business_rules_company_id" ON public.business_rules USING btree (company_id);

-- Permissions

ALTER TABLE public.business_rules OWNER TO "admin";
GRANT ALL ON TABLE public.business_rules TO "admin";


-- public.categories definition

-- Drop table

-- DROP TABLE public.categories;

CREATE TABLE public.categories (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NULL,
	company_id uuid NOT NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT categories_pkey PRIMARY KEY (id),
	CONSTRAINT "FK_987f987126a3f2e4f9ec03db04e" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
	CONSTRAINT categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Permissions

ALTER TABLE public.categories OWNER TO "admin";
GRANT ALL ON TABLE public.categories TO "admin";


-- public.colors definition

-- Drop table

-- DROP TABLE public.colors;

CREATE TABLE public.colors (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	company_id uuid NOT NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT "UQ_colors_company_name" UNIQUE (company_id, name),
	CONSTRAINT colors_pkey PRIMARY KEY (id),
	CONSTRAINT "FK_a666380ddff614f1fcde01a2450" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);
CREATE INDEX "IDX_colors_company_id" ON public.colors USING btree (company_id);

-- Permissions

ALTER TABLE public.colors OWNER TO "admin";
GRANT ALL ON TABLE public.colors TO "admin";


-- public.emission_points definition

-- Drop table

-- DROP TABLE public.emission_points;

CREATE TABLE public.emission_points (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	code varchar(3) NOT NULL,
	"name" varchar NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	"establishmentId" uuid NULL,
	invoice_sequence int4 DEFAULT 1 NOT NULL,
	proforma_sequence int4 DEFAULT 1 NOT NULL,
	order_sequence int4 DEFAULT 1 NOT NULL,
	delivery_note_sequence int4 DEFAULT 1 NOT NULL,
	dispatch_sequence int4 DEFAULT 1 NOT NULL,
	is_active bool DEFAULT true NULL,
	CONSTRAINT "PK_8d3a8ffc81555219efe907996de" PRIMARY KEY (id),
	CONSTRAINT "FK_59830209a279d76ebc62bef76d3" FOREIGN KEY ("establishmentId") REFERENCES public.establishments(id)
);

-- Permissions

ALTER TABLE public.emission_points OWNER TO "admin";
GRANT ALL ON TABLE public.emission_points TO "admin";


-- public.articles definition

-- Drop table

-- DROP TABLE public.articles;

CREATE TABLE public.articles (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	brand_id uuid NULL,
	category_id uuid NULL,
	tax_id uuid NULL,
	company_id uuid NOT NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	observations text NULL,
	search_vector tsvector GENERATED ALWAYS AS (to_tsvector('spanish'::regconfig, (COALESCE(name, ''::character varying)::text || ' '::text) || COALESCE(observations, ''::text))) STORED NULL,
	CONSTRAINT articles_pkey PRIMARY KEY (id),
	CONSTRAINT "FK_78dfee91442f8e9d85421798d0b" FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL,
	CONSTRAINT "FK_7f4c53b30ccfa5f132fb99f2d38" FOREIGN KEY (tax_id) REFERENCES public.taxes(id) ON DELETE SET NULL,
	CONSTRAINT "FK_9603a03397c48b0c1f6a553e072" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
	CONSTRAINT "FK_e025eeefcdb2a269c42484ee43f" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL
);
CREATE INDEX "IDX_articles_company_active" ON public.articles USING btree (company_id, is_active) WHERE (is_active = true);
CREATE INDEX "IDX_articles_search_vector" ON public.articles USING gin (search_vector);

-- Permissions

ALTER TABLE public.articles OWNER TO "admin";
GRANT ALL ON TABLE public.articles TO "admin";


-- public.article_images definition

-- Drop table

-- DROP TABLE public.article_images;

CREATE TABLE public.article_images (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	article_id uuid NOT NULL,
	url text NOT NULL,
	is_main bool DEFAULT false NULL,
	created_at timestamp DEFAULT now() NULL,
	CONSTRAINT article_images_pkey PRIMARY KEY (id),
	CONSTRAINT "FK_5f74bd349fdb3d4341551f1cea8" FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE
);
CREATE INDEX "IDX_article_images_article_id" ON public.article_images USING btree (article_id);

-- Permissions

ALTER TABLE public.article_images OWNER TO "admin";
GRANT ALL ON TABLE public.article_images TO "admin";


-- public.article_variants definition

-- Drop table

-- DROP TABLE public.article_variants;

CREATE TABLE public.article_variants (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	article_id uuid NOT NULL,
	sku varchar(255) NOT NULL,
	barcode varchar(255) NULL,
	"cost" numeric(18, 4) DEFAULT 0 NULL,
	stock_actual numeric(18, 4) DEFAULT 0 NULL,
	stock_min numeric(18, 4) DEFAULT 0 NULL,
	company_id uuid NOT NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	observations text NULL,
	measure_id uuid NULL,
	color_id uuid NULL,
	size_id uuid NULL,
	flavor_id uuid NULL,
	CONSTRAINT article_variants_pkey PRIMARY KEY (id),
	CONSTRAINT "FK_article_variants_measure" FOREIGN KEY (measure_id) REFERENCES public.measures(id) ON DELETE SET NULL,
	CONSTRAINT "FK_cce83917f913b04373aa286a7d0" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
	CONSTRAINT "FK_f198b0aa3636c16bdd46ff090e5" FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE,
	CONSTRAINT article_variants_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id) ON DELETE SET NULL,
	CONSTRAINT article_variants_flavor_id_fkey FOREIGN KEY (flavor_id) REFERENCES public.flavors(id) ON DELETE SET NULL,
	CONSTRAINT article_variants_size_id_fkey FOREIGN KEY (size_id) REFERENCES public.sizes(id) ON DELETE SET NULL
);
CREATE INDEX "IDX_article_variants_article_company" ON public.article_variants USING btree (article_id, company_id);
CREATE INDEX "IDX_article_variants_barcode" ON public.article_variants USING btree (barcode);
CREATE INDEX "IDX_article_variants_company_active" ON public.article_variants USING btree (company_id, is_active) WHERE (is_active = true);
CREATE INDEX "IDX_article_variants_company_id" ON public.article_variants USING btree (company_id);
CREATE INDEX "IDX_article_variants_sku" ON public.article_variants USING btree (sku);
CREATE UNIQUE INDEX "UQ_article_variants_company_barcode" ON public.article_variants USING btree (company_id, barcode) WHERE (barcode IS NOT NULL);
CREATE UNIQUE INDEX "UQ_article_variants_company_sku" ON public.article_variants USING btree (company_id, sku);
CREATE INDEX idx_variants_attributes_composite ON public.article_variants USING btree (company_id, color_id, size_id, flavor_id) WHERE (is_active = true);

-- Permissions

ALTER TABLE public.article_variants OWNER TO "admin";
GRANT ALL ON TABLE public.article_variants TO "admin";


-- public.article_batches definition

-- Drop table

-- DROP TABLE public.article_batches;

CREATE TABLE public.article_batches (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	article_variant_id uuid NOT NULL,
	batch_number varchar(100) NOT NULL,
	expiration_date date NULL,
	current_stock numeric(18, 4) DEFAULT 0 NULL,
	company_id uuid NOT NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT "UQ_article_batches_variant_number" UNIQUE (article_variant_id, batch_number),
	CONSTRAINT article_batches_pkey PRIMARY KEY (id),
	CONSTRAINT "FK_09a61b81c576223a525ea776f3c" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
	CONSTRAINT "FK_99e715ec84b6a82ec6ce215f9b8" FOREIGN KEY (article_variant_id) REFERENCES public.article_variants(id) ON DELETE CASCADE
);
CREATE INDEX "IDX_article_batches_company_id" ON public.article_batches USING btree (company_id);
CREATE INDEX "IDX_article_batches_expiration" ON public.article_batches USING btree (expiration_date) WHERE (expiration_date IS NOT NULL);
CREATE INDEX idx_article_batches_variant_vencimiento ON public.article_batches USING btree (article_variant_id, expiration_date);

-- Permissions

ALTER TABLE public.article_batches OWNER TO "admin";
GRANT ALL ON TABLE public.article_batches TO "admin";


-- public.article_variant_prices definition

-- Drop table

-- DROP TABLE public.article_variant_prices;

CREATE TABLE public.article_variant_prices (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	article_variant_id uuid NOT NULL,
	price_type varchar(255) NULL,
	price numeric(18, 4) NOT NULL,
	is_default bool DEFAULT false NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	unit_id uuid NULL,
	CONSTRAINT "CHK_article_variant_prices_price_type_not_empty" CHECK (((price_type IS NOT NULL) AND (char_length(TRIM(BOTH FROM price_type)) > 0))),
	CONSTRAINT "UQ_article_variant_prices_variant_type" UNIQUE (article_variant_id, price_type),
	CONSTRAINT article_variant_prices_pkey PRIMARY KEY (id),
	CONSTRAINT "FK_article_variant_prices_unit" FOREIGN KEY (unit_id) REFERENCES public.measures(id) ON DELETE SET NULL,
	CONSTRAINT "FK_fc2277421dfee5bea10fc785380" FOREIGN KEY (article_variant_id) REFERENCES public.article_variants(id) ON DELETE CASCADE
);
CREATE INDEX "IDX_article_variant_prices_variant" ON public.article_variant_prices USING btree (article_variant_id);
CREATE INDEX "IDX_article_variant_prices_variant_default" ON public.article_variant_prices USING btree (article_variant_id, is_default) WHERE (is_default = true);

-- Permissions

ALTER TABLE public.article_variant_prices OWNER TO "admin";
GRANT ALL ON TABLE public.article_variant_prices TO "admin";