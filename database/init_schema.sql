-- 1. Habilitar extensión para generar UUIDs (IDs únicos universales)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA MAESTRA: EMPRESAS (Tenants)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    ruc_nit VARCHAR(20) NOT NULL UNIQUE, -- Identificación tributaria
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. TABLA DE USUARIOS (Con acceso al panel)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL, -- ¡CRÍTICO! Aquí ligamos al usuario a su empresa
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'seller', -- admin, seller, warehouse
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Relación: Si borras la empresa, se borran sus usuarios (Cascada)
    CONSTRAINT fk_company
        FOREIGN KEY(company_id) 
        REFERENCES companies(id)
        ON DELETE CASCADE
);

-- 4. ÍNDICES (Para que las busquedas sean rápidas)
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);

-- DATA DE PRUEBA (SEED) PARA QUE PUEDAS ENTRAR
-- Insertamos una empresa "Demo"
INSERT INTO companies (id, name, ruc_nit) 
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ACONTPLUS S.A.S', '2293530915001');

-- Insertamos un usuario "Admin" para ti (Password: 123456 - Hash simulado)
INSERT INTO users (company_id, full_name, email, password_hash, role)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
    'Super Admin', 
    'christian.zarate@acontplus.com', 
    '$2b$10$EpOu....(hash_falso_para_prueba)', 
    'admin'
);